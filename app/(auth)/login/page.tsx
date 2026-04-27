"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { getFirebaseAuth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  async function handleGoogleLogin() {
    try {
      await signInWithPopup(getFirebaseAuth(), googleProvider);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-amber-50 px-6">
      <div className="text-center mb-10">
        <div className="text-7xl mb-4">🐾</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">わんこ健康手帳</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          薬・ワクチン・通院を忘れない
          <br />
          愛犬の健康記録アプリ
        </p>
      </div>

      <div className="w-full max-w-sm">
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl py-4 px-6 text-gray-700 font-medium shadow-sm hover:shadow-md active:scale-95 transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M19.6 10.23c0-.68-.06-1.36-.17-2H10v3.79h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 3-4.33 3-7.31z"
              fill="#4285F4"
            />
            <path
              d="M10 20c2.7 0 4.96-.9 6.62-2.43l-3.24-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.75-5.59-4.11H1.08v2.58A10 10 0 0 0 10 20z"
              fill="#34A853"
            />
            <path
              d="M4.41 11.92A6.01 6.01 0 0 1 4.1 10c0-.67.11-1.32.31-1.92V5.5H1.08A10 10 0 0 0 0 10c0 1.61.39 3.14 1.08 4.5l3.33-2.58z"
              fill="#FBBC05"
            />
            <path
              d="M10 3.97c1.47 0 2.79.51 3.83 1.5l2.87-2.87C14.95.99 12.69 0 10 0A10 10 0 0 0 1.08 5.5l3.33 2.58C5.2 5.72 7.4 3.97 10 3.97z"
              fill="#EA4335"
            />
          </svg>
          Googleでログイン
        </button>
      </div>

      <p className="mt-8 text-xs text-gray-400 text-center">
        ログインすることで利用規約に同意したものとみなします
      </p>
    </div>
  );
}
