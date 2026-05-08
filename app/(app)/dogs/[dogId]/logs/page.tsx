"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getLogs, deleteLog, getDailyHealthChecks } from "@/lib/firestore";
import type { HealthLog, LogType, DailyHealthCheck } from "@/lib/types";

const LOG_ICON: Record<LogType, string> = { weight: "⚖️", note: "📝", medication: "💊", vaccine: "💉", vet_visit: "🏥", photo: "📷" };
const LOG_LABEL: Record<LogType, string> = { weight: "体重", note: "メモ", medication: "投薬", vaccine: "ワクチン", vet_visit: "通院", photo: "写真" };

function groupByDate(logs: HealthLog[]) {
  const groups: { date: string; logs: HealthLog[] }[] = [];
  let current: string | null = null;
  for (const log of logs) {
    if (log.date !== current) { groups.push({ date: log.date, logs: [log] }); current = log.date; }
    else groups[groups.length - 1].logs.push(log);
  }
  return groups;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
}

type FilterType = LogType | "all" | "health_check";

function HealthCheckCard({ check }: { check: DailyHealthCheck & { date: string } }) {
  const [open, setOpen] = useState(false);
  const summary: string[] = [];
  if (check.meals?.some((m) => m.amountEaten)) check.meals.filter((m) => m.amountEaten).forEach((m) => summary.push(`🍚${m.label} ${m.amountEaten}`));
  if (check.poop.condition) summary.push(`💩 ${check.poop.condition}`);
  if (check.pee.condition) summary.push(`💧 ${check.pee.condition}`);
  if (check.energy > 0) summary.push(`⚡ 元気度${check.energy}`);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-start gap-3 px-4 py-3 text-left active:bg-gray-50">
        <span className="text-2xl mt-0.5">🩺</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-gray-400 uppercase mb-1">体調チェック</p>
          {summary.length > 0
            ? <p className="text-sm text-gray-600 truncate">{summary.join("　")}</p>
            : <p className="text-sm text-gray-400">記録あり</p>}
        </div>
        <span className={`text-gray-300 text-xs mt-1 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
          {(check.meals ?? []).map((meal) => (
            <div key={meal.label}>
              <p className="text-xs font-black text-gray-400 mb-1">🍚 ご飯（{meal.label}）</p>
              <div className="text-sm text-gray-700 space-y-0.5">
                {meal.foodType && <p>フード：{meal.foodType}</p>}
                {meal.amount && <p>量：{meal.amount}g</p>}
                {meal.amountEaten && <p>食べた量：{meal.amountEaten}</p>}
                {!meal.foodType && !meal.amount && !meal.amountEaten && <p className="text-gray-400">記録なし</p>}
              </div>
            </div>
          ))}
          <div>
            <p className="text-xs font-black text-gray-400 mb-1">💩 うんち</p>
            <div className="text-sm text-gray-700 space-y-0.5">
              {check.poop.condition && <p>状態：{check.poop.condition}</p>}
              {check.poop.memo && <p>メモ：{check.poop.memo}</p>}
              {!check.poop.condition && !check.poop.memo && <p className="text-gray-400">記録なし</p>}
            </div>
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 mb-1">💧 おしっこ</p>
            <p className="text-sm text-gray-700">{check.pee.condition || <span className="text-gray-400">記録なし</span>}</p>
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 mb-1">⚡ 元気度</p>
            {check.energy > 0 ? (
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${n <= check.energy ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-300"}`}>{n}</div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">記録なし</p>}
          </div>
          {check.memo && (
            <div>
              <p className="text-xs font-black text-gray-400 mb-1">📝 メモ</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{check.memo}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LogsPage() {
  const { dogId } = useParams<{ dogId: string }>();
  const { user, familyId } = useAuth();
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [healthChecks, setHealthChecks] = useState<(DailyHealthCheck & { date: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>("all");

  useEffect(() => {
    if (!user || !familyId) return;
    Promise.all([getLogs(familyId, dogId), getDailyHealthChecks(familyId, dogId)]).then(([ls, hcs]) => {
      setLogs(ls); setHealthChecks(hcs); setLoading(false);
    });
  }, [user, familyId, dogId]);

  async function handleDelete(logId: string) {
    if (!user || !familyId || !confirm("この記録を削除しますか？")) return;
    await deleteLog(familyId, dogId, logId);
    setLogs((prev) => prev.filter((l) => l.id !== logId));
  }

  const filtered = filterType === "all" ? logs : filterType === "health_check" ? [] : logs.filter((l) => l.type === filterType);
  const groups = groupByDate(filtered);

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "all", label: "すべて" },
    { key: "health_check", label: "🩺 体調チェック" },
    { key: "weight", label: "⚖️ 体重" },
    { key: "note", label: "📝 メモ" },
    { key: "medication", label: "💊 投薬" },
    { key: "vaccine", label: "💉 ワクチン" },
    { key: "vet_visit", label: "🏥 通院" },
    { key: "photo", label: "📷 写真" },
  ];

  return (
    <div className="max-w-lg mx-auto pb-28">
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <div className="flex items-center gap-1.5 bg-green-100 text-green-600 px-3 py-1.5 rounded-full">
          <span className="text-sm">📋</span>
          <span className="text-sm font-black">健康記録</span>
        </div>
        <Link href={`/dogs/${dogId}/logs/new`}
          className="bg-amber-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-sm active:scale-95 transition-transform">
          ＋ 記録
        </Link>
      </div>

      <div className="px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
          {FILTERS.map(({ key, label }) => (
            <button key={key} onClick={() => setFilterType(key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-bold border-2 transition-colors ${filterType === key ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-gray-100 text-gray-500"}`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse shadow-sm" />)}</div>
        ) : filterType === "health_check" ? (
          healthChecks.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
              <p className="text-4xl mb-3">🩺</p>
              <p className="text-gray-400">体調チェックの記録がありません</p>
            </div>
          ) : (
            <div className="space-y-6">
              {healthChecks.map((hc) => (
                <div key={hc.date}>
                  <p className="text-xs font-black text-gray-400 mb-2">{formatDate(hc.date)}</p>
                  <HealthCheckCard check={hc} />
                </div>
              ))}
            </div>
          )
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-gray-400 mb-4">記録がありません</p>
            <Link href={`/dogs/${dogId}/logs/new`} className="text-amber-500 font-bold text-sm">＋ 最初の記録をする</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.date}>
                <p className="text-xs font-black text-gray-400 mb-2">{formatDate(group.date)}</p>
                <div className="space-y-2">
                  {group.logs.map((log) => (
                    <div key={log.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5">{LOG_ICON[log.type]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-gray-400 uppercase">{LOG_LABEL[log.type]}</p>
                          {log.type === "weight" && <p className="text-lg font-black text-gray-800">{log.weight} kg</p>}
                          {log.note && <p className="text-sm text-gray-700 mt-0.5">{log.note}</p>}
                          {log.photoURL && <img src={log.photoURL} alt="記録写真" className="mt-2 rounded-xl w-full max-h-48 object-cover" />}
                        </div>
                        <button onClick={() => handleDelete(log.id)} className="text-gray-200 text-xl pl-2 active:text-red-400 transition-colors">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
