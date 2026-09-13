"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getDog, getReminders, getLogs, getDailyHealthChecks } from "@/lib/firestore";
import type { Dog, Reminder, HealthLog, DailyHealthCheck } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";

function calcAge(birthDate: string) {
  const birth = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 12) return `${months}ヶ月`;
  return `${Math.floor(months / 12)}歳${months % 12 > 0 ? `${months % 12}ヶ月` : ""}`;
}

const QUICK_ACTIONS = [
  { href: (id: string) => `/dogs/${id}/reminders`, icon: "🔔", label: "リマインド" },
  { href: (id: string) => `/dogs/${id}/cares`,      icon: "🛁", label: "定期ケア" },
  { href: (id: string) => `/dogs/${id}/logs/new`,   icon: "📝", label: "記録する" },
  { href: (id: string) => `/dogs/${id}/logs`,       icon: "📋", label: "履歴" },
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
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-5xl animate-pulse">🐾</div>
    </div>
  );
  if (!dog) return null;

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto pb-28">

        {/* ── トップバー ── */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          <Link href="/dogs" className="w-9 h-9 rounded-full bg-surface shadow-sm flex items-center justify-center text-ink-soft text-lg active:scale-90 transition-transform">
            ‹
          </Link>
          <Link href={`/dogs/${dogId}/edit`} className="flex items-center gap-1 bg-brand-soft text-brand px-3 py-1.5 rounded-full active:scale-95 transition-transform">
            <span className="text-sm">✏️</span>
            <span className="text-sm font-bold">編集</span>
          </Link>
        </div>

        <div className="px-5">

          {/* ── プロフィールカード ── */}
          <Card className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-brand-soft flex items-center justify-center text-4xl overflow-hidden flex-shrink-0 ring-4 ring-brand-soft">
              {dog.photoURL ? <img src={dog.photoURL} alt={dog.name} className="w-full h-full object-cover" /> : "🐕"}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-ink">{dog.name}</h1>
              {dog.breed && <p className="text-sm text-ink-faint">{dog.breed}</p>}
              <div className="flex flex-wrap gap-x-2 mt-1 text-ink-soft text-xs">
                <span>{dog.gender === "male" ? "♂ オス" : "♀ メス"}</span>
                <span>·</span>
                <span>{calcAge(dog.birthDate)}</span>
                {latestWeight && <><span>·</span><span>⚖️ {latestWeight}kg</span></>}
              </div>
            </div>
          </Card>

          {/* ── 通院サマリーへの入口 ── */}
          <Link
            href={`/dogs/${dogId}/summary`}
            className="flex items-center justify-between bg-gradient-to-br from-brand-start to-brand-end rounded-3xl px-5 py-4 shadow-md shadow-amber-200 active:scale-[0.98] transition-transform mb-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏥</span>
              <div>
                <p className="text-white font-black text-sm">通院サマリー</p>
                <p className="text-white/80 text-xs">体調・体重・投薬をまとめて確認</p>
              </div>
            </div>
            <span className="text-white/80 text-lg">›</span>
          </Link>

          {/* ── クイックアクション ── */}
          <div className="grid grid-cols-4 gap-2 mb-8">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.label}
                href={a.href(dogId)}
                className="flex flex-col items-center gap-1.5 bg-surface rounded-2xl py-4 shadow-sm shadow-black/[0.03] active:scale-95 transition-transform"
              >
                <span className="w-9 h-9 rounded-full bg-brand-soft flex items-center justify-center text-lg">{a.icon}</span>
                <span className="text-xs font-bold text-ink">{a.label}</span>
              </Link>
            ))}
          </div>

          {/* ── 直近のリマインド ── */}
          <section className="mb-8">
            <SectionHeading icon="🔔" title="直近のリマインド" action={{ label: "すべて見る", href: `/dogs/${dogId}/reminders` }} />
            {reminders.length === 0 ? (
              <Card className="text-center">
                <p className="text-ink-faint text-sm">リマインドなし</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {reminders.map((r) => (
                  <Link key={r.id} href={`/dogs/${dogId}/reminders`}
                    className="flex items-center gap-3 bg-surface rounded-2xl px-4 py-3 shadow-sm shadow-black/[0.03] active:scale-[0.98] transition-transform">
                    <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center text-lg flex-shrink-0">
                      {r.type === "medication" ? "💊" : r.type === "vaccine" ? "💉" : "🏥"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink truncate">{r.title}</p>
                      <p className="text-xs text-ink-faint">{r.dueDate}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* ── 最近の記録 ── */}
          <section>
            <SectionHeading icon="📋" title="最近の記録" action={{ label: "すべて見る", href: `/dogs/${dogId}/logs` }} />
            {!latestHealthCheck && logs.length === 0 ? (
              <Card className="text-center">
                <p className="text-ink-faint text-sm">まだ記録がありません</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {latestHealthCheck && (
                  <Link href={`/dogs/${dogId}/logs`} className="flex items-start gap-3 bg-surface rounded-2xl px-4 py-3 shadow-sm shadow-black/[0.03] active:scale-[0.98] transition-transform">
                    <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center text-lg flex-shrink-0 mt-0.5">🩺</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-ink">体調チェック</p>
                        <p className="text-xs text-ink-faint flex-shrink-0">{latestHealthCheck.date}</p>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        <span className="text-xs text-ink-soft">元気度 {"⭐".repeat(latestHealthCheck.energy)}</span>
                        {latestHealthCheck.appetite && <span className="text-xs text-ink-soft">食欲: {latestHealthCheck.appetite}</span>}
                        {latestHealthCheck.elimination && <span className="text-xs text-ink-soft">排泄: {latestHealthCheck.elimination}</span>}
                        {latestHealthCheck.poop?.condition && <span className="text-xs text-ink-soft">うんち: {latestHealthCheck.poop.condition}</span>}
                        {latestHealthCheck.memo && <span className="text-xs text-ink-faint truncate">{latestHealthCheck.memo}</span>}
                      </div>
                    </div>
                  </Link>
                )}
                {logs.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 bg-surface rounded-2xl px-4 py-3 shadow-sm shadow-black/[0.03]">
                    <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center text-lg flex-shrink-0">
                      {l.type === "weight" ? "⚖️" : l.type === "photo" ? "📷" : l.type === "medication" ? "💊" : l.type === "vaccine" ? "💉" : l.type === "vet_visit" ? "🏥" : "📝"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink font-medium truncate">{l.type === "weight" ? `${l.weight}kg` : l.note ?? "記録"}</p>
                      <p className="text-xs text-ink-faint">{l.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
