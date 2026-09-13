"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { addDog } from "@/lib/firestore";
import { uploadDogPhoto } from "@/lib/storage";
import { BackButton } from "@/components/ui/BackButton";
import { FieldLabel, TextInput } from "@/components/ui/Field";

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
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto pb-28">

        {/* ── トップバー ── */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <BackButton onClick={() => router.back()} />
          <span className="text-lg font-black text-ink tracking-tight">わんこを登録</span>
        </div>

        <form onSubmit={handleSubmit} className="px-5 space-y-4">
          <div className="flex flex-col items-center mb-2">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-28 h-28 rounded-full bg-brand-soft flex items-center justify-center text-5xl overflow-hidden shadow-sm ring-4 ring-brand-soft active:scale-95 transition-transform">
              {photoPreview ? <img src={photoPreview} alt="preview" className="w-full h-full object-cover" /> : "📷"}
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 text-sm text-brand font-bold">写真を追加</button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          <FieldLabel label="名前" required>
            <TextInput type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：ポチ" required />
          </FieldLabel>

          <FieldLabel label="犬種">
            <TextInput type="text" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="例：柴犬" />
          </FieldLabel>

          <FieldLabel label="生年月日" required>
            <TextInput type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required max={new Date().toISOString().split("T")[0]} />
          </FieldLabel>

          <div>
            <p className="text-sm font-bold text-ink-soft mb-2">性別</p>
            <div className="flex gap-3">
              {(["male", "female"] as const).map((g) => (
                <button key={g} type="button" onClick={() => setGender(g)}
                  className={`flex-1 py-3 rounded-2xl border-2 font-bold text-sm transition-colors ${gender === g ? "border-brand bg-brand-soft text-brand" : "border-transparent bg-cream text-ink-faint"}`}>
                  {g === "male" ? "♂ オス" : "♀ メス"}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={submitting || !name || !birthDate}
            className="w-full bg-gradient-to-br from-brand-start to-brand-end text-white font-black py-4 rounded-2xl shadow-md shadow-amber-200 disabled:opacity-50 active:scale-[0.98] transition-all">
            {submitting ? "登録中..." : "登録する"}
          </button>
        </form>
      </div>
    </div>
  );
}
