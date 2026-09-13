"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getDog, getPeriodicCares, addPeriodicCare, deletePeriodicCare, markCareAsDone, addDaysToDate } from "@/lib/firestore";
import type { Dog, PeriodicCare } from "@/lib/types";
import { BackButton } from "@/components/ui/BackButton";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Chip";

const PRESETS = [
  { name: "✂️ トリミング",       cycleDays: 30,  notifyDaysBefore: 7 },
  { name: "💅 爪切り",           cycleDays: 14,  notifyDaysBefore: 3 },
  { name: "🛁 シャンプー",        cycleDays: 21,  notifyDaysBefore: 3 },
  { name: "💊 フィラリア予防薬",   cycleDays: 30,  notifyDaysBefore: 5 },
  { name: "💉 ワクチン",          cycleDays: 365, notifyDaysBefore: 30 },
  { name: "🦷 歯磨き",           cycleDays: 3,   notifyDaysBefore: 1 },
  { name: "👂 耳掃除",           cycleDays: 14,  notifyDaysBefore: 3 },
];

function getTodayJST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function formatScheduled(s: string) {
  const [datePart, timePart] = s.split("T");
  const [, month, day] = datePart.split("-");
  return timePart ? `${parseInt(month)}/${parseInt(day)} ${timePart}` : `${parseInt(month)}/${parseInt(day)}`;
}

function urgencyTone(daysUntil: number): { label: string; tone: "attention" | "danger" | "success" | "neutral" } {
  if (daysUntil < 0) return { label: `${Math.abs(daysUntil)}日超過`, tone: "danger" };
  if (daysUntil === 0) return { label: "今日", tone: "danger" };
  if (daysUntil === 1) return { label: "明日", tone: "attention" };
  if (daysUntil <= 7) return { label: `${daysUntil}日後`, tone: "attention" };
  return { label: `${daysUntil}日後`, tone: "neutral" };
}

const emptyForm = () => ({ name: "", cycleDays: 30, lastDoneDate: getTodayJST(), notifyDaysBefore: 7 });

