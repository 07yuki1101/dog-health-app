import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "success";
type Size = "md" | "sm";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-gradient-to-br from-brand-start to-brand-end text-white shadow-md shadow-amber-200",
  secondary: "bg-surface text-ink shadow-sm shadow-black/[0.03]",
  ghost: "bg-brand-soft text-brand",
  success: "bg-success text-white shadow-sm",
};

const SIZE_CLASSES: Record<Size, string> = {
  md: "py-3 px-5 text-sm",
  sm: "py-2 px-4 text-xs",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/**
 * 共通ボタン。角丸・余白・押下時のスケールアニメーションを統一する。
 */
export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-2xl font-bold active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    />
  );
}
