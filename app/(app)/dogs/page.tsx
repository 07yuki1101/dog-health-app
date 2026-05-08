"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getDogs } from "@/lib/firestore";
import type { Dog } from "@/lib/types";

const DOG_COLORS = [
  "from-amber-300 to-orange-400",
  "from-pink-300 to-rose-400",
  "from-violet-300 to-purple-400",
  "from-teal-300 to-emerald-400",
  "from-sky-300 to-blue-400",
];

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
    <div className="max-w-lg mx-auto pb-28">
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐕</span>
          <h1 className="text-xl font-black text-gray-800">わんこ一覧</h1>
        </div>
        <Link
          href="/dogs/new"
          className="bg-amber-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-sm active:scale-95 transition-transform"
        >
          ＋ 追加
        </Link>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-3xl animate-pulse shadow-sm" />
            ))}
          </div>
        ) : dogs.length === 0 ? (
          <Link
            href="/dogs/new"
            className="flex flex-col items-center justify-center bg-white rounded-3xl p-12 shadow-sm border-2 border-dashed border-amber-200 active:scale-98 transition-transform"
          >
            <span className="text-5xl mb-4">🐕</span>
            <p className="text-amber-500 font-bold">最初のわんこを登録しましょう</p>
          </Link>
        ) : (
          <div className="space-y-3">
            {dogs.map((dog, i) => (
              <Link
                key={dog.id}
                href={`/dogs/${dog.id}`}
                className="flex items-center gap-4 bg-white rounded-3xl shadow-sm overflow-hidden active:scale-98 transition-transform"
              >
                <div className={`bg-gradient-to-br ${DOG_COLORS[i % DOG_COLORS.length]} w-20 self-stretch flex items-center justify-center flex-shrink-0`}>
                  {dog.photoURL
                    ? <img src={dog.photoURL} alt={dog.name} className="w-full h-full object-cover" />
                    : <span className="text-4xl">🐕</span>}
                </div>
                <div className="flex-1 py-4">
                  <p className="font-black text-gray-800 text-lg">{dog.name}</p>
                  <p className="text-sm text-gray-500">{dog.breed}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {dog.gender === "male" ? "♂ オス" : "♀ メス"} · {calcAge(dog.birthDate)}
                  </p>
                </div>
                <span className="text-gray-300 text-2xl pr-4">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
