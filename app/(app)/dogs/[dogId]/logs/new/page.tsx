"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { addLog } from "@/lib/firestore";
import { uploadPhoto } from "@/lib/storage";
import type { LogType } from "@/lib/types";

const LOG_TYPES: { value: LogType; label: string; emoji: string; color: string }[] = [
  { value: "weight",    label: "体重",   emoji: "⚖️", color: "bg-amber-100 border-amber-300 text-amber-700" },
  { value: "note",      label: "メモ",   emoji: "📝", color: "bg-green-100 border-green-300 text-green-700" },
  { value: "medication",label: "投薬",   emoji: "💊", color: "bg-pink-100 border-pink-300 text-pink-700" },
  { value: "vaccine",   label: "ワクチン",emoji: "💉", color: "bg-sky-100 border-sky-300 text-sky-700" },
  { value: "vet_visit", label: "通院",   emoji: "🏥", color: "bg-violet-100 border-violet-300 text-violet-700" },
  { value: "photo",     label: "写真",   emoji: "📷", color: "bg-orange-100 border-orange-300 text-orange-700" },
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
    <div className="max-w-lg mx-auto pb-28">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 text-lg active:scale-90 transition-transform">
          ‹
        </button>
        <div className="flex items-center gap-1.5 bg-green-100 text-green-600 px-3 py-1.5 rounded-full">
          <span className="text-sm">📝</span>
          <span className="text-sm font-black">記録を追加</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {LOG_TYPES.map((t) => (
            <button key={t.value} type="button" onClick={() => setType(t.value)}
              className={`flex flex-col items-center py-3 rounded-2xl border-2 text-sm font-bold transition-colors ${type === t.value ? t.color : "border-gray-100 bg-white text-gray-400"}`}>
              <span className="text-2xl mb-1">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">日付</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().split("T")[0]}
            className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-800 focus:outline-none focus:border-amber-300" />
        </div>

        {type === "weight" && (
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1.5">体重 (kg) <span className="text-red-400">*</span></label>
            <div className="relative">
              <input type="number" step="0.1" min="0" max="100" value={weight} onChange={(e) => setWeight(e.target.value)}
                placeholder="0.0" required
                className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-800 text-2xl font-black placeholder-gray-200 focus:outline-none focus:border-amber-300" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">kg</span>
            </div>
          </div>
        )}

        {type !== "photo" && (
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1.5">
              {type === "weight" ? "メモ（任意）" : "内容"}
              {type !== "weight" && <span className="text-red-400"> *</span>}
            </label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={type === "note" ? "今日の様子を記録..." : type === "medication" ? "例：フィラリア予防薬を投与" : type === "vaccine" ? "例：狂犬病ワクチン接種" : type === "vet_visit" ? "例：定期健診。異常なし。" : "メモ..."}
              required={type !== "weight"} rows={3}
              className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-800 placeholder-gray-300 focus:outline-none focus:border-amber-300 resize-none" />
          </div>
        )}

        {(type === "photo" || type === "note" || type === "vet_visit") && (
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1.5">
              写真{type === "photo" && <span className="text-red-400"> *</span>}
            </label>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center active:scale-98 transition-transform">
              {photoPreview
                ? <img src={photoPreview} alt="preview" className="w-full max-h-48 object-cover rounded-xl" />
                : <><span className="text-4xl mb-2">📷</span><p className="text-sm text-gray-400 font-medium">タップして写真を選択</p></>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
        )}

        <button type="submit" disabled={submitting || (type === "weight" && !weight) || (type === "photo" && !photoFile)}
          className="w-full bg-amber-500 text-white font-black py-4 rounded-2xl shadow-sm disabled:opacity-50 active:scale-98 transition-all">
          {submitting ? "保存中..." : "保存する"}
        </button>
      </form>
    </div>
  );
}
