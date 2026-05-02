"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getFamily } from "@/lib/firestore";
import type { Family } from "@/lib/types";

export default function FamilyPage() {
  const { user, familyId } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) return;
    getFamily(familyId).then((f) => {
      setFamily(f);
      setLoading(false);
    });
  }, [familyId]);

  async function copyCode() {
    if (!family) return;
    await navigator.clipboard.writeText(family.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-pulse">🐾</div>
      </div>
    );
  }

  const members = Object.entries(family?.memberInfo ?? {});

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">家族の管理</h1>

      {/* 招待コード */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-5">
        <p className="text-sm font-semibold text-gray-500 mb-3">招待コード</p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-4xl font-bold tracking-widest text-amber-600">
            {family?.inviteCode}
          </p>
          <button
            onClick={copyCode}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              copied
                ? "bg-green-100 text-green-600"
                : "bg-amber-100 text-amber-700 active:scale-95"
            }`}
          >
            {copied ? "コピー済み ✓" : "コピー"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          このコードを家族に共有してください。参加した人と犬の情報・記録を共有できます。
        </p>
      </section>

      {/* メンバー一覧 */}
      <section className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-500 mb-4">
          メンバー（{members.length}人）
        </p>
        <div className="space-y-3">
          {members.map(([uid, info]) => (
            <div key={uid} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-lg overflow-hidden flex-shrink-0">
                {info.photoURL ? (
                  <img src={info.photoURL} alt={info.displayName} className="w-full h-full object-cover" />
                ) : (
                  "👤"
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{info.displayName}</p>
                {uid === family?.createdBy && (
                  <p className="text-xs text-amber-500">作成者</p>
                )}
                {uid === user?.uid && uid !== family?.createdBy && (
                  <p className="text-xs text-gray-400">あなた</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
