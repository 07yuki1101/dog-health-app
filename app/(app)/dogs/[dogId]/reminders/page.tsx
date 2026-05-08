"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getReminders, updateReminder, deleteReminder } from "@/lib/firestore";
import type { Reminder } from "@/lib/types";

const today = new Date().toISOString().split("T")[0];

function dueDateStatus(dueDate: string, isDone: boolean) {
  if (isDone) return { label: "完了", color: "text-green-600", bg: "bg-green-100" };
  if (dueDate < today) return { label: "期限切れ", color: "text-red-600", bg: "bg-red-100" };
  if (dueDate === today) return { label: "今日", color: "text-red-600", bg: "bg-red-100" };
  const diff = Math.ceil((new Date(dueDate).getTime() - new Date(today).getTime()) / 86400000);
  if (diff <= 3) return { label: `${diff}日後`, color: "text-amber-600", bg: "bg-amber-100" };
  return { label: `${diff}日後`, color: "text-gray-500", bg: "bg-gray-100" };
}

export default function RemindersPage() {
  const { dogId } = useParams<{ dogId: string }>();
  const { user, familyId } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "done">("upcoming");

  async function load() {
    if (!user || !familyId) return;
    const rs = await getReminders(familyId, dogId);
    setReminders(rs);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user, dogId]);

  async function toggleDone(r: Reminder) {
    if (!user || !familyId) return;
    await updateReminder(familyId, dogId, r.id, { isDone: !r.isDone });
    setReminders((prev) => prev.map((x) => x.id === r.id ? { ...x, isDone: !x.isDone } : x));
  }

  async function handleDelete(id: string) {
    if (!user || !familyId || !confirm("削除しますか？")) return;
    await deleteReminder(familyId, dogId, id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  const filtered = reminders.filter((r) => filter === "done" ? r.isDone : !r.isDone);

  return (
    <div className="max-w-lg mx-auto pb-28">
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <div className="flex items-center gap-1.5 bg-pink-100 text-pink-600 px-3 py-1.5 rounded-full">
          <span className="text-sm">🔔</span>
          <span className="text-sm font-black">リマインド</span>
        </div>
        <Link
          href={`/dogs/${dogId}/reminders/new`}
          className="bg-amber-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-sm active:scale-95 transition-transform"
        >
          ＋ 追加
        </Link>
      </div>

      <div className="px-4">
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
          {(["upcoming", "done"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${filter === f ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"}`}>
              {f === "upcoming" ? "未完了" : "完了済み"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse shadow-sm" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
            <p className="text-4xl mb-3">{filter === "upcoming" ? "🔔" : "✅"}</p>
            <p className="text-gray-400 text-sm mb-4">
              {filter === "upcoming" ? "リマインドはありません" : "完了済みはありません"}
            </p>
            {filter === "upcoming" && (
              <Link href={`/dogs/${dogId}/reminders/new`} className="text-amber-500 font-bold text-sm">
                ＋ リマインドを追加する
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const status = dueDateStatus(r.dueDate, r.isDone);
              return (
                <div key={r.id} className="bg-white rounded-2xl px-4 py-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleDone(r)}
                      className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${r.isDone ? "bg-green-500 border-green-500 text-white" : "border-gray-300"}`}>
                      {r.isDone && <span className="text-xs font-bold">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{r.type === "medication" ? "💊" : r.type === "vaccine" ? "💉" : "🏥"}</span>
                        <p className={`font-bold text-gray-800 truncate ${r.isDone ? "line-through text-gray-400" : ""}`}>{r.title}</p>
                      </div>
                      {r.note && <p className="text-xs text-gray-400 mt-1 ml-7">{r.note}</p>}
                      <div className="flex items-center gap-2 mt-2 ml-7">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${status.color} ${status.bg}`}>{status.label}</span>
                        <span className="text-xs text-gray-400">{r.dueDate}</span>
                        {r.recurring && <span className="text-xs text-blue-400">🔁 {r.intervalDays}日毎</span>}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(r.id)} className="text-gray-200 text-xl pl-2 active:text-red-400 transition-colors">×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
