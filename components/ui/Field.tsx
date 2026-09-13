import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

const FIELD_CLASSES =
  "w-full bg-cream border-2 border-transparent rounded-2xl px-4 py-3 text-ink placeholder-ink-faint focus:outline-none focus:border-brand-start/50 transition-colors";

type FieldLabelProps = {
  label: string;
  required?: boolean;
  children: ReactNode;
};

/**
 * フォーム項目のラベル＋入力欄をまとめるラッパー。
 * 新規登録・記録フォームで共通利用する。
 */
export function FieldLabel({ label, required, children }: FieldLabelProps) {
  return (
    <div>
      <label className="block text-sm font-bold text-ink-soft mb-1.5">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`${FIELD_CLASSES} ${className}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea {...rest} className={`${FIELD_CLASSES} resize-none ${className}`} />;
}
