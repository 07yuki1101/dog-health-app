"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getDog, getReminders, getLogs } from "@/lib/firestore";
import type { Dog, Reminder, HealthLog } from "@/lib/types";
import { REMINDER_LABELS } from "@/lib/types";

function calcAge(birthDate: string) {
  const birth = new Date(birthDate);
  const now = new Date();
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 12) return `${months}ヶ月`;
  return `${Math.floor(months / 12)}歳${months % 12 > 0 ? `${months % 12}ヶ月` : ""}`;
}

export default function DogProfilePage() {
  const { dogId } = useParams<{ dogId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [dog, setDog] = useState<Dog | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDog(user.uid, dogId),
      getReminders(user.uid, dogId),
      getLogs(user.uid, dogId),
    ]).then(([d, rs, ls]) => {
      if (!d) { router.replace("/dogs"); return; }
      setDog(d);
      setReminders(rs.filter((r) => !r.isDone).slice(0, 3));
      setLogs(ls.slice(0, 3));
      setLoading(false);
    });
  }, [user, dogId, router]);

  const latestWeight = logs.find((l) => l.type === "weight")?.weight;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-pulse">🐾</div>
      </div>
    );
  }

  if (!dog) return null;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      {/* Dog header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-4xl overflow-hidden flex-shrink-0 shadow-sm">
          {dog.photoURL ? (
            <img src={dog.photoURL} alt={dog.name} className="w-full h-full object-cover" />
          ) : (
            "🐕"
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{dog.name}</h1>
          <p className="text-sm text-gray-500">{dog.breed}</p>
          <div className="flex gap-3 mt-1 text-xs text-gray-400">
            <span>{dog.gender === "male" ? "♂ オス" : "♀ メス"}</span>
            <span>{calcAge(dog.birthDate)}</span>
            {latestWeight && <span>⚖️ {latestWeight}kg</span>}
          </div>
        </div>
        <Link
          href={`/dogs/${dogId}/edit`}
          className="text-xs text-gray-400 border border-gray-200 rounded-full px-3 py-1.5 bg-white"
        >
          編集
        </Link>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Link
          href={`/dogs/${dogId}/reminders/new`}
          className="flex flex-col items-center bg-white rounded-2xl py-4 shadow-sm active:scale-95 transition-transform"
        >
          <span className="text-2xl mb-1">🔔</span>
          <span className="text-xs text-gray-600 font-medium">リマインド</span>
        </Link>
        <Link
          href={`/dogs/${dogId}/logs/new`}
          className="flex flex-col items-center bg-white rounded-2xl py-4 shadow-sm active:scale-95 transition-transform"
        >
          <span className="text-2xl mb-1">📝</span>
          <span className="text-xs text-gray-600 font-medium">記録する</span>
        </Link>
        <Link
          href={`/dogs/${dogId}/logs`}
          className="flex flex-col items-center bg-white rounded-2xl py-4 shadow-sm active:scale-95 transition-transform"
        >
          <span className="text-2xl mb-1">📋</span>
          <span className="text-xs text-gray-600 font-medium">履歴</span>
        </Link>
      </div>

      {/* Upcoming reminders */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            直近のリマインド
          </h2>
          <Link href={`/dogs/${dogId}/reminders`} className="text-xs text-amber-600 font-medium">
            すべて見る
          </Link>
        </div>
        {reminders.length === 0 ? (
          <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
            <p className="text-gray-400 text-sm">リマインドなし</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reminders.map((r) => (
              <Link
                key={r.id}
                href={`/dogs/${dogId}/reminders`}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm"
              >
                <span className="text-xl">
                  {r.type === "medication" ? "💊" : r.type === "vaccine" ? "💉" : "🏥"}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{r.title}</p>
                  <p className="text-xs text-gray-400">{r.dueDate}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent logs */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">最近の記録</h2>
          <Link href={`/dogs/${dogId}/logs`} className="text-xs text-amber-600 font-medium">
            すべて見る
          </Link>
        </div>
        {logs.length === 0 ? (
          <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
            <p className="text-gray-400 text-sm">まだ記録がありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm">
                <span className="text-xl">
                  {l.type === "weight"
                    ? "⚖️"
                    : l.type === "photo"
                    ? "📷"
                    : l.type === "medication"
                    ? "💊"
                    : l.type === "vaccine"
                    ? "💉"
                    : l.type === "vet_visit"
                    ? "🏥"
                    : "📝"}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    {l.type === "weight" ? `${l.weight}kg` : l.note ?? "記録"}
                  </p>
                  <p className="text-xs text-gray-400">{l.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
