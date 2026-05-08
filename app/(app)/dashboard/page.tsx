"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getDogs, getUpcomingReminders } from "@/lib/firestore";
import { HealthCheckSheet } from "@/components/HealthCheckSheet";
import { UpcomingCares } from "@/components/UpcomingCares";
import type { Dog, Reminder } from "@/lib/types";

const DOG_COLORS = [
  "from-amber-300 to-orange-400",
  "from-pink-300 to-rose-400",
  "from-violet-300 to-purple-400",
  "from-teal-300 to-emerald-400",
  "from-sky-300 to-blue-400",
];

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

  function dueDateLabel(dueDate: string) {
    if (dueDate === today) return { label: "今日", color: "text-red-500 font-bold" };
    const diff = Math.ceil((new Date(dueDate).getTime() - new Date(today).getTime()) / 86400000);
    if (diff <= 3) return { label: `${diff}日後`, color: "text-amber-500 font-semibold" };
    return { label: `${diff}日後`, color: "text-gray-400" };
  }

  return (
    <div className="max-w-lg mx-auto pb-28">

      {/* ── トップバー ── */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐾</span>
          <span className="text-lg font-black text-gray-800 tracking-tight">わんこ健康手帳</span>
        </div>
        <Link href="/settings"
          className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-base active:scale-90 transition-transform"
          aria-label="設定"
        >
          ⚙️
        </Link>
      </div>

      <div className="px-4">

        {/* ── わんこ ── */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 bg-orange-100 text-orange-600 px-3 py-1.5 rounded-full">
              <span className="text-sm">🐕</span>
              <span className="text-xs font-black">わんこ</span>
            </div>
            <Link href="/dogs" className="text-xs text-gray-400 font-semibold">すべて見る →</Link>
          </div>

          {loading ? (
            <div className="h-32 bg-white rounded-3xl animate-pulse shadow-sm" />
          ) : dogs.length === 0 ? (
            <Link
              href="/dogs/new"
              className="flex flex-col items-center justify-center bg-white rounded-3xl p-8 shadow-sm border-2 border-dashed border-amber-200 active:scale-98 transition-transform"
            >
              <span className="text-4xl mb-2">🐕</span>
              <p className="text-amber-500 font-bold text-sm">愛犬を登録する</p>
            </Link>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {dogs.map((dog, i) => (
                <Link
                  key={dog.id}
                  href={`/dogs/${dog.id}`}
                  className="flex-shrink-0 bg-white rounded-3xl shadow-sm overflow-hidden w-[88px] active:scale-95 transition-transform"
                >
                  <div className={`bg-gradient-to-br ${DOG_COLORS[i % DOG_COLORS.length]} h-9`} />
                  <div className="-mt-5 flex justify-center">
                    <div className="w-11 h-11 rounded-full ring-[3px] ring-white overflow-hidden bg-amber-100 flex items-center justify-center text-xl shadow-sm">
                      {dog.photoURL
                        ? <img src={dog.photoURL} alt={dog.name} className="w-full h-full object-cover" />
                        : "🐕"}
                    </div>
                  </div>
                  <p className="text-center text-xs font-bold text-gray-700 px-2 pt-1 pb-3 truncate">{dog.name}</p>
                </Link>
              ))}
              <Link
                href="/dogs/new"
                className="flex-shrink-0 flex flex-col items-center justify-center bg-white rounded-3xl w-[88px] shadow-sm border-2 border-dashed border-gray-200 py-4"
              >
                <span className="text-2xl text-gray-300">＋</span>
                <span className="text-xs text-gray-400 mt-1">追加</span>
              </Link>
            </div>
          )}
        </section>

        {/* ── 今日の体調チェック ── */}
        <HealthCheckSheet />

        {/* ── 定期ケア ── */}
        <UpcomingCares />

        {/* ── 直近のリマインド ── */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 bg-pink-100 text-pink-600 px-3 py-1.5 rounded-full">
              <span className="text-sm">🔔</span>
              <span className="text-xs font-black">直近のリマインド</span>
            </div>
            {dogs.length > 0 && (
              <Link href={`/dogs/${dogs[0].id}/reminders`} className="text-xs text-gray-400 font-semibold">管理する →</Link>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-14 bg-white rounded-2xl animate-pulse shadow-sm" />
              ))}
            </div>
          ) : reminders.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
              <p className="text-gray-400 text-sm">リマインドはありません</p>
              {dogs.length > 0 && (
                <Link href={`/dogs/${dogs[0].id}/reminders/new`} className="inline-block mt-2 text-amber-500 text-sm font-bold">
                  ＋ リマインドを追加する
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {reminders.map(({ dog, reminder }) => {
                const { label, color } = dueDateLabel(reminder.dueDate);
                const typeIcon = reminder.type === "medication" ? "💊" : reminder.type === "vaccine" ? "💉" : "🏥";
                return (
                  <Link
                    key={reminder.id}
                    href={`/dogs/${dog.id}/reminders`}
                    className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm active:scale-98 transition-transform"
                  >
                    <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                      {dog.photoURL
                        ? <img src={dog.photoURL} alt={dog.name} className="w-full h-full object-cover" />
                        : <span>{typeIcon}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate">{reminder.title}</p>
                      <p className="text-xs text-gray-400">{dog.name}</p>
                    </div>
                    <span className={`text-sm flex-shrink-0 font-semibold ${color}`}>{label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
