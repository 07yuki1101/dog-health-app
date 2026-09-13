import Link from "next/link";

type BackButtonProps = {
  href?: string;
  onClick?: () => void;
};

const CLASSES =
  "w-9 h-9 rounded-full bg-surface shadow-sm flex items-center justify-center text-ink-soft text-lg active:scale-90 transition-transform flex-shrink-0";

/**
 * 画面上部の「戻る」丸ボタン。ダッシュボード／犬プロフィール画面で
 * 使われているスタイルを共通化したもの。
 */
export function BackButton({ href, onClick }: BackButtonProps) {
  if (href) {
    return (
      <Link href={href} className={CLASSES} aria-label="戻る">
        ‹
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={CLASSES} aria-label="戻る">
      ‹
    </button>
  );
}
