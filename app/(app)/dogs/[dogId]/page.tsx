"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getDog, getReminders, getLogs, getDailyHealthChecks } from "@/lib/firestore";
import type { Dog, Reminder, HealthLog, DailyHealthCheck } from "@/lib/types";
import { REMINDER_LABELS } from "@/lib/types";

function calcAge(birthDate: string) {
  const birth = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 12) return `${months}ヶ月`;
  return `${Math.floor(months / 12)}歳${months % 12 > 0 ? `${months % 12}ヶ月` : ""}`;
}

const QUICK_ACTIONS = [
  { href: (id: string) => `/dogs/${id}/reminders/new`, icon: "🔔", label: "リマインド", color: "bg-pink-100" },
  { href: (id: string) => `/dogs/${id}/cares`,          icon: "🛁", label: "定期ケア",   color: "bg-sky-100" },
  { href: (id: string) => `/dogs/${id}/logs/new`,        icon: "📝", label: "記録する",   color: "bg-green-100" },
  { href: (id: string) => `/dogs/${id}/logs`,            icon: "📋", label: "履歴",       color: "bg-violet-100" },
];

export default function DogProfilePage() {
  const { dogId } = useParams<{ dogId: string }>();
  const { user, familyId } = useAuth();
  const router = useRouter();
  const [dog, setDog] = useState<Dog | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [latestHealthCheck, setLatestHealthCheck] = useState<(DailyHealthCheck & { date: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !familyId) return;
    Promise.all([getDog(familyId, dogId), getReminders(familyId, dogId), getLogs(familyId, dogId), getDailyHealthChecks(familyId, dogId)]).then(([d, rs, ls, hcs]) => {
      if (!d) { router.replace("/dogs"); return; }
      setDog(d);
      setReminders(rs.filter((r) => !r.isDone).slice(0, 3));
      setLogs(ls.slice(0, 3));
      setLatestHealthCheck(hcs[0] ?? null);
      setLoading(false);
    });
  }, [user, familyId, dogId, router]);

  const latestWeight = logs.find((l) => l.type === "weight")?.weight;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="text-5xl animate-pulse">🐾</div>
    </div>
  );
  if (!dog) return null;

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ── トップバー ── */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <Link href="/dogs" className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 text-lg active:scale-90 transition-transform">
          ‹
        </Link>
        <Link href={`/dogs/${dogId}/edit`} className="flex items-center gap-1 bg-orange-100 text-orange-600 px-3 py-1.5 rounded-full active:scale-95 transition-transform">
          <span className="text-sm">✏️</span>
          <span className="text-sm font-black">編集</span>
        </Link>
      </div>

      {/* ── プロフィールカード ── */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-4xl overflow-hidden flex-shrink-0 ring-4 ring-amber-200 shadow-sm">
            {dog.photoURL ? <img src={dog.photoURL} alt={dog.name} className="w-full h-full object-cover" /> : "🐕"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-gray-800">{dog.name}</h1>
            {dog.breed && <p className="text-sm text-gray-400">{dog.breed}</p>}
            <div className="flex flex-wrap gap-x-2 mt-1 text-gray-500 text-xs">
              <span>{dog.gender === "male" ? "♂ オス" : "♀ メス"}</span>
              <span>·</span>
              <span>{calcAge(dog.birthDate)}</span>
              {latestWeight && <><span>·</span><span>⚖️ {latestWeight}kg</span></>}
            </div>
          </div>
        </div>
      </div>

      {/* ── クイックアクション ── */}
      <div className="px-4 mb-5">
        <div className="grid grid-cols-4 gap-2">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.label}
              href={a.href(dogId)}
              className={`flex flex-col items-center ${a.color} rounded-2xl py-4 shadow-sm active:scale-95 transition-transform`}
            >
              <span className="text-2xl mb-1">{a.icon}</span>
              <span className="text-xs font-bold text-gray-700">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* ── 直近のリマインド ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 bg-pink-100 text-pink-600 px-3 py-1.5 rounded-full">
              <span className="text-sm">🔔</span>
              <span className="text-xs font-black">直近のリマインド</span>
            </div>
            <Link href={`/dogs/${dogId}/reminders`} className="text-xs text-gray-400 font-semibold">すべて見る →</Link>
          </div>
          {reminders.length === 0 ? (
            <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
              <p className="text-gray-400 text-sm">リマインドなし</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reminders.map((r) => (
                <Link key={r.id} href={`/dogs/${dogId}/reminders`}
                  className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm active:scale-98 transition-transform">
                  <span className="text-xl">{r.type === "medication" ? "💊" : r.type === "vaccine" ? "💉" : "🏥"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800">{r.title}</p>
                    <p className="text-xs text-gray-400">{r.dueDate}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── 最近の記録 ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 bg-green-100 text-green-600 px-3 py-1.5 rounded-full">
              <span className="text-sm">📋</span>
              <span className="text-xs font-black">最近の記録</span>
            </div>
            <Link href={`/dogs/${dogId}/logs`} className="text-xs text-gray-400 font-semibold">すべて見る →</Link>
          </div>
          {!latestHealthCheck && logs.length === 0 ? (
            <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
              <p className="text-gray-400 text-sm">まだ記録がありません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {latestHealthCheck && (
                <Link href={`/dogs/${dogId}/logs`} className="flex items-start gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm active:scale-98 transition-transform">
                  <span className="text-xl mt-0.5">🩺</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-gray-800">体調チェック</p>
                      <p className="text-xs text-gray-400 flex-shrink-0">{latestHealthCheck.date}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      <span className="text-xs text-gray-500">元気度 {"⭐".repeat(latestHealthCheck.energy)}</span>
                      {latestHealthCheck.poop.condition && <span className="text-xs text-gray-500">うんち: {latestHealthCheck.poop.condition}</span>}
                      {latestHealthCheck.memo && <span className="text-xs text-gray-400 truncate">{latestHealthCheck.memo}</span>}
                    </div>
                  </div>
                </Link>
              )}
              {logs.map((l) => (
                <div key={l.id} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm">
                  <span className="text-xl">{l.type === "weight" ? "⚖️" : l.type === "photo" ? "📷" : l.type === "medication" ? "💊" : l.type === "vaccine" ? "💉" : l.type === "vet_visit" ? "🏥" : "📝"}</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 font-medium">{l.type === "weight" ? `${l.weight}kg` : l.note ?? "記録"}</p>
                    <p className="text-xs text-gray-400">{l.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
