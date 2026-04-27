"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { addLog } from "@/lib/firestore";
import { uploadPhoto } from "@/lib/storage";
import type { LogType } from "@/lib/types";

const LOG_TYPES: { value: LogType; label: string; emoji: string }[] = [
  { value: "weight", label: "体重", emoji: "⚖️" },
  { value: "note", label: "メモ", emoji: "📝" },
  { value: "medication", label: "投薬", emoji: "💊" },
  { value: "vaccine", label: "ワクチン", emoji: "💉" },
  { value: "vet_visit", label: "通院", emoji: "🏥" },
  { value: "photo", label: "写真", emoji: "📷" },
];

export default function NewLogPage() {
  const { dogId } = useParams<{ dogId: string }>();
  const { user } = useAuth();
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
    if (!user) return;
    setSubmitting(true);
    try {
      let photoURL: string | undefined;
      if (photoFile) {
        photoURL = await uploadPhoto(user.uid, dogId, photoFile);
      }
      await addLog(user.uid, dogId, {
        dogId,
        type,
        date,
        ...(type === "weight" && weight ? { weight: parseFloat(weight) } : {}),
        ...(note ? { note } : {}),
        ...(photoURL ? { photoURL } : {}),
      });
      router.replace(`/dogs/${dogId}/logs`);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 text-xl">
          ‹
        </button>
        <h1 className="text-xl font-bold text-gray-800">記録を追加</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">記録の種類</label>
          <div className="grid grid-cols-3 gap-2">
            {LOG_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex flex-col items-center py-3 rounded-2xl border-2 text-sm font-medium transition-colors ${
                  type === t.value
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-gray-200 bg-white text-gray-500"
                }`}
              >
                <span className="text-2xl mb-1">{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Weight input */}
        {type === "weight" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              体重 (kg) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0.0"
                required
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-2xl font-bold placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                kg
              </span>
            </div>
          </div>
        )}

        {/* Note */}
        {type !== "photo" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {type === "weight" ? "メモ（任意）" : "内容"}
              {type !== "weight" && <span className="text-red-500"> *</span>}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                type === "note"
                  ? "今日の様子を記録..."
                  : type === "medication"
                  ? "例：フィラリア予防薬を投与"
                  : type === "vaccine"
                  ? "例：狂犬病ワクチン接種"
                  : type === "vet_visit"
                  ? "例：定期健診。異常なし。"
                  : "メモ..."
              }
              required={type !== "weight"}
              rows={3}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>
        )}

        {/* Photo upload */}
        {(type === "photo" || type === "note" || type === "vet_visit") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              写真{type === "photo" ? <span className="text-red-500"> *</span> : "（任意）"}
            </label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center active:scale-98 transition-transform"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="preview" className="w-full max-h-48 object-cover rounded-xl" />
              ) : (
                <>
                  <span className="text-3xl mb-2">📷</span>
                  <p className="text-sm text-gray-400">タップして写真を選択</p>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || (type === "weight" && !weight) || (type === "photo" && !photoFile)}
          className="w-full bg-amber-500 text-white font-bold py-4 rounded-2xl shadow-sm disabled:opacity-50 active:scale-98 transition-all"
        >
          {submitting ? "保存中..." : "保存する"}
        </button>
      </form>
    </div>
  );
}
