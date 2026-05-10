"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getDog, getPeriodicCare, addDaysToDate, updateCareScheduledAt, markCareAsDone } from "@/lib/firestore";
import type { Dog, PeriodicCare } from "@/lib/types";

function getTodayJST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function getNowJSTLocal() {
  // Returns "YYYY-MM-DDTHH:mm" in JST for datetime-local min
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 16);
}

function urgencyStyle(daysUntil: number) {
  if (daysUntil < 0) return { label: `${Math.abs(daysUntil)}日超過`, color: "text-red-600", bg: "bg-red-100" };
  if (daysUntil === 0) return { label: "今日", color: "text-red-600", bg: "bg-red-100" };
  if (daysUntil === 1) return { label: "明日", color: "text-orange-500", bg: "bg-orange-100" };
  if (daysUntil <= 7) return { label: `${daysUntil}日後`, color: "text-amber-600", bg: "bg-amber-100" };
  return { label: `${daysUntil}日後`, color: "text-gray-400", bg: "bg-gray-100" };
}

function formatScheduled(s: string) {
  const [datePart, timePart] = s.split("T");
  const [year, month, day] = datePart.split("-");
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
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
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
  const { label, color, bg } = urgencyStyle(daysUntil);

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* トップバー */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 text-lg active:scale-90 transition-transform">
          ‹
        </button>
        <div className="flex items-center gap-1.5 bg-sky-100 text-sky-600 px-3 py-1.5 rounded-full">
          <span className="text-sm">🛁</span>
          <span className="text-sm font-black">ケア詳細</span>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* ケア情報 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xl font-black text-gray-800">{care.name}</p>
              {dog && <p className="text-sm text-gray-400 mt-0.5">{dog.name}</p>}
              <p className="text-xs text-gray-400 mt-1">{care.cycleDays}日ごと</p>
            </div>
            <span className={`text-sm px-3 py-1 rounded-full font-black flex-shrink-0 ${color} ${bg}`}>{label}</span>
          </div>
          <div className="mt-4 flex gap-3">
            <div className="flex-1 bg-gray-50 rounded-2xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">前回</p>
              <p className="text-sm font-black text-gray-700">{care.lastDoneDate}</p>
            </div>
            <div className="flex-1 bg-sky-50 rounded-2xl p-3 text-center">
              <p className="text-xs text-sky-400 mb-1">次回予定</p>
              <p className="text-sm font-black text-sky-700">{nextDueDate}</p>
            </div>
          </div>
        </div>

        {/* 予約（施術予定日時） */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-1.5 mb-4">
            <div className="flex items-center gap-1.5 bg-orange-100 text-orange-600 px-3 py-1 rounded-full">
              <span className="text-sm">📅</span>
              <span className="text-xs font-black">予約（施術予定日時）</span>
            </div>
          </div>

          {care.scheduledAt ? (
            <div className="space-y-3">
              {/* 予約済み表示 */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                <p className="text-xs text-amber-500 font-bold mb-1">予約済み</p>
                <p className="text-2xl font-black text-amber-700">{formatScheduled(care.scheduledAt)}</p>
                <p className="text-xs text-amber-400 mt-1">{scheduledDaysLabel(care.scheduledAt, today)}</p>
              </div>

              {/* 変更フォーム */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">日時を変更</label>
                <input
                  type="datetime-local"
                  value={scheduledInput}
                  onChange={(e) => setScheduledInput(e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-2xl px-3 py-2.5 text-sm outline-none focus:border-amber-300"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveSchedule}
                  disabled={saving || !scheduledInput || scheduledInput === care.scheduledAt}
                  className="flex-1 py-2.5 bg-amber-500 text-white font-black rounded-2xl disabled:opacity-40 active:scale-95 transition-transform text-sm"
                >
                  {saving ? "保存中..." : "変更する"}
                </button>
                <button
                  onClick={handleClearSchedule}
                  disabled={saving}
                  className="px-4 py-2.5 bg-gray-100 text-gray-500 font-bold rounded-2xl disabled:opacity-40 active:scale-95 transition-transform text-sm"
                >
                  削除
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">施術予定日時を登録しておくと管理しやすくなります。</p>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">施術予定日時</label>
                <input
                  type="datetime-local"
                  value={scheduledInput}
                  min={nowLocal}
                  onChange={(e) => setScheduledInput(e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-2xl px-3 py-2.5 text-sm outline-none focus:border-amber-300"
                />
              </div>
              <button
                onClick={handleSaveSchedule}
                disabled={saving || !scheduledInput}
                className="w-full py-3 bg-amber-500 text-white font-black rounded-2xl disabled:opacity-40 active:scale-95 transition-transform"
              >
                {saving ? "保存中..." : "📅 予約する"}
              </button>
            </div>
          )}
        </div>

        {/* 施術完了 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex items-center gap-1.5 bg-green-100 text-green-600 px-3 py-1 rounded-full">
              <span className="text-sm">✅</span>
              <span className="text-xs font-black">施術完了</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-4">完了にすると前回日が今日に更新され、次回予定日が再計算されます。</p>
          <button
            onClick={handleComplete}
            disabled={completing}
            className="w-full py-3 bg-green-500 text-white font-black rounded-2xl shadow-sm disabled:opacity-50 active:scale-95 transition-all"
          >
            {completing ? "処理中..." : "✓ 施術完了にする"}
          </button>
        </div>
      </div>
    </div>
  );
}
