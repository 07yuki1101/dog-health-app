"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { subscribeUserDoc } from "@/lib/firestore";

interface AuthContextValue {
  user: User | null;
  familyId: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, familyId: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUser: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u);
      if (unsubscribeUser) unsubscribeUser();

      if (u) {
        unsubscribeUser = subscribeUserDoc(u.uid, (userDoc) => {
          setFamilyId(userDoc?.familyId ?? null);
          setLoading(false);
        });
      } else {
        setFamilyId(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
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
