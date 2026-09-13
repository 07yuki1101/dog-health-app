"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * アプリ全体で常に同じ4タブを表示する下部ナビゲーション。
 * 画面ごとにタブの中身が入れ替わると分かりにくい、というフィードバックを受けて、
 * 「ホーム / わんこ / 記録する / 設定」に統一した。
 * 犬プロフィール画面固有の導線（通院サマリー・リマインド・定期ケア・履歴）は
 * ここではなく、各画面内のボタン/カードで提供する。
 */
export function BottomNav({ dogId }: { dogId?: string }) {
  const pathname = usePathname();

  // 犬のプロフィール配下にいる時は「記録する」がその犬の記録フォームへ直行する。
  // それ以外（ホームや設定など）では、まず犬を選んでもらう一覧へ。
  const recordHref = dogId ? `/dogs/${dogId}/logs/new` : "/dogs";

  const items = [
    { key: "home", href: "/dashboard", label: "ホーム", icon: "🏠" },
    { key: "dogs", href: "/dogs", label: "わんこ", icon: "🐕" },
    { key: "record", href: recordHref, label: "記録する", icon: "📝" },
    { key: "settings", href: "/settings", label: "設定", icon: "⚙️" },
  ] as const;

  // 「記録する」の遷移先も /dogs/... 配下になるため、単純な前方一致だと
  // 「わんこ」タブと同時にアクティブになってしまう。優先順位をつけて1つに絞る。
  const activeKey = (() => {
    if (pathname === recordHref) return "record";
    if (pathname === "/dashboard") return "home";
    if (pathname.startsWith("/settings")) return "settings";
    if (pathname.startsWith("/dogs")) return "dogs";
    return null;
  })();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-black/5 safe-area-pb z-50">
      <div className="flex">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                active ? "text-brand" : "text-ink-faint"
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
