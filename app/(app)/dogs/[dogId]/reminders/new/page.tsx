"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { addReminder } from "@/lib/firestore";
import type { ReminderType } from "@/lib/types";

const TYPES: { value: ReminderType; label: string; emoji: string }[] = [
  { value: "medication", label: "投薬", emoji: "💊" },
  { value: "vaccine", label: "ワクチン", emoji: "💉" },
  { value: "vet_visit", label: "通院", emoji: "🏥" },
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
      await addReminder(familyId!, dogId, {
        dogId,
        type,
        title,
        ...(note ? { note } : {}),
        dueDate,
        recurring,
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
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 text-xl">
          ‹
        </button>
        <h1 className="text-xl font-bold text-gray-800">リマインドを追加</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">種類</label>
          <div className="grid grid-cols-3 gap-3">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex flex-col items-center py-4 rounded-2xl border-2 font-medium text-sm transition-colors ${
                  type === t.value
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-gray-200 bg-white text-gray-500"
                }`}
              >
                <span className="text-2xl mb-1">{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === "medication"
                ? "例：フィラリア予防薬"
                : type === "vaccine"
                ? "例：混合ワクチン"
                : "例：定期健診"
            }
            required
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="任意のメモ"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Due date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            予定日 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Recurring */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">繰り返し</p>
              <p className="text-xs text-gray-400">定期的なリマインドを設定</p>
            </div>
            <button
              type="button"
              onClick={() => setRecurring(!recurring)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                recurring ? "bg-amber-500" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                  recurring ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          {recurring && (
            <div className="mt-4">
              <label className="text-sm text-gray-600 mb-2 block">繰り返し間隔（日数）</label>
              <div className="flex gap-2">
                {[7, 14, 30, 90, 365].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setIntervalDays(d)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                      intervalDays === d
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-gray-200 text-gray-500"
                    }`}
                  >
                    {d === 365 ? "1年" : d === 90 ? "3ヶ月" : d === 30 ? "1ヶ月" : `${d}日`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || !title || !dueDate}
          className="w-full bg-amber-500 text-white font-bold py-4 rounded-2xl shadow-sm disabled:opacity-50 active:scale-98 transition-all"
        >
          {submitting ? "保存中..." : "保存する"}
        </button>
      </form>
    </div>
  );
}
