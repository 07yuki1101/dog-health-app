"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { addLog } from "@/lib/firestore";
import { uploadPhoto } from "@/lib/storage";
import type { LogType } from "@/lib/types";
import { BackButton } from "@/components/ui/BackButton";
import { FieldLabel, TextInput, TextArea } from "@/components/ui/Field";

const LOG_TYPES: { value: LogType; label: string; emoji: string }[] = [
  { value: "weight",     label: "体重",     emoji: "⚖️" },
  { value: "note",       label: "メモ",     emoji: "📝" },
  { value: "medication", label: "投薬",     emoji: "💊" },
  { value: "vaccine",    label: "ワクチン", emoji: "💉" },
  { value: "vet_visit",  label: "通院",     emoji: "🏥" },
  { value: "photo",      label: "写真",     emoji: "📷" },
];

export default function NewLogPage() {
  const { dogId } = useParams<{ dogId: string }>();
  const { user, familyId } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<LogType>("weight");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !familyId) return;
    setSubmitting(true);
    try {
      let photoURL: string | undefined;
      if (photoFile) photoURL = await uploadPhoto(familyId, dogId, photoFile);
      await addLog(familyId, dogId, {
        dogId, type, date,
        ...(type === "weight" && weight ? { weight: parseFloat(weight) } : {}),
        ...(note ? { note } : {}),
        ...(photoURL ? { photoURL } : {}),
        createdBy: user.uid,
      });
      router.replace(`/dogs/${dogId}/logs`);
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
          <BackButton href={`/dogs/${dogId}`} />
          <span className="text-lg font-black text-ink tracking-tight">記録を追加</span>
        </div>

        <form onSubmit={handleSubmit} className="px-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {LOG_TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => setType(t.value)}
                className={`flex flex-col items-center py-3 rounded-2xl border-2 text-sm font-bold transition-colors ${
                  type === t.value
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-transparent bg-surface text-ink-faint shadow-sm shadow-black/[0.03]"
                }`}>
                <span className="text-2xl mb-1">{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>

          <FieldLabel label="日付">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().split("T")[0]} />
          </FieldLabel>

          {type === "weight" && (
            <FieldLabel label="体重 (kg)" required>
              <div className="relative">
                <TextInput type="number" step="0.1" min="0" max="100" value={weight} onChange={(e) => setWeight(e.target.value)}
                  placeholder="0.0" required
                  className="text-2xl font-black pr-12" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint font-bold">kg</span>
              </div>
            </FieldLabel>
          )}

          {type !== "photo" && (
            <FieldLabel label={type === "weight" ? "メモ（任意）" : "内容"} required={type !== "weight"}>
              <TextArea value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={type === "note" ? "今日の様子を記録..." : type === "medication" ? "例：フィラリア予防薬を投与" : type === "vaccine" ? "例：狂犬病ワクチン接種" : type === "vet_visit" ? "例：定期健診。異常なし。" : "メモ..."}
                required={type !== "weight"} rows={3} />
            </FieldLabel>
          )}

          {(type === "photo" || type === "note" || type === "vet_visit") && (
            <FieldLabel label="写真" required={type === "photo"}>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full bg-cream border-2 border-dashed border-brand-start/40 rounded-2xl p-6 flex flex-col items-center justify-center active:scale-[0.98] transition-transform">
                {photoPreview
                  ? <img src={photoPreview} alt="preview" className="w-full max-h-48 object-cover rounded-xl" />
                  : <><span className="text-4xl mb-2">📷</span><p className="text-sm text-ink-faint font-medium">タップして写真を選択</p></>}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </FieldLabel>
          )}

          <button type="submit" disabled={submitting || (type === "weight" && !weight) || (type === "photo" && !photoFile)}
            className="w-full bg-gradient-to-br from-brand-start to-brand-end text-white font-black py-4 rounded-2xl shadow-md shadow-amber-200 disabled:opacity-50 active:scale-[0.98] transition-all">
            {submitting ? "保存中..." : "保存する"}
          </button>
        </form>
      </div>
    </div>
  );
}
