"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, getRedirectResult, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { subscribeUserDoc } from "@/lib/firestore";

interface AuthContextValue {
  user: User | null;
  familyId: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, familyId: null, loading: true });

async function checkRedirectResult() {
  try {
    await getRedirectResult(getFirebaseAuth());
  } catch (err) {
    console.error("[Auth] getRedirectResult:", err);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    let unsubscribeUser: (() => void) | undefined;
    let redirectDone = false;
    let pendingLoadingFalse = false;

    // リダイレクト結果を確認してから loading を確定させる
    checkRedirectResult().finally(() => {
      redirectDone = true;
      if (pendingLoadingFalse) setLoading(false);
    });

    // Capacitor: アプリがフォアグラウンドに戻ったとき再チェック
    // @capacitor/browser が入っていれば Firebase が自動でリダイレクト結果を処理する
    let removeAppListener: (() => void) | undefined;
    import("@capacitor/app")
      .then(({ App }) => {
        App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) checkRedirectResult();
        }).then((handle) => {
          removeAppListener = () => handle.remove();
        });
      })
      .catch(() => {
        // ブラウザ環境では @capacitor/app が動かなくても問題なし
      });

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (unsubscribeUser) unsubscribeUser();

      if (u) {
        // ログイン済み：familyId が取れてから loading を落とす
        unsubscribeUser = subscribeUserDoc(u.uid, (userDoc) => {
          setFamilyId(userDoc?.familyId ?? null);
          setLoading(false);
        });
      } else {
        // 未ログイン：リダイレクト確認が終わってから loading を落とす
        setFamilyId(null);
        if (redirectDone) {
          setLoading(false);
        } else {
          pendingLoadingFalse = true;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
      removeAppListener?.();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, familyId, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
