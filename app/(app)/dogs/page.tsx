"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getDogs } from "@/lib/firestore";
import type { Dog } from "@/lib/types";

function calcAge(birthDate: string) {
  const birth = new Date(birthDate);
  const now = new Date();
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 12) return `${months}ヶ月`;
  const years = Math.floor(months / 12);
  return `${years}歳`;
}

export default function DogsPage() {
  const { user, familyId } = useAuth();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !familyId) return;
    getDogs(familyId).then((d) => {
      setDogs(d);
      setLoading(false);
    });
  }, [user, familyId]);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">わんこ一覧</h1>
        <Link
          href="/dogs/new"
          className="bg-amber-500 text-white text-sm font-medium px-4 py-2 rounded-full shadow-sm active:scale-95 transition-transform"
        >
          + 追加
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : dogs.length === 0 ? (
        <Link
          href="/dogs/new"
          className="flex flex-col items-center justify-center bg-white rounded-2xl p-12 shadow-sm border-2 border-dashed border-amber-200 active:scale-98 transition-transform"
        >
          <span className="text-5xl mb-4">🐕</span>
          <p className="text-amber-600 font-medium">最初のわんこを登録しましょう</p>
        </Link>
      ) : (
        <div className="space-y-3">
          {dogs.map((dog) => (
            <Link
              key={dog.id}
              href={`/dogs/${dog.id}`}
              className="flex items-center gap-4 bg-white rounded-2xl px-4 py-4 shadow-sm active:scale-98 transition-transform"
            >
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl overflow-hidden flex-shrink-0">
                {dog.photoURL ? (
                  <img src={dog.photoURL} alt={dog.name} className="w-full h-full object-cover" />
                ) : (
                  "🐕"
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-lg">{dog.name}</p>
                <p className="text-sm text-gray-500">{dog.breed}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {dog.gender === "male" ? "♂ オス" : "♀ メス"} ・ {calcAge(dog.birthDate)}
                </p>
              </div>
              <span className="text-gray-300 text-xl">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
