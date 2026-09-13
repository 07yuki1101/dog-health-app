"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getLogs, deleteLog, getDailyHealthChecks } from "@/lib/firestore";
import type { HealthLog, LogType, DailyHealthCheck } from "@/lib/types";
import { BackButton } from "@/components/ui/BackButton";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

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
  if (check.energy > 0) summary.push(`⚡ 元気度${check.energy}`);
  if (check.appetite) summary.push(`🍚 ${check.appetite}`);
  if (check.elimination) summary.push(`💩 排泄${check.elimination}`);
  if (check.meals?.some((m) => m.amountEaten)) check.meals.filter((m) => m.amountEaten).forEach((m) => summary.push(`🍚${m.label} ${m.amountEaten}`));
  if (check.poop?.condition) summary.push(`💩 ${check.poop.condition}`);
  if (check.pee?.condition) summary.push(`💧 ${check.pee.condition}`);

  return (
    <Card padding="sm" className="!p-0 overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-start gap-3 px-4 py-3 text-left active:opacity-70">
        <span className="text-2xl mt-0.5">🩺</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-ink-faint mb-1">体調チェック</p>
          {summary.length > 0
            ? <p className="text-sm text-ink-soft truncate">{summary.join("　")}</p>
            : <p className="text-sm text-ink-faint">記録あり</p>}
        </div>
        <span className={`text-ink-faint text-xs mt-1 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-cream pt-3">
          <div>
            <p className="text-xs font-bold text-ink-faint mb-1">⚡ 元気度</p>
            {check.energy > 0 ? (
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${n <= check.energy ? "bg-brand text-white" : "bg-cream text-ink-faint"}`}>{n}</div>
                ))}
              </div>
            ) : <p className="text-sm text-ink-faint">記録なし</p>}
          </div>
          <div>
            <p className="text-xs font-bold text-ink-faint mb-1">🍚 食欲</p>
            <p className="text-sm text-ink">{check.appetite || <span className="text-ink-faint">記録なし</span>}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-ink-faint mb-1">💩 排泄</p>
            <p className="text-sm text-ink">{check.elimination || <span className="text-ink-faint">記録なし</span>}</p>
          </div>
          {/* 旧フォーマット（詳細版）のデータが残っている場合のみ表示 */}
          {(check.meals?.length || check.poop?.condition || check.poop?.memo || check.pee?.condition) ? (
            <>
              {(check.meals ?? []).map((meal) => (
                <div key={meal.label}>
                  <p className="text-xs font-bold text-ink-faint mb-1">🍚 ご飯（{meal.label}）</p>
                  <div className="text-sm text-ink space-y-0.5">
                    {meal.foodType && <p>フード：{meal.foodType}</p>}
                    {meal.amount && <p>量：{meal.amount}g</p>}
                    {meal.amountEaten && <p>食べた量：{meal.amountEaten}</p>}
                    {!meal.foodType && !meal.amount && !meal.amountEaten && <p className="text-ink-faint">記録なし</p>}
                  </div>
                </div>
              ))}
              {(check.poop?.condition || check.poop?.memo) && (
                <div>
                  <p className="text-xs font-bold text-ink-faint mb-1">💩 うんち（旧記録）</p>
                  <div className="text-sm text-ink space-y-0.5">
                    {check.poop?.condition && <p>状態：{check.poop.condition}</p>}
                    {check.poop?.memo && <p>メモ：{check.poop.memo}</p>}
                  </div>
                </div>
              )}
              {check.pee?.condition && (
                <div>
                  <p className="text-xs font-bold text-ink-faint mb-1">💧 おしっこ（旧記録）</p>
                  <p className="text-sm text-ink">{check.pee.condition}</p>
                </div>
              )}
            </>
          ) : null}
          {check.memo && (
            <div>
              <p className="text-xs font-bold text-ink-faint mb-1">📝 メモ</p>
              <p className="text-sm text-ink whitespace-pre-wrap">{check.memo}</p>
            </div>
          )}
        </div>
      )}
    </Card>
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
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto pb-28">

        {/* ── トップバー ── */}
        <div className="flex items-center justify-between px-5 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <BackButton href={`/dogs/${dogId}`} />
            <span className="text-lg font-black text-ink tracking-tight">健康記録</span>
          </div>
          <Link href={`/dogs/${dogId}/logs/new`}
            className="bg-gradient-to-br from-brand-start to-brand-end text-white text-sm font-bold px-4 py-2 rounded-full shadow-md shadow-amber-200 active:scale-95 transition-transform">
            ＋ 記録
          </Link>
        </div>

        <div className="px-5">
          <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
            {FILTERS.map(({ key, label }) => (
              <Chip key={key} label={label} active={filterType === key} onClick={() => setFilterType(key)} />
            ))}
          </div>

          {loading ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-surface/60 rounded-2xl animate-pulse" />)}</div>
          ) : filterType === "health_check" ? (
            healthChecks.length === 0 ? (
              <Card className="text-center py-10">
                <p className="text-4xl mb-3">🩺</p>
                <p className="text-ink-faint">体調チェックの記録がありません</p>
              </Card>
            ) : (
              <div className="space-y-6">
                {healthChecks.map((hc) => (
                  <div key={hc.date}>
                    <p className="text-xs font-bold text-ink-faint mb-2">{formatDate(hc.date)}</p>
                    <HealthCheckCard check={hc} />
                  </div>
                ))}
              </div>
            )
          ) : groups.length === 0 ? (
            <Card className="text-center py-10">
              <p className="text-4xl mb-3">📝</p>
              <p className="text-ink-faint mb-4">記録がありません</p>
              <Link href={`/dogs/${dogId}/logs/new`} className="text-brand font-bold text-sm">＋ 最初の記録をする</Link>
            </Card>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.date}>
                  <p className="text-xs font-bold text-ink-faint mb-2">{formatDate(group.date)}</p>
                  <div className="space-y-2">
                    {group.logs.map((log) => (
                      <Card key={log.id} padding="sm">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center text-lg flex-shrink-0">
                            {LOG_ICON[log.type]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-ink-faint">{LOG_LABEL[log.type]}</p>
                            {log.type === "weight" && <p className="text-lg font-black text-ink">{log.weight} kg</p>}
                            {log.note && <p className="text-sm text-ink mt-0.5">{log.note}</p>}
                            {log.photoURL && <img src={log.photoURL} alt="記録写真" className="mt-2 rounded-xl w-full max-h-48 object-cover" />}
                          </div>
                          <button onClick={() => handleDelete(log.id)} className="text-ink-faint text-xl pl-2 active:text-danger transition-colors">×</button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
