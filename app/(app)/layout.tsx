"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // dogId があればボトムナブをそのdog用に変える
  const dogIdMatch = pathname.match(/\/dogs\/([^/]+)/);
  const dogId = dogIdMatch?.[1];

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-4xl animate-pulse">🐾</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen pb-20">
      {children}
      <BottomNav dogId={dogId ?? undefined} />
    </div>
  );
}
