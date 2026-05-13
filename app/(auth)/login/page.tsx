"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithRedirect, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { getFirebaseAuth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

function isNativeApp() {
  return typeof window !== "undefined" && !!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
}

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  async function handleGoogleLogin() {
    setSigningIn(true);
    setError("");
    try {
      if (isNativeApp()) {
        // ネイティブ iOS: @capacitor-firebase/authentication で Google Sign-In
        const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
        const result = await FirebaseAuthentication.signInWithGoogle();
        const idToken = result.credential?.idToken;
        if (!idToken) throw new Error("Google Sign-In: idToken が取得できませんでした");
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(getFirebaseAuth(), credential);
      } else {
        // Web ブラウザ: 通常の redirect フロー
        await signInWithRedirect(getFirebaseAuth(), googleProvider);
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      console.error("[Login] error:", e.code, e.message, err);
      setError(e.code ?? e.message ?? "ログインに失敗しました");
      setSigningIn(false);
    }
  }

  if (loading || signingIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-amber-50">
        <div className="text-5xl animate-pulse mb-4">🐾</div>
        <p className="text-gray-400 text-sm font-medium">ログイン中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-amber-50 px-6 overflow-hidden relative">
      <div className="absolute top-10 left-6 text-6xl opacity-10 rotate-[-20deg] select-none">🐾</div>
      <div className="absolute top-32 right-4 text-4xl opacity-10 rotate-[15deg] select-none">🐾</div>
      <div className="absolute bottom-32 left-10 text-5xl opacity-10 rotate-[10deg] select-none">🐾</div>
      <div className="absolute bottom-16 right-8 text-3xl opacity-10 rotate-[-10deg] select-none">🐾</div>

      <div className="relative text-center mb-12">
        <div className="w-28 h-28 bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-200">
          <span className="text-6xl">🐾</span>
        </div>
        <h1 className="text-3xl font-black text-gray-800 mb-2">わんこ健康手帳</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          薬・ワクチン・通院を忘れない<br />愛犬の健康記録アプリ
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white rounded-2xl py-4 px-6 text-gray-700 font-bold shadow-md active:scale-95 transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M19.6 10.23c0-.68-.06-1.36-.17-2H10v3.79h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 3-4.33 3-7.31z" fill="#4285F4"/>
            <path d="M10 20c2.7 0 4.96-.9 6.62-2.43l-3.24-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.75-5.59-4.11H1.08v2.58A10 10 0 0 0 10 20z" fill="#34A853"/>
            <path d="M4.41 11.92A6.01 6.01 0 0 1 4.1 10c0-.67.11-1.32.31-1.92V5.5H1.08A10 10 0 0 0 0 10c0 1.61.39 3.14 1.08 4.5l3.33-2.58z" fill="#FBBC05"/>
            <path d="M10 3.97c1.47 0 2.79.51 3.83 1.5l2.87-2.87C14.95.99 12.69 0 10 0A10 10 0 0 0 1.08 5.5l3.33 2.58C5.2 5.72 7.4 3.97 10 3.97z" fill="#EA4335"/>
          </svg>
          Googleでログイン
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center">
            <p className="text-red-500 text-sm font-medium">{error}</p>
          </div>
        )}
      </div>

      <p className="mt-8 text-xs text-gray-400 text-center">
        ログインすることで利用規約に同意したものとみなします
      </p>
    </div>
  );
}
