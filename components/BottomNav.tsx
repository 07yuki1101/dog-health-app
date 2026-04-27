"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "ホーム", icon: "🏠" },
  { href: "/dogs", label: "わんこ", icon: "🐕" },
];

export function BottomNav({ dogId }: { dogId?: string }) {
  const pathname = usePathname();

  const items = dogId
    ? [
        { href: "/dashboard", label: "ホーム", icon: "🏠" },
        { href: `/dogs/${dogId}`, label: "プロフィール", icon: "🐕" },
        { href: `/dogs/${dogId}/reminders`, label: "リマインド", icon: "🔔" },
        { href: `/dogs/${dogId}/logs`, label: "記録", icon: "📋" },
      ]
    : navItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb z-50">
      <div className="flex">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                active ? "text-amber-600" : "text-gray-500"
              }`}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
