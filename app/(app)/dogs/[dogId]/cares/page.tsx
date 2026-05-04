"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  getDog,
  getPeriodicCares,
  addPeriodicCare,
  deletePeriodicCare,
  markCareAsDone,
  addDaysToDate,
} from "@/lib/firestore";
import type { Dog, PeriodicCare } from "@/lib/types";

const PRESETS = [
  { name: "✂️ トリミング", cycleDays: 30, notifyDaysBefore: 7 },
  { name: "💅 爪切り", cycleDays: 14, notifyDaysBefore: 3 },
  { name: "🛁 シャンプー", cycleDays: 21, notifyDaysBefore: 3 },
  { name: "💊 フィラリア予防薬", cycleDays: 30, notifyDaysBefore: 5 },
  { name: "💉 ワクチン", cycleDays: 365, notifyDaysBefore: 30 },
  { name: "🦷 歯磨き", cycleDays: 3, notifyDaysBefore: 1 },
  { name: "👂 耳掃除", cycleDays: 14, notifyDaysBefore: 3 },
];

function getTodayJST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function urgencyStyle(daysUntil: number) {
  if (daysUntil < 0) return { label: `${Math.abs(daysUntil)}日超過`, color: "text-red-500 font-bold", bg: "bg-red-50" };
  if (daysUntil === 0) return { label: "今日", color: "text-red-500 font-bold", bg: "bg-red-50" };
  if (daysUntil === 1) return { label: "明日", color: "text-orange-500 font-semibold", bg: "bg-orange-50" };
  if (daysUntil <= 7) return { label: `${daysUntil}日後`, color: "text-amber-500 font-semibold", bg: "bg-amber-50" };
  return { label: `${daysUntil}日後`, color: "text-gray-400", bg: "" };
}

const emptyForm = () => ({
  name: "",
  cycleDays: 30,
  lastDoneDate: getTodayJST(),
  notifyDaysBefore: 7,
});

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
    setDog(d);
    setCares(cs);
    setLoading(false);
  }

  useEffect(() => { load(); }, [familyId, dogId]);

  function applyPreset(preset: typeof PRESETS[0]) {
    setForm((f) => ({ ...f, name: preset.name, cycleDays: preset.cycleDays, notifyDaysBefore: preset.notifyDaysBefore }));
  }

  async function handleSave() {
    if (!familyId || !form.name.trim()) return;
    setSaving(true);
    await addPeriodicCare(familyId, dogId, {
      name: form.name.trim(),
      cycleDays: form.cycleDays,
      lastDoneDate: form.lastDoneDate,
      notifyDaysBefore: form.notifyDaysBefore,
    });
    setForm(emptyForm());
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function handleDone(careId: string) {
    if (!familyId) return;
    setDoingId(careId);
    await markCareAsDone(familyId, dogId, careId);
    setDoingId(null);
    load();
  }

  async function handleDelete(careId: string) {
    if (!familyId) return;
    if (!confirm("このケアを削除しますか？")) return;
    await deletePeriodicCare(familyId, dogId, careId);
    load();
  }

  const today = getTodayJST();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-pulse">🐾</div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-28">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">定期ケア</h1>
          {dog && <p className="text-sm text-gray-400">{dog.name}</p>}
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setForm(emptyForm()); }}
          className="flex items-center gap-1 bg-amber-500 text-white text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition-transform"
        >
          {showForm ? "キャンセル" : "+ 追加"}
        </button>
      </div>

      {/* 追加フォーム */}
      {showForm && (
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
          {/* プリセット */}
          <p className="text-xs font-semibold text-gray-500 mb-2">よく使うケア</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => applyPreset(p)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  form.name === p.name
                    ? "bg-amber-500 text-white border-amber-500"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">ケア内容名</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="例：トリミング"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">周期（日数）</label>
                <input
                  type="number"
                  min={1}
                  value={form.cycleDays}
                  onChange={(e) => setForm((f) => ({ ...f, cycleDays: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">N日前に通知</label>
                <input
                  type="number"
                  min={0}
                  value={form.notifyDaysBefore}
                  onChange={(e) => setForm((f) => ({ ...f, notifyDaysBefore: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">最終実施日</label>
              <input
                type="date"
                value={form.lastDoneDate}
                max={today}
                onChange={(e) => setForm((f) => ({ ...f, lastDoneDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
            className="w-full mt-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors active:scale-95"
          >
            {saving ? "保存中..." : "保存する"}
          </button>
        </div>
      )}

      {/* ケア一覧 */}
      {cares.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
          <p className="text-3xl mb-3">🛁</p>
          <p className="text-gray-500 text-sm font-medium mb-1">定期ケアが未登録です</p>
          <p className="text-gray-400 text-xs">「+ 追加」からトリミングや薬を登録しましょう</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cares.map((care) => {
            const nextDueDate = addDaysToDate(care.lastDoneDate, care.cycleDays);
            const daysUntil = Math.ceil(
              (new Date(nextDueDate + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000
            );
            const { label, color, bg } = urgencyStyle(daysUntil);
            const isDoing = doingId === care.id;

            return (
              <div key={care.id} className={`bg-white rounded-2xl p-4 shadow-sm ${bg ? bg + "/30" : ""}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">{care.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{care.cycleDays}日ごと</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm ${color}`}>{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">次回 {nextDueDate}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>前回 {care.lastDoneDate}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDone(care.id)}
                      disabled={isDoing}
                      className="px-3 py-1.5 bg-green-500 text-white font-medium rounded-lg active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {isDoing ? "..." : "✓ 完了"}
                    </button>
                    <button
                      onClick={() => handleDelete(care.id)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-500 font-medium rounded-lg active:scale-95 transition-transform"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
