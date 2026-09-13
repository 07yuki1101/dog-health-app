"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getDogs, getAllDogsPeriodicCares, markCareAsDone } from "@/lib/firestore";
import type { Dog, PeriodicCare } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";

type CareItem = {
  dog: Dog;
  care: PeriodicCare;
  nextDueDate: string;
  daysUntil: number;
};

const VISIBLE_LIMIT = 3;

function formatScheduled(s: string) {
  const [datePart, timePart] = s.split("T");
  const [, month, day] = datePart.split("-");
  return timePart ? `${parseInt(month)}/${parseInt(day)} ${timePart}` : `${parseInt(month)}/${parseInt(day)}`;
}

function urgencyStyle(daysUntil: number) {
  if (daysUntil < 0) return { text: `${Math.abs(daysUntil)}日超過`, color: "text-danger" };
  if (daysUntil === 0) return { text: "今日", color: "text-danger" };
  if (daysUntil === 1) return { text: "明日", color: "text-attention" };
  if (daysUntil <= 7) return { text: `${daysUntil}日後`, color: "text-attention" };
  return { text: `${daysUntil}日後`, color: "text-ink-faint" };
}

export function UpcomingCares() {
  const { familyId } = useAuth();
  const [items, setItems] = useState<CareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [doingId, setDoingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

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

  const visibleItems = expanded ? items : items.slice(0, VISIBLE_LIMIT);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <section className="mb-8">
      <SectionHeading icon="🛁" title="定期ケア" action={{ label: "管理する", href: "/dogs" }} />

      {loading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 bg-surface/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="text-center">
          <p className="text-ink-faint text-sm">定期ケアが登録されていません</p>
          <Link href="/dogs" className="inline-block mt-2 text-brand text-sm font-bold">
            ＋ ケアを追加する
          </Link>
        </Card>
      ) : (
        <div className="space-y-2">
          {visibleItems.map(({ dog, care, daysUntil }) => {
            const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
            const scheduledDays = care.scheduledAt
              ? Math.ceil((new Date(care.scheduledAt.split("T")[0] + "T00:00:00Z").getTime() - new Date(todayStr + "T00:00:00Z").getTime()) / 86400000)
              : null;
            const displayDays = scheduledDays !== null ? scheduledDays : daysUntil;
            const { text, color } = urgencyStyle(displayDays);
            const isDoing = doingId === care.id;
            return (
              <div key={care.id} className="flex items-center gap-3 bg-surface rounded-2xl px-4 py-3 shadow-sm shadow-black/[0.03]">
                <Link href={`/dogs/${dog.id}/cares/${care.id}`} className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70">
                  <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center text-lg overflow-hidden flex-shrink-0">
                    {dog.photoURL ? (
                      <img src={dog.photoURL} alt={dog.name} className="w-full h-full object-cover" />
                    ) : "🐕"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink text-sm truncate">{care.name}</p>
                    {care.scheduledAt ? (
                      <p className="text-xs text-attention font-bold">📅 {formatScheduled(care.scheduledAt)}</p>
                    ) : (
                      <p className="text-xs text-ink-faint">{dog.name} ・ {care.cycleDays}日ごと</p>
                    )}
                  </div>
                  <span className={`text-sm flex-shrink-0 font-bold ${color}`}>{text}</span>
                </Link>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleDone(dog, care)}
                  disabled={isDoing}
                  className="flex-shrink-0"
                >
                  {isDoing ? "..." : "完了"}
                </Button>
              </div>
            );
          })}

          {hiddenCount > 0 && (
            <button
              onClick={() => setExpanded(true)}
              className="w-full text-center text-xs text-ink-faint font-semibold py-2 active:opacity-60"
            >
              他に{hiddenCount}件を表示する ▾
            </button>
          )}
          {expanded && items.length > VISIBLE_LIMIT && (
            <button
              onClick={() => setExpanded(false)}
              className="w-full text-center text-xs text-ink-faint font-semibold py-2 active:opacity-60"
            >
              閉じる ▴
            </button>
          )}
        </div>
      )}
    </section>
  );
}
