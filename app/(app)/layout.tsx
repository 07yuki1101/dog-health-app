"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, familyId, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const dogIdMatch = pathname.match(/\/dogs\/([^/]+)/);
  const dogId = dogIdMatch?.[1];

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!familyId && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [user, familyId, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-4xl animate-pulse">🐾</div>
      </div>
    );
  }

  if (!user) return null;
  if (!familyId && pathname !== "/onboarding") return null;

  const showNav = pathname !== "/onboarding";

  return (
    <div className={`safe-area-pt ${showNav ? "min-h-screen pb-20" : "min-h-screen"}`}>
      {children}
      {showNav && <BottomNav dogId={dogId ?? undefined} />}
    </div>
  );
}
