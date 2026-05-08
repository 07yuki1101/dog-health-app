"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getDog, updateDog, deleteDog } from "@/lib/firestore";
import { uploadDogPhoto, deletePhotoByURL } from "@/lib/storage";
import type { Dog } from "@/lib/types";

export default function EditDogPage() {
  const { dogId } = useParams<{ dogId: string }>();
  const { user, familyId } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [currentPhotoURL, setCurrentPhotoURL] = useState<string | null>(null);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);

  useEffect(() => {
    if (!user || !familyId) return;
    getDog(familyId, dogId).then((dog) => {
      if (!dog) { router.replace("/dogs"); return; }
      setName(dog.name); setBreed(dog.breed ?? ""); setBirthDate(dog.birthDate); setGender(dog.gender);
      setCurrentPhotoURL(dog.photoURL ?? null); setLoading(false);
    });
  }, [user, familyId, dogId, router]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewPhotoFile(file); setNewPhotoPreview(URL.createObjectURL(file)); setPhotoRemoved(false);
  }

  const displayPhoto = newPhotoPreview ?? (photoRemoved ? null : currentPhotoURL);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !familyId || !name || !birthDate) return;
    setSubmitting(true);
    try {
      const updates: Partial<Dog> = { name, breed, birthDate, gender };
      if (newPhotoFile) {
        if (currentPhotoURL) await deletePhotoByURL(currentPhotoURL);
        updates.photoURL = await uploadDogPhoto(familyId, dogId, newPhotoFile);
      } else if (photoRemoved && currentPhotoURL) {
        await deletePhotoByURL(currentPhotoURL);
        updates.photoURL = "";
      }
      await updateDog(familyId, dogId, updates);
      router.replace(`/dogs/${dogId}`);
    } catch (err) { console.error(err); setSubmitting(false); }
  }

  async function handleDelete() {
    if (!user || !familyId || !confirm("このペットのデータをすべて削除しますか？\nリマインドや記録もすべて削除されます。")) return;
    setDeleting(true);
    try { await deleteDog(familyId, dogId); router.replace("/dogs"); }
    catch (err) { console.error(err); setDeleting(false); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-amber-50"><div className="text-5xl animate-pulse">🐾</div></div>;

  return (
    <div className="max-w-lg mx-auto pb-28">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 text-lg active:scale-90 transition-transform">
          ‹
        </button>
        <div className="flex items-center gap-1.5 bg-orange-100 text-orange-600 px-3 py-1.5 rounded-full">
          <span className="text-sm">✏️</span>
          <span className="text-sm font-black">プロフィールを編集</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 space-y-4">
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-28 h-28 rounded-full bg-amber-100 flex items-center justify-center text-5xl overflow-hidden ring-4 ring-amber-200 shadow-sm active:scale-95 transition-transform">
              {displayPhoto ? <img src={displayPhoto} alt="preview" className="w-full h-full object-cover" /> : "📷"}
            </button>
            {displayPhoto && (
              <button type="button" onClick={() => { setPhotoRemoved(true); setNewPhotoFile(null); setNewPhotoPreview(null); }}
                className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 text-white rounded-full text-sm flex items-center justify-center shadow-sm font-bold">
                ×
              </button>
            )}
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} className="text-sm text-amber-500 font-bold">
            {displayPhoto ? "写真を変更" : "写真を追加"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">名前 <span className="text-red-400">*</span></label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-800 focus:outline-none focus:border-amber-300" />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">犬種</label>
          <input type="text" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="例：柴犬"
            className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-800 placeholder-gray-300 focus:outline-none focus:border-amber-300" />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">生年月日 <span className="text-red-400">*</span></label>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required max={new Date().toISOString().split("T")[0]}
            className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-800 focus:outline-none focus:border-amber-300" />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-600 mb-2">性別</label>
          <div className="flex gap-3">
            {(["male", "female"] as const).map((g) => (
              <button key={g} type="button" onClick={() => setGender(g)}
                className={`flex-1 py-3 rounded-2xl border-2 font-bold text-sm transition-colors ${gender === g ? "border-amber-400 bg-amber-50 text-amber-700" : "border-gray-100 bg-white text-gray-400"}`}>
                {g === "male" ? "♂ オス" : "♀ メス"}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={submitting || deleting || !name || !birthDate}
          className="w-full bg-amber-500 text-white font-black py-4 rounded-2xl shadow-sm disabled:opacity-50 active:scale-98 transition-all">
          {submitting ? "保存中..." : "保存する"}
        </button>
      </form>

      <div className="px-4 mt-8">
        <div className="border-t border-gray-100 pt-6">
          <p className="text-xs text-gray-400 mb-3 text-center">削除するとリマインドや記録もすべて消えます</p>
          <button type="button" onClick={handleDelete} disabled={deleting || submitting}
            className="w-full border-2 border-red-200 text-red-400 font-bold py-3 rounded-2xl disabled:opacity-50 active:scale-98 transition-all">
            {deleting ? "削除中..." : "このペットを削除する"}
          </button>
        </div>
      </div>
    </div>
  );
}
