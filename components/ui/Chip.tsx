type ChipProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

/**
 * 選択式のタップチップ（体調チェック等のワンタップ選択に使用）。
 * 選択時はブランドカラーで塗りつぶし、非選択時は輪郭のみのニュートラルな見た目にする。
 */
export function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 rounded-2xl text-sm font-bold border-2 transition-colors active:scale-95 ${
        active
          ? "bg-brand border-brand text-white"
          : "border-cream text-ink-soft bg-cream"
      }`}
    >
      {label}
    </button>
  );
}

type TagTone = "attention" | "danger" | "success" | "neutral";

const TAG_TONE_CLASSES: Record<TagTone, string> = {
  attention: "bg-attention-soft text-attention",
  danger: "bg-danger-soft text-danger",
  success: "bg-success-soft text-success",
  neutral: "bg-cream text-ink-faint",
};

/**
 * 期限や状態を示す小さなラベル。色は attention / danger / success / neutral の
 * 4種類に絞り、旧デザインのような多色バッジの乱立を避ける。
 */
export function Tag({ label, tone = "neutral" }: { label: string; tone?: TagTone }) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${TAG_TONE_CLASSES[tone]}`}>
      {label}
    </span>
  );
}
