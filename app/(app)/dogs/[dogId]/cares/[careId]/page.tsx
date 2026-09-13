"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getDog, getPeriodicCare, addDaysToDate, updateCareScheduledAt, markCareAsDone } from "@/lib/firestore";
import type { Dog, PeriodicCare } from "@/lib/types";
import { BackButton } from "@/components/ui/BackButton";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Tag } from "@/components/ui/Chip";

function getTodayJST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function getNowJSTLocal() {
  // Returns "YYYY-MM-DDTHH:mm" in JST for datetime-local min
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 16);
}

function urgencyTone(daysUntil: number): { label: string; tone: "attention" | "danger" | "success" | "neutral" } {
  if (daysUntil < 0) return { label: `${Math.abs(daysUntil)}日超過`, tone: "danger" };
  if (daysUntil === 0) return { label: "今日", tone: "danger" };
  if (daysUntil === 1) return { label: "明日", tone: "attention" };
  if (daysUntil <= 7) return { label: `${daysUntil}日後`, tone: "attention" };
  return { label: `${daysUntil}日後`, tone: "neutral" };
}

function formatScheduled(s: string) {
  const [datePart, timePart] = s.split("T");
  const [, month, day] = datePart.split("-");
  const base = `${parseInt(month)}月${parseInt(day)}日`;
  return timePart ? `${base} ${timePart}` : base;
}

