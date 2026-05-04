"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { getDogs, getUpcomingReminders } from "@/lib/firestore";
import { DailyTasks } from "@/components/DailyTasks";
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

  const today = new Date().toISOString().split("T")[0];

  function dueDateLabel(dueDate: string) {
    if (dueDate === today) return { label: "今日", color: "text-red-500 font-bold" };
    const diff = Math.ceil((new Date(dueDate).getTime() - new Date(today).getTime()) / 86400000);
    if (diff <= 3) return { label: `${diff}日後`, color: "text-amber-500 font-semibold" };
    return { label: `${diff}日後`, color: "text-gray-500" };
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {user?.displayName?.split(" ")[0] ?? ""}さん、こんにちは 👋
          </h1>
          <p className="text-sm text-gray-500">愛犬の健康をチェックしましょう</p>
        </div>
        <button
          onClick={() => signOut(getFirebaseAuth())}
          className="text-xs text-gray-400 px-3 py-1 rounded-full border border-gray-200"
        >
          ログアウト
        </button>
      </div>

      <DailyTasks />

      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          直近のリマインド
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : reminders.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <p className="text-gray-400 text-sm">リマインドはありません</p>
            {dogs.length > 0 && (
              <Link href={`/dogs/${dogs[0].id}/reminders/new`} className="inline-block mt-3 text-amber-600 text-sm font-medium">
                + リマインドを追加する
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map(({ dog, reminder }) => {
              const { label, color } = dueDateLabel(reminder.dueDate);
              return (
                <Link
                  key={reminder.id}
                  href={`/dogs/${dog.id}/reminders`}
                  className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm active:scale-98 transition-transform"
                >
                  <span className="text-2xl">
                    {reminder.type === "medication" ? "💊" : reminder.type === "vaccine" ? "💉" : "🏥"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{reminder.title}</p>
                    <p className="text-xs text-gray-400">{dog.name}</p>
                  </div>
                  <span className={`text-sm ${color}`}>{label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">わんこ</h2>
          <Link href="/dogs" className="text-xs text-amber-600 font-medium">すべて見る</Link>
        </div>
        {loading ? (
          <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        ) : dogs.length === 0 ? (
          <Link
            href="/dogs/new"
            className="flex flex-col items-center justify-center bg-white rounded-2xl p-8 shadow-sm border-2 border-dashed border-amber-200 active:scale-98 transition-transform"
          >
            <span className="text-3xl mb-2">🐕</span>
            <p className="text-amber-600 font-medium text-sm">愛犬を登録する</p>
          </Link>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {dogs.map((dog) => (
              <Link
                key={dog.id}
                href={`/dogs/${dog.id}`}
                className="flex-shrink-0 flex flex-col items-center bg-white rounded-2xl px-5 py-4 shadow-sm active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-2xl mb-2 overflow-hidden">
                  {dog.photoURL ? (
                    <img src={dog.photoURL} alt={dog.name} className="w-full h-full object-cover" />
                  ) : "🐕"}
                </div>
                <span className="text-sm font-medium text-gray-700">{dog.name}</span>
              </Link>
            ))}
            <Link
              href="/dogs/new"
              className="flex-shrink-0 flex flex-col items-center justify-center bg-white rounded-2xl px-5 py-4 shadow-sm border-2 border-dashed border-gray-200"
            >
              <span className="text-2xl text-gray-300 mb-2">+</span>
              <span className="text-xs text-gray-400">追加</span>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
