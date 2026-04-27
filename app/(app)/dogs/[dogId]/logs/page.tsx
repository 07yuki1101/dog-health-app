"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getLogs, deleteLog } from "@/lib/firestore";
import type { HealthLog, LogType } from "@/lib/types";

const LOG_ICON: Record<LogType, string> = {
  weight: "⚖️",
  note: "📝",
  medication: "💊",
  vaccine: "💉",
  vet_visit: "🏥",
  photo: "📷",
};

const LOG_LABEL: Record<LogType, string> = {
  weight: "体重",
  note: "メモ",
  medication: "投薬",
  vaccine: "ワクチン",
  vet_visit: "通院",
  photo: "写真",
};

function groupByDate(logs: HealthLog[]) {
  const groups: { date: string; logs: HealthLog[] }[] = [];
  let current: string | null = null;
  for (const log of logs) {
    if (log.date !== current) {
      groups.push({ date: log.date, logs: [log] });
      current = log.date;
    } else {
      groups[groups.length - 1].logs.push(log);
    }
  }
  return groups;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
}

export default function LogsPage() {
  const { dogId } = useParams<{ dogId: string }>();
  const { user } = useAuth();
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<LogType | "all">("all");

  useEffect(() => {
    if (!user) return;
    getLogs(user.uid, dogId).then((ls) => {
      setLogs(ls);
      setLoading(false);
    });
  }, [user, dogId]);

  async function handleDelete(logId: string) {
    if (!user || !confirm("この記録を削除しますか？")) return;
    await deleteLog(user.uid, dogId, logId);
    setLogs((prev) => prev.filter((l) => l.id !== logId));
  }

  const filtered = filterType === "all" ? logs : logs.filter((l) => l.type === filterType);
  const groups = groupByDate(filtered);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-800">健康記録</h1>
        <Link
          href={`/dogs/${dogId}/logs/new`}
          className="bg-amber-500 text-white text-sm font-medium px-4 py-2 rounded-full shadow-sm active:scale-95 transition-transform"
        >
          + 記録
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {(["all", "weight", "note", "medication", "vaccine", "vet_visit", "photo"] as const).map(
          (t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filterType === t
                  ? "bg-amber-500 border-amber-500 text-white"
                  : "bg-white border-gray-200 text-gray-500"
              }`}
            >
              {t === "all" ? "すべて" : `${LOG_ICON[t]} ${LOG_LABEL[t]}`}
            </button>
          )
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
          <p className="text-gray-400 mb-4">記録がありません</p>
          <Link
            href={`/dogs/${dogId}/logs/new`}
            className="text-amber-600 font-medium text-sm"
          >
            + 最初の記録をする
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.date}>
              <p className="text-xs font-semibold text-gray-400 mb-2">{formatDate(group.date)}</p>
              <div className="space-y-2">
                {group.logs.map((log) => (
                  <div key={log.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5">{LOG_ICON[log.type]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-400 uppercase">
                          {LOG_LABEL[log.type]}
                        </p>
                        {log.type === "weight" && (
                          <p className="text-lg font-bold text-gray-800">{log.weight} kg</p>
                        )}
                        {log.note && (
                          <p className="text-sm text-gray-700 mt-0.5">{log.note}</p>
                        )}
                        {log.photoURL && (
                          <img
                            src={log.photoURL}
                            alt="記録写真"
                            className="mt-2 rounded-xl w-full max-h-48 object-cover"
                          />
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="text-gray-300 text-lg pl-2 active:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
