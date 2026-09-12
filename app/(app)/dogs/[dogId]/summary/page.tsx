"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/components/AuthProvider";
import { getDog, getLogs, getReminders, getDailyHealthChecks } from "@/lib/firestore";
import type { Dog, HealthLog, Reminder, DailyHealthCheck } from "@/lib/types";
import { REMINDER_LABELS, LOG_LABELS } from "@/lib/types";

const ENERGY_ICON: Record<number, string> = { 1: "😪", 2: "😐", 3: "🙂", 4: "😃", 5: "🤩" };
const TREND_DAYS = 14; // 直近何日分を通院サマリーの対象にするか
const WEIGHT_RANGES = [
  { label: "1ヶ月", days: 30 },
  { label: "3ヶ月", days: 90 },
  { label: "全期間", days: Infinity },
] as const;

function getTodayJST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function daysAgoJST(days: number): string {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function calcAge(birthDate: string) {
  const birth = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 12) return `${months}ヶ月`;
  return `${Math.floor(months / 12)}歳${months % 12 > 0 ? `${months % 12}ヶ月` : ""}`;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}（${"日月火水木金土"[d.getDay()]}）`;
}

export default function DogSummaryPage() {
  const { dogId } = useParams<{ dogId: string }>();
  const { user, familyId } = useAuth();
  const router = useRouter();

  const [dog, setDog] = useState<Dog | null>(null);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [checks, setChecks] = useState<(DailyHealthCheck & { date: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [weightRangeIdx, setWeightRangeIdx] = useState(1); // デフォルト: 3ヶ月

  useEffect(() => {
    if (!user || !familyId) return;
    Promise.all([
      getDog(familyId, dogId),
      getLogs(familyId, dogId),
      getReminders(familyId, dogId),
      getDailyHealthChecks(familyId, dogId),
    ]).then(([d, ls, rs, hcs]) => {
      if (!d) { router.replace("/dogs"); return; }
      setDog(d);
      setLogs(ls);
      setReminders(rs);
      setChecks(hcs);
      setLoading(false);
    });
  }, [user, familyId, dogId, router]);

  const recentChecks = useMemo(() => {
    const cutoff = daysAgoJST(TREND_DAYS);
    return checks.filter((c) => c.date >= cutoff).sort((a, b) => b.date.localeCompare(a.date));
  }, [checks]);

  const energyValues = recentChecks.map((c) => c.energy).filter((n) => n > 0);
  const avgEnergy = energyValues.length > 0 ? energyValues.reduce((a, b) => a + b, 0) / energyValues.length : null;
  const lowAppetiteDays = recentChecks.filter((c) => c.appetite === "少し" || c.appetite === "食べてない").length;
  const eliminationConcernDays = recentChecks.filter((c) => c.elimination === "なし").length;

  const weightRange = WEIGHT_RANGES[weightRangeIdx];
  const weightChartData = useMemo(() => {
    const cutoff = Number.isFinite(weightRange.days) ? daysAgoJST(weightRange.days) : "0000-00-00";
    return logs
      .filter((l) => l.type === "weight" && typeof l.weight === "number" && l.date >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((l) => ({ date: l.date, weight: l.weight as number }));
  }, [logs, weightRange]);

  const latestWeight = logs.find((l) => l.type === "weight")?.weight;

  const activeCareItems = reminders
    .filter((r) => !r.isDone && (r.type === "medication" || r.type === "vaccine" || r.type === "vet_visit"))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const recentCareLogs = logs
    .filter((l) => l.type === "medication" || l.type === "vet_visit" || l.type === "vaccine")
    .slice(0, 8);

  const today = getTodayJST();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-5xl animate-pulse">🐾</div>
      </div>
    );
  }
  if (!dog) return null;

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ── トップバー ── */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Link href={`/dogs/${dogId}`} className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 text-lg active:scale-90 transition-transform">
          ‹
        </Link>
        <div className="flex items-center gap-1.5 bg-sky-100 text-sky-600 px-3 py-1.5 rounded-full">
          <span className="text-sm">🏥</span>
          <span className="text-sm font-black">通院サマリー</span>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* ── 基本情報 ── */}
        <div className="bg-white rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl overflow-hidden flex-shrink-0 ring-4 ring-amber-100">
            {dog.photoURL ? <img src={dog.photoURL} alt={dog.name} className="w-full h-full object-cover" /> : "🐕"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-gray-800">{dog.name}</h1>
            <div className="flex flex-wrap gap-x-2 mt-0.5 text-gray-500 text-xs">
              {dog.breed && <span>{dog.breed}</span>}
              <span>·</span>
              <span>{dog.gender === "male" ? "♂ オス" : "♀ メス"}</span>
              <span>·</span>
              <span>{calcAge(dog.birthDate)}</span>
              {latestWeight && <><span>·</span><span>⚖️ {latestWeight}kg</span></>}
            </div>
            <p className="text-[10px] text-gray-300 mt-1">{today} 時点</p>
          </div>
        </div>

        {/* ── 体調の傾向（直近14日間） ── */}
        <section>
          <div className="flex items-center gap-1.5 bg-green-100 text-green-600 px-3 py-1.5 rounded-full mb-3 self-start">
            <span className="text-sm">📈</span>
            <span className="text-xs font-black">体調の傾向（直近{TREND_DAYS}日間）</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <p className="text-2xl">{avgEnergy ? ENERGY_ICON[Math.round(avgEnergy)] : "－"}</p>
              <p className="text-[10px] text-gray-400 mt-1">平均元気度</p>
              <p className="text-xs font-bold text-gray-600">{avgEnergy ? avgEnergy.toFixed(1) : "記録なし"}</p>
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <p className="text-2xl">{lowAppetiteDays > 0 ? "⚠️" : "✅"}</p>
              <p className="text-[10px] text-gray-400 mt-1">食欲低下</p>
              <p className="text-xs font-bold text-gray-600">{lowAppetiteDays}日</p>
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <p className="text-2xl">{eliminationConcernDays > 0 ? "⚠️" : "✅"}</p>
              <p className="text-[10px] text-gray-400 mt-1">排泄なし</p>
              <p className="text-xs font-bold text-gray-600">{eliminationConcernDays}日</p>
            </div>
          </div>

          {recentChecks.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
              <p className="text-gray-400 text-sm">直近{TREND_DAYS}日間の体調チェック記録がありません</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-50">
                      <th className="text-left font-bold py-2 pl-4 pr-2 whitespace-nowrap">日付</th>
                      <th className="text-center font-bold py-2 px-2">元気</th>
                      <th className="text-center font-bold py-2 px-2">食欲</th>
                      <th className="text-center font-bold py-2 px-2">排泄</th>
                      <th className="text-left font-bold py-2 pr-4 pl-2">メモ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentChecks.map((c) => (
                      <tr key={c.date} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 pl-4 pr-2 whitespace-nowrap text-gray-600">{formatShortDate(c.date)}</td>
                        <td className="py-2 px-2 text-center">{c.energy > 0 ? ENERGY_ICON[c.energy] : "－"}</td>
                        <td className="py-2 px-2 text-center text-gray-600">{c.appetite || "－"}</td>
                        <td className={`py-2 px-2 text-center ${c.elimination === "なし" ? "text-red-500 font-bold" : "text-gray-600"}`}>{c.elimination || "－"}</td>
                        <td className="py-2 pr-4 pl-2 text-gray-400 max-w-[120px] truncate">{c.memo || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ── 体重推移 ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 bg-amber-100 text-amber-600 px-3 py-1.5 rounded-full">
              <span className="text-sm">⚖️</span>
              <span className="text-xs font-black">体重推移</span>
            </div>
            <div className="flex bg-gray-100 rounded-full p-0.5">
              {WEIGHT_RANGES.map((r, i) => (
                <button
                  key={r.label}
                  onClick={() => setWeightRangeIdx(i)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${weightRangeIdx === i ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 shadow-sm">
            {weightChartData.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-gray-400 text-sm">体重の記録がありません</p>
                <Link href={`/dogs/${dogId}/logs/new`} className="inline-block mt-2 text-amber-500 text-sm font-bold">＋ 体重を記録する</Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weightChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickFormatter={(value: string) => {
                      const d = new Date(value + "T00:00:00");
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    domain={["dataMin - 1", "dataMax + 1"]}
                    tickFormatter={(v: number) => `${Math.round(v * 10) / 10}`}
                  />
                  <Tooltip
                    contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#f9fafb" }}
                    formatter={(value) => [`${value} kg`, "体重"]}
                  />
                  <Line type="monotone" dataKey="weight" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b" }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* ── 投薬・通院メモ ── */}
        <section>
          <div className="flex items-center gap-1.5 bg-violet-100 text-violet-600 px-3 py-1.5 rounded-full mb-3 self-start">
            <span className="text-sm">💊</span>
            <span className="text-xs font-black">投薬・通院メモ</span>
          </div>

          {activeCareItems.length === 0 && recentCareLogs.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
              <p className="text-gray-400 text-sm">投薬・通院の記録がありません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeCareItems.map((r) => (
                <div key={r.id} className="flex items-start gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm">
                  <span className="text-xl mt-0.5">{r.type === "medication" ? "💊" : r.type === "vaccine" ? "💉" : "🏥"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black text-gray-400 uppercase">{REMINDER_LABELS[r.type]}（予定）</p>
                    </div>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">{r.title}</p>
                    {r.note && <p className="text-xs text-gray-500 mt-0.5">{r.note}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{r.dueDate}</p>
                  </div>
                </div>
              ))}
              {recentCareLogs.map((l) => (
                <div key={l.id} className="flex items-start gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm">
                  <span className="text-xl mt-0.5">{l.type === "medication" ? "💊" : l.type === "vaccine" ? "💉" : "🏥"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-gray-400 uppercase">{LOG_LABELS[l.type]}（記録）</p>
                    {l.note && <p className="text-sm text-gray-700 mt-0.5">{l.note}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{l.date}</p>
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