export default function CaresPage() {
  const { dogId } = useParams<{ dogId: string }>();
  const { familyId } = useAuth();
  const [dog, setDog] = useState<Dog | null>(null);
  const [cares, setCares] = useState<PeriodicCare[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [doingId, setDoingId] = useState<string | null>(null);

  async function load() {
    if (!familyId) return;
    const [d, cs] = await Promise.all([getDog(familyId, dogId), getPeriodicCares(familyId, dogId)]);
    setDog(d); setCares(cs); setLoading(false);
  }

  useEffect(() => { load(); }, [familyId, dogId]);

  async function handleSave() {
    if (!familyId || !form.name.trim()) return;
    setSaving(true);
    await addPeriodicCare(familyId, dogId, { name: form.name.trim(), cycleDays: form.cycleDays, lastDoneDate: form.lastDoneDate, notifyDaysBefore: form.notifyDaysBefore });
    setForm(emptyForm()); setShowForm(false); setSaving(false);
    load();
  }

  async function handleDone(careId: string) {
    if (!familyId) return;
    setDoingId(careId);
    await markCareAsDone(familyId, dogId, careId);
    setDoingId(null); load();
  }

  async function handleDelete(careId: string) {
    if (!familyId || !confirm("このケアを削除しますか？")) return;
    await deletePeriodicCare(familyId, dogId, careId);
    load();
  }

  const today = getTodayJST();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-cream"><div className="text-5xl animate-pulse">🐾</div></div>;

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto pb-28">

        {/* ── トップバー ── */}
        <div className="flex items-center justify-between px-5 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <BackButton href={`/dogs/${dogId}`} />
            <div>
              <span className="text-lg font-black text-ink tracking-tight">定期ケア</span>
              {dog && <p className="text-xs text-ink-faint">{dog.name}</p>}
            </div>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setForm(emptyForm()); }}
            className={`text-sm font-bold px-4 py-2 rounded-full shadow-sm active:scale-95 transition-transform ${showForm ? "bg-cream text-ink-soft" : "bg-gradient-to-br from-brand-start to-brand-end text-white shadow-md shadow-amber-200"}`}>
            {showForm ? "キャンセル" : "＋ 追加"}
          </button>
        </div>

        <div className="px-5">
          {showForm && (
            <Card className="mb-5">
              <p className="text-xs font-bold text-ink-faint mb-2">よく使うケア</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {PRESETS.map((p) => (
                  <button key={p.name} onClick={() => setForm((f) => ({ ...f, name: p.name, cycleDays: p.cycleDays, notifyDaysBefore: p.notifyDaysBefore }))}
                    className={`text-xs px-3 py-1.5 rounded-full border-2 font-bold transition-colors ${form.name === p.name ? "bg-brand text-white border-brand" : "border-transparent text-ink-soft bg-cream"}`}>
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-ink-soft mb-1 block">ケア内容名</label>
                  <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="例：トリミング"
                    className="w-full bg-cream border-2 border-transparent rounded-2xl px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-start/50 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-ink-soft mb-1 block">周期（日数）</label>
                    <input type="number" min={1} value={form.cycleDays} onChange={(e) => setForm((f) => ({ ...f, cycleDays: Number(e.target.value) }))}
                      className="w-full bg-cream border-2 border-transparent rounded-2xl px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-start/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-ink-soft mb-1 block">N日前に通知</label>
                    <input type="number" min={0} value={form.notifyDaysBefore} onChange={(e) => setForm((f) => ({ ...f, notifyDaysBefore: Number(e.target.value) }))}
                      className="w-full bg-cream border-2 border-transparent rounded-2xl px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-start/50 transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-ink-soft mb-1 block">最終実施日</label>
                  <input type="date" value={form.lastDoneDate} max={today} onChange={(e) => setForm((f) => ({ ...f, lastDoneDate: e.target.value }))}
                    className="w-full bg-cream border-2 border-transparent rounded-2xl px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-start/50 transition-colors" />
                </div>
              </div>
              <button onClick={handleSave} disabled={!form.name.trim() || saving}
                className="w-full mt-4 py-3 bg-gradient-to-br from-brand-start to-brand-end text-white font-black rounded-2xl shadow-md shadow-amber-200 disabled:opacity-40 active:scale-95 transition-transform">
                {saving ? "保存中..." : "保存する"}
              </button>
            </Card>
          )}

          {cares.length === 0 ? (
            <Card className="text-center py-10">
              <p className="text-4xl mb-3">🛁</p>
              <p className="text-ink text-sm font-bold mb-1">定期ケアが未登録です</p>
              <p className="text-ink-faint text-xs">「＋ 追加」からトリミングや薬を登録しましょう</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {cares.map((care) => {
                const nextDueDate = addDaysToDate(care.lastDoneDate, care.cycleDays);
                const cycleDaysUntil = Math.ceil((new Date(nextDueDate + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000);
                const scheduledDaysUntil = care.scheduledAt
                  ? Math.ceil((new Date(care.scheduledAt.split("T")[0] + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000)
                  : null;
                const displayDays = scheduledDaysUntil !== null ? scheduledDaysUntil : cycleDaysUntil;
                const { label, tone } = urgencyTone(displayDays);
                const isDoing = doingId === care.id;
                return (
                  <Card key={care.id} padding="sm">
                    <Link href={`/dogs/${dogId}/cares/${care.id}`} className="block mb-3 active:opacity-70">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-black text-ink">{care.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {care.scheduledAt ? (
                              <span className="text-xs text-attention font-bold">📅 {formatScheduled(care.scheduledAt)}</span>
                            ) : (
                              <p className="text-xs text-ink-faint">{care.cycleDays}日ごと · 次回 {nextDueDate}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <Tag label={label} tone={tone} />
                          {care.scheduledAt && <p className="text-xs text-ink-faint mt-1">周期 {nextDueDate}</p>}
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center justify-between text-xs text-ink-faint">
                      <span>前回 {care.lastDoneDate}</span>
                      <div className="flex gap-2">
                        <button onClick={() => handleDone(care.id)} disabled={isDoing}
                          className="px-3 py-1.5 bg-success text-white font-bold rounded-full active:scale-95 transition-transform disabled:opacity-50">
                          {isDoing ? "..." : "✓ 完了"}
                        </button>
                        <button onClick={() => handleDelete(care.id)}
                          className="px-3 py-1.5 bg-cream text-ink-soft font-bold rounded-full active:scale-95 transition-transform">
                          削除
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
