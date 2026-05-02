"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createFamily, joinFamily } from "@/lib/firestore";

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!user) return;
    setSubmitting(true);
    try {
      await createFamily(
        user.uid,
        user.displayName ?? "ユーザー",
        user.photoURL ?? undefined
      );
      router.replace("/dashboard");
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!user || inviteCode.length !== 6) return;
    setSubmitting(true);
    setError("");
    try {
      const familyId = await joinFamily(
        user.uid,
        inviteCode,
        user.displayName ?? "ユーザー",
        user.photoURL ?? undefined
      );
      if (!familyId) {
        setError("招待コードが見つかりません。もう一度確認してください。");
        setSubmitting(false);
        return;
      }
      router.replace("/dashboard");
    } catch (err) {
      console.error(err);
      setError("エラーが発生しました。もう一度お試しください。");
      setSubmitting(false);
    }
  }

  if (mode === "select") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-amber-50 px-6">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🐾</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">ようこそ！</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            家族を作るか、招待コードで参加しましょう
          </p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => setMode("create")}
            className="w-full bg-amber-500 text-white font-bold py-4 rounded-2xl shadow-sm active:scale-95 transition-transform"
          >
            🏠 家族を新しく作る
          </button>
          <button
            onClick={() => setMode("join")}
            className="w-full bg-white border-2 border-amber-300 text-amber-700 font-bold py-4 rounded-2xl active:scale-95 transition-transform"
          >
            🔑 招待コードで参加する
          </button>
        </div>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-amber-50 px-6">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏠</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">家族を作る</h1>
          <p className="text-sm text-gray-500">
            招待コードが発行されます
            <br />
            家族に共有して一緒に管理できます
          </p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="w-full bg-amber-500 text-white font-bold py-4 rounded-2xl shadow-sm disabled:opacity-50 active:scale-95 transition-transform"
          >
            {submitting ? "作成中..." : "家族を作成する"}
          </button>
          <button
            onClick={() => setMode("select")}
            className="w-full text-gray-400 py-2 text-sm"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-amber-50 px-6">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🔑</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">招待コードで参加</h1>
        <p className="text-sm text-gray-500">家族から共有された6桁のコードを入力</p>
      </div>

      <form onSubmit={handleJoin} className="w-full max-w-sm space-y-4">
        <input
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="例：ABC123"
          maxLength={6}
          className="w-full bg-white border-2 border-gray-200 rounded-2xl px-4 py-4 text-center text-2xl font-bold tracking-widest text-gray-800 focus:outline-none focus:border-amber-400 uppercase"
        />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <button
          type="submit"
          disabled={submitting || inviteCode.length !== 6}
          className="w-full bg-amber-500 text-white font-bold py-4 rounded-2xl shadow-sm disabled:opacity-50 active:scale-95 transition-transform"
        >
          {submitting ? "参加中..." : "参加する"}
        </button>
        <button
          type="button"
          onClick={() => setMode("select")}
          className="w-full text-gray-400 py-2 text-sm"
        >
          戻る
        </button>
      </form>
    </div>
  );
}
