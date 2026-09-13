"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getDogs, getUpcomingReminders } from "@/lib/firestore";
import { HealthCheckSheet } from "@/components/HealthCheckSheet";
import { UpcomingCares } from "@/components/UpcomingCares";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Chip";
import type { Dog, Reminder } from "@/lib/types";

export default function DashboardPage() {
  const { user, familyId } = useAuth();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [reminders, setReminders] = useState<{ dog: Dog; reminder: Reminder }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) return;
    (async () => {
      const dogList = await getDogs(familyId);
      setDogs(dogList);
      const all: { dog: Dog; reminder: Reminder }[] = [];
      for (const dog of dogList) {
        const rs = await getUpcomingReminders(familyId, dog.id);
        rs.slice(0, 3).forEach((r) => all.push({ dog, reminder: r }));
      }
      all.sort((a, b) => a.reminder.dueDate.localeCompare(b.reminder.dueDate));
      setReminders(all.slice(0, 5));
      setLoading(false);
    })();
  }, [familyId]);

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

  function dueDateLabel(dueDate: string): { label: string; tone: "danger" | "attention" | "neutral" } {
    if (dueDate === today) return { label: "今日", tone: "danger" };
    const diff = Math.ceil((new Date(dueDate).getTime() - new Date(today).getTime()) / 86400000);
    if (diff <= 3) return { label: `${diff}日後`, tone: "attention" };
    return { label: `${diff}日後`, tone: "neutral" };
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto pb-28">

        {/* ── トップバー ── */}
        <div className="flex items-center justify-between px-5 pt-6 pb-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐾</span>
            <span className="text-lg font-black text-ink tracking-tight">わんこ健康手帳</span>
          </div>
          <Link href="/settings"
            className="w-9 h-9 rounded-full bg-surface shadow-sm flex items-center justify-center text-base active:scale-90 transition-transform"
            aria-label="設定"
          >
            ⚙️
          </Link>
        </div>

        <div className="px-5">

          {/* ── わんこ ── */}
          <section className="mb-8">
            <SectionHeading icon="🐕" title="わんこ" action={{ label: "すべて見る", href: "/dogs" }} />

            {loading ? (
              <div className="h-28 bg-surface/60 rounded-3xl animate-pulse" />
            ) : dogs.length === 0 ? (
              <Link
                href="/dogs/new"
                className="flex flex-col items-center justify-center bg-surface rounded-3xl p-8 shadow-sm border-2 border-dashed border-brand-start/40 active:scale-[0.98] transition-transform"
              >
                <span className="text-4xl mb-2">🐕</span>
                <p className="text-brand font-bold text-sm">愛犬を登録する</p>
              </Link>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                {dogs.map((dog) => (
                  <Link
                    key={dog.id}
                    href={`/dogs/${dog.id}`}
                    className="flex-shrink-0 flex flex-col items-center gap-2 bg-surface rounded-3xl shadow-sm w-[84px] py-4 active:scale-95 transition-transform"
                  >
                    <div className="w-12 h-12 rounded-full ring-2 ring-brand-soft overflow-hidden bg-brand-soft flex items-center justify-center text-xl">
                      {dog.photoURL
                        ? <img src={dog.photoURL} alt={dog.name} className="w-full h-full object-cover" />
                        : "🐕"}
                    </div>
                    <p className="text-center text-xs font-bold text-ink px-2 truncate w-full">{dog.name}</p>
                  </Link>
                ))}
                <Link
                  href="/dogs/new"
                  className="flex-shrink-0 flex flex-col items-center justify-center bg-surface rounded-3xl w-[84px] shadow-sm border-2 border-dashed border-cream py-4"
                >
                  <span className="text-2xl text-ink-faint">＋</span>
                  <span className="text-xs text-ink-faint mt-1">追加</span>
                </Link>
              </div>
            )}
          </section>

          {/* ── 今日の体調チェック ── */}
          <HealthCheckSheet />

          {/* ── 定期ケア ── */}
          <UpcomingCares />

          {/* ── 直近のリマインド ── */}
          <section className="mb-8">
            <SectionHeading
              icon="🔔"
              title="直近のリマインド"
              action={dogs.length > 0 ? { label: "管理する", href: `/dogs/${dogs[0].id}/reminders` } : undefined}
            />

            {loading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-14 bg-surface/60 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : reminders.length === 0 ? (
              <Card className="text-center">
                <p className="text-ink-faint text-sm">リマインドはありません</p>
                {dogs.length > 0 && (
                  <Link href={`/dogs/${dogs[0].id}/reminders/new`} className="inline-block mt-2 text-brand text-sm font-bold">
                    ＋ リマインドを追加する
                  </Link>
                )}
              </Card>
            ) : (
              <div className="space-y-2">
                {reminders.map(({ dog, reminder }) => {
                  const { label, tone } = dueDateLabel(reminder.dueDate);
                  const typeIcon = reminder.type === "medication" ? "💊" : reminder.type === "vaccine" ? "💉" : "🏥";
                  return (
                    <Link
                      key={reminder.id}
                      href={`/dogs/${dog.id}/reminders`}
                      className="flex items-center gap-3 bg-surface rounded-2xl px-4 py-3 shadow-sm shadow-black/[0.03] active:scale-[0.98] transition-transform"
                    >
                      <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                        {dog.photoURL
                          ? <img src={dog.photoURL} alt={dog.name} className="w-full h-full object-cover" />
                          : <span>{typeIcon}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-ink text-sm truncate">{reminder.title}</p>
                        <p className="text-xs text-ink-faint">{dog.name}</p>
                      </div>
                      <Tag label={label} tone={tone} />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
