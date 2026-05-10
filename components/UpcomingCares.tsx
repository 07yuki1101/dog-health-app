"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getDogs, getAllDogsPeriodicCares, markCareAsDone } from "@/lib/firestore";
import type { Dog, PeriodicCare } from "@/lib/types";

type CareItem = {
  dog: Dog;
  care: PeriodicCare;
  nextDueDate: string;
  daysUntil: number;
};

function formatScheduled(s: string) {
  const [datePart, timePart] = s.split("T");
  const [, month, day] = datePart.split("-");
  return timePart ? `${parseInt(month)}/${parseInt(day)} ${timePart}` : `${parseInt(month)}/${parseInt(day)}`;
}

function urgencyStyle(daysUntil: number) {
  if (daysUntil < 0) return { text: `${Math.abs(daysUntil)}日超過`, color: "text-red-500 font-bold" };
  if (daysUntil === 0) return { text: "今日", color: "text-red-500 font-bold" };
  if (daysUntil === 1) return { text: "明日", color: "text-orange-500 font-semibold" };
  if (daysUntil <= 7) return { text: `${daysUntil}日後`, color: "text-amber-500 font-semibold" };
  return { text: `${daysUntil}日後`, color: "text-gray-400" };
}

export function UpcomingCares() {
  const { familyId } = useAuth();
  const [items, setItems] = useState<CareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [doingId, setDoingId] = useState<string | null>(null);

  async function load() {
    if (!familyId) return;
    const dogs = await getDogs(familyId);
    const all = await getAllDogsPeriodicCares(familyId, dogs);
    setItems(all);
    setLoading(false);
  }

  useEffect(() => { load(); }, [familyId]);

  async function handleDone(dog: Dog, care: PeriodicCare) {
    if (!familyId) return;
    setDoingId(care.id);
    await markCareAsDone(familyId, dog.id, care.id);
    setDoingId(null);
    load();
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 bg-sky-100 text-sky-600 px-3 py-1.5 rounded-full">
          <span className="text-sm">🛁</span>
          <span className="text-xs font-black">定期ケア</span>
        </div>
        <Link href="/dogs" className="text-xs text-gray-400 font-semibold">管理する →</Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
          <p className="text-gray-400 text-sm">定期ケアが登録されていません</p>
          <Link href="/dogs" className="inline-block mt-2 text-amber-600 text-sm font-medium">
            + ケアを追加する
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(({ dog, care, daysUntil }) => {
            const { text, color } = urgencyStyle(daysUntil);
            const isDoing = doingId === care.id;
            return (
              <div key={care.id} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm">
                <Link href={`/dogs/${dog.id}/cares/${care.id}`} className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-lg overflow-hidden flex-shrink-0">
                    {dog.photoURL ? (
                      <img src={dog.photoURL} alt={dog.name} className="w-full h-full object-cover" />
                    ) : "🐕"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{care.name}</p>
                    {care.scheduledAt ? (
                      <p className="text-xs text-orange-500 font-bold">📅 {formatScheduled(care.scheduledAt)}</p>
                    ) : (
                      <p className="text-xs text-gray-400">{dog.name} · {care.cycleDays}日ごと</p>
                    )}
                  </div>
                  <span className={`text-sm flex-shrink-0 ${color}`}>{text}</span>
                </Link>
                <button
                  onClick={() => handleDone(dog, care)}
                  disabled={isDoing}
                  className="flex-shrink-0 px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg active:scale-95 transition-transform disabled:opacity-50"
                >
                  {isDoing ? "..." : "完了"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
