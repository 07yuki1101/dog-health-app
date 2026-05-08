"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { addReminder } from "@/lib/firestore";
import type { ReminderType } from "@/lib/types";

const TYPES: { value: ReminderType; label: string; emoji: string; color: string }[] = [
  { value: "medication", label: "投薬",  emoji: "💊", color: "bg-pink-100 border-pink-300 text-pink-700" },
  { value: "vaccine",    label: "ワクチン", emoji: "💉", color: "bg-sky-100 border-sky-300 text-sky-700" },
  { value: "vet_visit",  label: "通院",  emoji: "🏥", color: "bg-green-100 border-green-300 text-green-700" },
];

export default function NewReminderPage() {
  const { dogId } = useParams<{ dogId: string }>();
  const { user, familyId } = useAuth();
  const router = useRouter();

  const [type, setType] = useState<ReminderType>("medication");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [recurring, setRecurring] = useState(false);
  const [intervalDays, setIntervalDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !familyId || !title || !dueDate) return;
    setSubmitting(true);
    try {
      await addReminder(familyId, dogId, {
        dogId, type, title,
        ...(note ? { note } : {}),
        dueDate, recurring,
        ...(recurring ? { intervalDays } : {}),
        isDone: false,
        createdBy: user.uid,
      });
      router.replace(`/dogs/${dogId}/reminders`);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto pb-28">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 text-lg active:scale-90 transition-transform">
          ‹
        </button>
        <div className="flex items-center gap-1.5 bg-pink-100 text-pink-600 px-3 py-1.5 rounded-full">
          <span className="text-sm">🔔</span>
          <span className="text-sm font-black">リマインドを追加</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 space-y-4">
        {/* 種類 */}
        <div className="grid grid-cols-3 gap-3">
          {TYPES.map((t) => (
            <button key={t.value} type="button" onClick={() => setType(t.value)}
              className={`flex flex-col items-center py-4 rounded-2xl border-2 font-bold text-sm transition-colors ${type === t.value ? t.color : "border-gray-100 bg-white text-gray-400"}`}>
              <span className="text-2xl mb-1">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">タイトル <span className="text-red-400">*</span></label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder={type === "medication" ? "例：フィラリア予防薬" : type === "vaccine" ? "例：混合ワクチン" : "例：定期健診"}
            required
            className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-800 placeholder-gray-300 focus:outline-none focus:border-amber-300" />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">メモ</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="任意のメモ"
            className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-800 placeholder-gray-300 focus:outline-none focus:border-amber-300" />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">予定日 <span className="text-red-400">*</span></label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required
            className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-800 focus:outline-none focus:border-amber-300" />
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-800">繰り返し</p>
              <p className="text-xs text-gray-400">定期的なリマインドを設定</p>
            </div>
            <button type="button" onClick={() => setRecurring(!recurring)}
              className={`relative w-12 h-6 rounded-full transition-colors ${recurring ? "bg-amber-500" : "bg-gray-200"}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${recurring ? "translate-x-7" : "translate-x-1"}`} />
            </button>
          </div>
          {recurring && (
            <div className="mt-4">
              <label className="text-xs font-bold text-gray-500 mb-2 block">繰り返し間隔</label>
              <div className="flex gap-2 flex-wrap">
                {[7, 14, 30, 90, 365].map((d) => (
                  <button key={d} type="button" onClick={() => setIntervalDays(d)}
                    className={`px-3 py-1.5 rounded-full text-sm font-bold border-2 transition-colors ${intervalDays === d ? "border-amber-400 bg-amber-50 text-amber-700" : "border-gray-100 text-gray-400 bg-white"}`}>
                    {d === 365 ? "1年" : d === 90 ? "3ヶ月" : d === 30 ? "1ヶ月" : `${d}日`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button type="submit" disabled={submitting || !title || !dueDate}
          className="w-full bg-amber-500 text-white font-black py-4 rounded-2xl shadow-sm disabled:opacity-50 active:scale-98 transition-all">
          {submitting ? "保存中..." : "保存する"}
        </button>
      </form>
    </div>
  );
}
