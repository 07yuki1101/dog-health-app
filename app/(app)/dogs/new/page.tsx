"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { addDog } from "@/lib/firestore";
import { uploadDogPhoto } from "@/lib/storage";

export default function NewDogPage() {
  const { user, familyId } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
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
    if (!user || !familyId || !name || !birthDate) return;
    setSubmitting(true);
    try {
      const docRef = await addDog(familyId, { familyId, name, breed, birthDate, gender, createdBy: user.uid });
      if (photoFile) {
        const photoURL = await uploadDogPhoto(familyId, docRef.id, photoFile);
        const { updateDog } = await import("@/lib/firestore");
        await updateDog(familyId, docRef.id, { photoURL });
      }
      router.replace(`/dogs/${docRef.id}`);
    } catch (err) { console.error(err); setSubmitting(false); }
  }

  return (
    <div className="max-w-lg mx-auto pb-28">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 text-lg active:scale-90 transition-transform">
          ‹
        </button>
        <div className="flex items-center gap-1.5 bg-orange-100 text-orange-600 px-3 py-1.5 rounded-full">
          <span className="text-sm">🐕</span>
          <span className="text-sm font-black">わんこを登録</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 space-y-4">
        <div className="flex flex-col items-center">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-28 h-28 rounded-full bg-amber-100 flex items-center justify-center text-5xl overflow-hidden shadow-sm ring-4 ring-amber-200 active:scale-95 transition-transform">
            {photoPreview ? <img src={photoPreview} alt="preview" className="w-full h-full object-cover" /> : "📷"}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 text-sm text-amber-500 font-bold">写真を追加</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1.5">名前 <span className="text-red-400">*</span></label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：ポチ" required
            className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-800 placeholder-gray-300 focus:outline-none focus:border-amber-300" />
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

        <button type="submit" disabled={submitting || !name || !birthDate}
          className="w-full bg-amber-500 text-white font-black py-4 rounded-2xl shadow-sm disabled:opacity-50 active:scale-98 transition-all">
          {submitting ? "登録中..." : "登録する"}
        </button>
      </form>
    </div>
  );
}
