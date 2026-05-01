"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getDog, updateDog, deleteDog } from "@/lib/firestore";
import { uploadDogPhoto, deletePhotoByURL } from "@/lib/storage";
import type { Dog } from "@/lib/types";

export default function EditDogPage() {
  const { dogId } = useParams<{ dogId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");

  // 写真の状態: 既存URL / 新規ファイル / 削除済み
  const [currentPhotoURL, setCurrentPhotoURL] = useState<string | null>(null);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDog(user.uid, dogId).then((dog) => {
      if (!dog) { router.replace("/dogs"); return; }
      setName(dog.name);
      setBreed(dog.breed ?? "");
      setBirthDate(dog.birthDate);
      setGender(dog.gender);
      setCurrentPhotoURL(dog.photoURL ?? null);
      setLoading(false);
    });
  }, [user, dogId, router]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewPhotoFile(file);
    setNewPhotoPreview(URL.createObjectURL(file));
    setPhotoRemoved(false);
  }

  function handleRemovePhoto() {
    setPhotoRemoved(true);
    setNewPhotoFile(null);
    setNewPhotoPreview(null);
  }

  // 現在表示する写真プレビューを決定
  const displayPhoto = newPhotoPreview ?? (photoRemoved ? null : currentPhotoURL);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name || !birthDate) return;
    setSubmitting(true);
    try {
      const updates: Partial<Dog> = { name, breed, birthDate, gender };

      if (newPhotoFile) {
        // 既存写真を削除してから新しい写真をアップロード
        if (currentPhotoURL) await deletePhotoByURL(currentPhotoURL);
        updates.photoURL = await uploadDogPhoto(user.uid, dogId, newPhotoFile);
      } else if (photoRemoved && currentPhotoURL) {
        // 写真を削除（Storageからも削除）
        await deletePhotoByURL(currentPhotoURL);
        updates.photoURL = "";
      }

      await updateDog(user.uid, dogId, updates);
      router.replace(`/dogs/${dogId}`);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!user || !confirm(`このペットのデータをすべて削除しますか？\nリマインドや記録もすべて削除されます。`)) return;
    setDeleting(true);
    try {
      await deleteDog(user.uid, dogId);
      router.replace("/dogs");
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-pulse">🐾</div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 text-xl">
          ‹
        </button>
        <h1 className="text-xl font-bold text-gray-800">プロフィールを編集</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Photo */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center text-4xl overflow-hidden shadow-sm active:scale-95 transition-transform"
            >
              {displayPhoto ? (
                <img src={displayPhoto} alt="preview" className="w-full h-full object-cover" />
              ) : (
                "📷"
              )}
            </button>
            {/* 削除ボタン（写真がある場合のみ表示） */}
            {displayPhoto && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow-sm"
              >
                ×
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-sm text-amber-600 font-medium"
          >
            {displayPhoto ? "写真を変更" : "写真を追加"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            名前 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Breed */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">犬種</label>
          <input
            type="text"
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            placeholder="例：柴犬"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Birth date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            生年月日 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
            max={new Date().toISOString().split("T")[0]}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">性別</label>
          <div className="flex gap-3">
            {(["male", "female"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-colors ${
                  gender === g
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-gray-200 bg-white text-gray-500"
                }`}
              >
                {g === "male" ? "♂ オス" : "♀ メス"}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || deleting || !name || !birthDate}
          className="w-full bg-amber-500 text-white font-bold py-4 rounded-2xl shadow-sm disabled:opacity-50 active:scale-98 transition-all mt-2"
        >
          {submitting ? "保存中..." : "保存する"}
        </button>
      </form>

      {/* 削除ボタン */}
      <div className="mt-8 mb-10">
        <div className="border-t border-gray-100 pt-6">
          <p className="text-xs text-gray-400 mb-3 text-center">
            削除するとリマインドや記録もすべて消えます
          </p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || submitting}
            className="w-full border-2 border-red-200 text-red-500 font-medium py-3 rounded-2xl disabled:opacity-50 active:scale-98 transition-all"
          >
            {deleting ? "削除中..." : "このペットを削除する"}
          </button>
        </div>
      </div>
    </div>
  );
}
