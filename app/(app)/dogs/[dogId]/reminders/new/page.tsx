"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { addReminder } from "@/lib/firestore";
import type { ReminderType } from "@/lib/types";
import { BackButton } from "@/components/ui/BackButton";
import { FieldLabel, TextInput } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";

const TYPES: { value: ReminderType; label: string; emoji: string }[] = [
  { value: "medication", label: "投薬",     emoji: "💊" },
  { value: "vaccine",    label: "ワクチン", emoji: "💉" },
  { value: "vet_visit",  label: "通院",     emoji: "🏥" },
];

export default function NewReminderPage() {
  const { dogId } = useParams<{ dogId: string }>();
  const { user, familyId } = useAuth();
  const router = useRouter();

  const [type, setType] = useState<ReminderType>("medication");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [recurring, setRecurring] = useState(false);
  const [intervalDays, setIntervalDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !familyId || !title || !dueDate) return;
    setSubmitting(true);
    try {
      await addReminder(familyId, dogId, {
        dogId, type, title,
        ...(note ? { note } : {}),
        dueDate, recurring,
        ...(recurring ? { intervalDays } : {}),
        isDone: false,
        createdBy: user.uid,
      });
      router.replace(`/dogs/${dogId}/reminders`);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto pb-28">

        {/* ── トップバー ── */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <BackButton onClick={() => router.back()} />
          <span className="text-lg font-black text-ink tracking-tight">リマインドを追加</span>
        </div>

        <form onSubmit={handleSubmit} className="px-5 space-y-4">
          {/* 種類 */}
          <div className="grid grid-cols-3 gap-3">
            {TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => setType(t.value)}
                className={`flex flex-col items-center py-4 rounded-2xl border-2 font-bold text-sm transition-colors ${
                  type === t.value
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-transparent bg-surface text-ink-faint shadow-sm shadow-black/[0.03]"
                }`}>
                <span className="text-2xl mb-1">{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>

          <FieldLabel label="タイトル" required>
            <TextInput type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={type === "medication" ? "例：フィラリア予防薬" : type === "vaccine" ? "例：混合ワクチン" : "例：定期健診"}
              required />
          </FieldLabel>

          <FieldLabel label="メモ">
            <TextInput type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="任意のメモ" />
          </FieldLabel>

          <FieldLabel label="予定日" required>
            <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </FieldLabel>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-ink">繰り返し</p>
                <p className="text-xs text-ink-faint">定期的なリマインドを設定</p>
              </div>
              <button type="button" onClick={() => setRecurring(!recurring)}
                className={`relative w-12 h-6 rounded-full transition-colors ${recurring ? "bg-brand" : "bg-cream"}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${recurring ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>
            {recurring && (
              <div className="mt-4">
                <label className="text-xs font-bold text-ink-soft mb-2 block">繰り返し間隔</label>
                <div className="flex gap-2 flex-wrap">
                  {[7, 14, 30, 90, 365].map((d) => (
                    <button key={d} type="button" onClick={() => setIntervalDays(d)}
                      className={`px-3 py-1.5 rounded-full text-sm font-bold border-2 transition-colors ${intervalDays === d ? "border-brand bg-brand-soft text-brand" : "border-transparent bg-cream text-ink-faint"}`}>
                      {d === 365 ? "1年" : d === 90 ? "3ヶ月" : d === 30 ? "1ヶ月" : `${d}日`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <button type="submit" disabled={submitting || !title || !dueDate}
            className="w-full bg-gradient-to-br from-brand-start to-brand-end text-white font-black py-4 rounded-2xl shadow-md shadow-amber-200 disabled:opacity-50 active:scale-[0.98] transition-all">
            {submitting ? "保存中..." : "保存する"}
          </button>
        </form>
      </div>
    </div>
  );
}
