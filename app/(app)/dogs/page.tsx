"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getDogs } from "@/lib/firestore";
import type { Dog } from "@/lib/types";
import { Card } from "@/components/ui/Card";

function calcAge(birthDate: string) {
  const birth = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 12) return `${months}ヶ月`;
  return `${Math.floor(months / 12)}歳`;
}

export default function DogsPage() {
  const { user, familyId } = useAuth();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !familyId) return;
    getDogs(familyId).then((d) => { setDogs(d); setLoading(false); });
  }, [user, familyId]);

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto pb-28">

        {/* ── トップバー ── */}
        <div className="flex items-center justify-between px-5 pt-6 pb-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐕</span>
            <span className="text-lg font-black text-ink tracking-tight">わんこ一覧</span>
          </div>
          <Link
            href="/dogs/new"
            className="bg-gradient-to-br from-brand-start to-brand-end text-white text-sm font-bold px-4 py-2 rounded-full shadow-md shadow-amber-200 active:scale-95 transition-transform"
          >
            ＋ 追加
          </Link>
        </div>

        <div className="px-5">
          {loading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-24 bg-surface/60 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : dogs.length === 0 ? (
            <Link
              href="/dogs/new"
              className="flex flex-col items-center justify-center bg-surface rounded-3xl p-12 shadow-sm border-2 border-dashed border-brand-start/40 active:scale-[0.98] transition-transform"
            >
              <span className="text-5xl mb-4">🐕</span>
              <p className="text-brand font-bold">最初のわんこを登録しましょう</p>
            </Link>
          ) : (
            <div className="space-y-3">
              {dogs.map((dog) => (
                <Card
                  key={dog.id}
                  as={Link}
                  href={`/dogs/${dog.id}`}
                  padding="sm"
                  className="flex items-center gap-4 active:scale-[0.98] transition-transform"
                >
                  <div className="w-16 h-16 rounded-full bg-brand-soft flex items-center justify-center text-3xl overflow-hidden flex-shrink-0 ring-4 ring-brand-soft">
                    {dog.photoURL
                      ? <img src={dog.photoURL} alt={dog.name} className="w-full h-full object-cover" />
                      : "🐕"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-ink text-lg truncate">{dog.name}</p>
                    {dog.breed && <p className="text-sm text-ink-soft truncate">{dog.breed}</p>}
                    <p className="text-xs text-ink-faint mt-0.5">
                      {dog.gender === "male" ? "♂ オス" : "♀ メス"} · {calcAge(dog.birthDate)}
                    </p>
                  </div>
                  <span className="text-ink-faint text-2xl flex-shrink-0">›</span>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