function scheduledDaysLabel(scheduledAt: string, today: string) {
  const datePart = scheduledAt.split("T")[0];
  const diff = Math.ceil(
    (new Date(datePart + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000
  );
  if (diff < 0) return `${Math.abs(diff)}日超過`;
  if (diff === 0) return "今日";
  if (diff === 1) return "明日";
  return `${diff}日後`;
}

const INPUT_CLASSES =
  "w-full bg-cream border-2 border-transparent rounded-2xl px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-start/50 transition-colors";

export default function CareDetailPage() {
  const { dogId, careId } = useParams<{ dogId: string; careId: string }>();
  const { familyId } = useAuth();
  const router = useRouter();

  const [dog, setDog] = useState<Dog | null>(null);
  const [care, setCare] = useState<PeriodicCare | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduledInput, setScheduledInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  async function load() {
    if (!familyId) return;
    const [d, c] = await Promise.all([getDog(familyId, dogId), getPeriodicCare(familyId, dogId, careId)]);
    if (!c) { router.replace(`/dogs/${dogId}/cares`); return; }
    setDog(d);
    setCare(c);
    setScheduledInput(c.scheduledAt ?? "");
    setLoading(false);
  }

  useEffect(() => { load(); }, [familyId, dogId, careId]);

  async function handleSaveSchedule() {
    if (!familyId || !scheduledInput) return;
    setSaving(true);
    await updateCareScheduledAt(familyId, dogId, careId, scheduledInput);
    router.replace("/dashboard");
  }

  async function handleClearSchedule() {
    if (!familyId) return;
    setSaving(true);
    await updateCareScheduledAt(familyId, dogId, careId, null);
    setScheduledInput("");
    setSaving(false);
    load();
  }

  async function handleComplete() {
    if (!familyId || !confirm("施術完了にしますか？\n前回日が今日に更新され、予約は削除されます。")) return;
    setCompleting(true);
    await markCareAsDone(familyId, dogId, careId);
    router.replace(`/dogs/${dogId}/cares`);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-5xl animate-pulse">🐾</div>
    </div>
  );
  if (!care) return null;

  const today = getTodayJST();
  const nowLocal = getNowJSTLocal();
  const nextDueDate = addDaysToDate(care.lastDoneDate, care.cycleDays);
  const daysUntil = Math.ceil(
    (new Date(nextDueDate + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000
  );
  const { label, tone } = urgencyTone(daysUntil);

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto pb-28">

        {/* ── トップバー ── */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <BackButton onClick={() => router.back()} />
          <span className="text-lg font-black text-ink tracking-tight">ケア詳細</span>
        </div>

        <div className="px-5 space-y-4">
          {/* ケア情報 */}
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-black text-ink">{care.name}</p>
                {dog && <p className="text-sm text-ink-faint mt-0.5">{dog.name}</p>}
                <p className="text-xs text-ink-faint mt-1">{care.cycleDays}日ごと</p>
              </div>
              <Tag label={label} tone={tone} />
            </div>
            <div className="mt-4 flex gap-3">
              <div className="flex-1 bg-cream rounded-2xl p-3 text-center">
                <p className="text-xs text-ink-faint mb-1">前回</p>
                <p className="text-sm font-black text-ink-soft">{care.lastDoneDate}</p>
              </div>
              <div className="flex-1 bg-brand-soft rounded-2xl p-3 text-center">
                <p className="text-xs text-brand mb-1">次回予定</p>
                <p className="text-sm font-black text-brand">{nextDueDate}</p>
              </div>
            </div>
          </Card>

          {/* 予約（施術予定日時） */}
          <Card>
            <SectionHeading icon="📅" title="予約（施術予定日時）" />

            {care.scheduledAt ? (
              <div className="space-y-3">
                {/* 予約済み表示 */}
                <div className="bg-brand-soft border-2 border-brand-start/30 rounded-2xl p-4">
                  <p className="text-xs text-brand font-bold mb-1">予約済み</p>
                  <p className="text-2xl font-black text-brand">{formatScheduled(care.scheduledAt)}</p>
                  <p className="text-xs text-brand mt-1 opacity-80">{scheduledDaysLabel(care.scheduledAt, today)}</p>
                </div>

                {/* 変更フォーム */}
                <div>
                  <label className="text-xs font-bold text-ink-soft mb-1 block">日時を変更</label>
                  <input
                    type="datetime-local"
                    value={scheduledInput}
                    onChange={(e) => setScheduledInput(e.target.value)}
                    className={INPUT_CLASSES}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSchedule}
                    disabled={saving || !scheduledInput || scheduledInput === care.scheduledAt}
                    className="flex-1 py-2.5 bg-gradient-to-br from-brand-start to-brand-end text-white font-black rounded-2xl disabled:opacity-40 active:scale-95 transition-transform text-sm"
                  >
                    {saving ? "保存中..." : "変更する"}
                  </button>
                  <button
                    onClick={handleClearSchedule}
                    disabled={saving}
                    className="px-4 py-2.5 bg-cream text-ink-soft font-bold rounded-2xl disabled:opacity-40 active:scale-95 transition-transform text-sm"
                  >
                    削除
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-ink-faint">施術予定日時を登録しておくと管理しやすくなります。</p>
                <div>
                  <label className="text-xs font-bold text-ink-soft mb-1 block">施術予定日時</label>
                  <input
                    type="datetime-local"
                    value={scheduledInput}
                    min={nowLocal}
                    onChange={(e) => setScheduledInput(e.target.value)}
                    className={INPUT_CLASSES}
                  />
                </div>
                <button
                  onClick={handleSaveSchedule}
                  disabled={saving || !scheduledInput}
                  className="w-full py-3 bg-gradient-to-br from-brand-start to-brand-end text-white font-black rounded-2xl shadow-md shadow-amber-200 disabled:opacity-40 active:scale-95 transition-transform"
                >
                  {saving ? "保存中..." : "📅 予約する"}
                </button>
              </div>
            )}
          </Card>

          {/* 施術完了 */}
          <Card>
            <SectionHeading icon="✅" title="施術完了" />
            <p className="text-xs text-ink-faint mb-4">完了にすると前回日が今日に更新され、次回予定日が再計算されます。</p>
            <button
              onClick={handleComplete}
              disabled={completing}
              className="w-full py-3 bg-success text-white font-black rounded-2xl shadow-sm disabled:opacity-50 active:scale-95 transition-all"
            >
              {completing ? "処理中..." : "✓ 施術完了にする"}
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
