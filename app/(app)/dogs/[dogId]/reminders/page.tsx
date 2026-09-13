"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getReminders, updateReminder, deleteReminder } from "@/lib/firestore";
import type { Reminder } from "@/lib/types";
import { BackButton } from "@/components/ui/BackButton";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Chip";

const today = new Date().toISOString().split("T")[0];

function dueDateStatus(dueDate: string, isDone: boolean): { label: string; tone: "attention" | "danger" | "success" | "neutral" } {
  if (isDone) return { label: "完了", tone: "success" };
  if (dueDate < today) return { label: "期限切れ", tone: "danger" };
  if (dueDate === today) return { label: "今日", tone: "danger" };
  const diff = Math.ceil((new Date(dueDate).getTime() - new Date(today).getTime()) / 86400000);
  if (diff <= 3) return { label: `${diff}日後`, tone: "attention" };
  return { label: `${diff}日後`, tone: "neutral" };
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
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto pb-28">

        {/* ── トップバー ── */}
        <div className="flex items-center justify-between px-5 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <BackButton href={`/dogs/${dogId}`} />
            <span className="text-lg font-black text-ink tracking-tight">リマインド</span>
          </div>
          <Link
            href={`/dogs/${dogId}/reminders/new`}
            className="bg-gradient-to-br from-brand-start to-brand-end text-white text-sm font-bold px-4 py-2 rounded-full shadow-md shadow-amber-200 active:scale-95 transition-transform"
          >
            ＋ 追加
          </Link>
        </div>

        <div className="px-5">
          <div className="flex bg-cream rounded-2xl p-1 mb-5">
            {(["upcoming", "done"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${filter === f ? "bg-surface text-ink shadow-sm" : "text-ink-faint"}`}>
                {f === "upcoming" ? "未完了" : "完了済み"}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-surface/60 rounded-2xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="text-center py-10">
              <p className="text-4xl mb-3">{filter === "upcoming" ? "🔔" : "✅"}</p>
              <p className="text-ink-faint text-sm mb-4">
                {filter === "upcoming" ? "リマインドはありません" : "完了済みはありません"}
              </p>
              {filter === "upcoming" && (
                <Link href={`/dogs/${dogId}/reminders/new`} className="text-brand font-bold text-sm">
                  ＋ リマインドを追加する
                </Link>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => {
                const status = dueDateStatus(r.dueDate, r.isDone);
                return (
                  <Card key={r.id} padding="sm">
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleDone(r)}
                        className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${r.isDone ? "bg-success border-success text-white" : "border-black/10"}`}>
                        {r.isDone && <span className="text-xs font-bold">✓</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{r.type === "medication" ? "💊" : r.type === "vaccine" ? "💉" : "🏥"}</span>
                          <p className={`font-bold text-ink truncate ${r.isDone ? "line-through text-ink-faint" : ""}`}>{r.title}</p>
                        </div>
                        {r.note && <p className="text-xs text-ink-faint mt-1 ml-7">{r.note}</p>}
                        <div className="flex items-center gap-2 mt-2 ml-7">
                          <Tag label={status.label} tone={status.tone} />
                          <span className="text-xs text-ink-faint">{r.dueDate}</span>
                          {r.recurring && <span className="text-xs text-ink-faint">🔁 {r.intervalDays}日毎</span>}
                        </div>
                      </div>
                      <button onClick={() => handleDelete(r.id)} className="text-ink-faint text-xl pl-2 active:text-danger transition-colors">×</button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
