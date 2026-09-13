import Link from "next/link";
import type { ReactNode } from "react";

type Action = { label: string; href: string };

type SectionHeadingProps = {
  icon: string;
  title: string;
  action?: Action;
  trailing?: ReactNode;
};

/**
 * セクション見出し。
 * 旧デザインの「小さいピル型バッジ」を廃止し、アイコン＋テキストの
 * シンプルな見出しに統一する（ログイン画面の落ち着いたトーンに合わせる）。
 */
export function SectionHeading({ icon, title, action, trailing }: SectionHeadingProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">{icon}</span>
        <h2 className="text-[15px] font-bold text-ink tracking-tight">{title}</h2>
        {trailing}
      </div>
      {action && (
        <Link href={action.href} className="text-xs text-ink-faint font-semibold active:opacity-60">
          {action.label} →
        </Link>
      )}
    </div>
  );
}
