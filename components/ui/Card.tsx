import type { ElementType, ReactNode } from "react";

type Padding = "sm" | "md" | "lg";

const PADDING_CLASSES: Record<Padding, string> = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

type CardProps = {
  children: ReactNode;
  className?: string;
  padding?: Padding;
  /** デフォルトは <div>。<Link> 等をカードそのものにしたい場合に指定する。 */
  as?: ElementType;
  [key: string]: unknown;
};

/**
 * デザイン土台の共通カード。
 * 白面 + 大きめの角丸 + やわらかい影 + ゆったりした余白を基本形とする。
 */
export function Card({ children, className = "", padding = "md", as, ...rest }: CardProps) {
  const Component = as ?? "div";
  return (
    <Component
      className={`bg-surface rounded-3xl shadow-sm shadow-black/[0.03] ${PADDING_CLASSES[padding]} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
}
