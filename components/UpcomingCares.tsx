"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getDogs, getUpcomingPeriodicCares, markCareAsDone } from "@/lib/firestore";
import type { Dog, PeriodicCare } from "@/lib/types";

type CareItem = {
  dog: Dog;
  care: PeriodicCare;
  nextDueDate: string;
  daysUntil: number;
};

function urgencyLabel(daysUntil: number): { text: string; color: string } {
  if (daysUntil < 0) return { text: `${Math.abs(daysUntil)}日超過`, color: "text-red-500 font-bold" };
  if (daysUntil === 0) return { text: "今日", color: "text-red-500 font-bold" };
  if (daysUntil === 1) return { text: "明日", color: "text-orange-500 font-semibold" };
  return { text: `${daysUntil}日後`, color: "text-amber-500" };
}

export function UpcomingCares() {
  const { familyId } = useAuth();
  const [items, setItems] = useState<CareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [doingId, setDoingId] = useState<string | null>(null);

  async function load() {
    if (!familyId) return;
    const dogs = await getDogs(familyId);
    const upcoming = await getUpcomingPeriodicCares(familyId, dogs);
    setItems(upcoming);
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

  if (loading || items.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        そろそろ必要なケア
      </h2>
      <div className="space-y-3">
        {items.map(({ dog, care, daysUntil }) => {
          const { text, color } = urgencyLabel(daysUntil);
          const isDoing = doingId === care.id;
          return (
            <div
              key={care.id}
              className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm"
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-xl overflow-hidden flex-shrink-0">
                {dog.photoURL ? (
                  <img src={dog.photoURL} alt={dog.name} className="w-full h-full object-cover" />
                ) : "🐕"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate">{care.name}</p>
                <p className="text-xs text-gray-400">{dog.name}</p>
              </div>
              <span className={`text-sm flex-shrink-0 ${color}`}>{text}</span>
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
        <Link
          href="/dogs"
          className="block text-center text-xs text-amber-600 font-medium py-1"
        >
          ケア管理 →
        </Link>
      </div>
    </section>
  );
}
