"use client";

/**
 * ⚠️ 開発確認用プレビュー（本番には含めない）
 *
 * ログイン導線（Google Sign-In）が現在ローカル環境で404になる不具合があり、
 * ログインなしで「通院サマリー画面」と「3タップの体調チェック」の見た目だけを
 * 確認するための一時ページ。
 *
 * - useAuth() / Firestore への実アクセスは一切行わない（すべてハードコードされたモックデータ）
 * - 3タップ体調チェックの保存はモック（console.log のみ、実際の書き込みはしない）
 * - 確認が終わったら削除して問題ない一時ファイル
 */

import { useMemo, useState } from "react";
import type { Timestamp } from "firebase/firestore";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  Dog,
  HealthLog,
  Reminder,
  DailyHealthCheck,
  MealAmountEaten,
  EliminationStatus,
} from "@/lib/types";
import { REMINDER_LABELS, LOG_LABELS } from "@/lib/types";

// ─────────────────────────────────────────────
// 定数（実装済みの通院サマリー画面と揃える）
// ─────────────────────────────────────────────
const ENERGY_ICON: Record<number, string> = { 1: "😪", 2: "😐", 3: "🙂", 4: "😃", 5: "🤩" };
const TREND_DAYS = 14;
const WEIGHT_RANGES = [
  { label: "1ヶ月", days: 30 },
  { label: "3ヶ月", days: 90 },
  { label: "全期間", days: Infinity },
] as const;

function getTodayJST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function daysAgoJST(days: number): string {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function calcAge(birthDate: string) {
  const birth = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 12) return `${months}ヶ月`;
  return `${Math.floor(months / 12)}歳${months % 12 > 0 ? `${months % 12}ヶ月` : ""}`;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}（${"日月火水木金土"[d.getDay()]}）`;
}

// ダミーの Timestamp（画面には表示しないため中身は使わない）
const MOCK_TIMESTAMP = {} as Timestamp;

// ─────────────────────────────────────────────
// モックデータ
// ─────────────────────────────────────────────
const MOCK_DOG: Dog = {
  id: "mock-dog-1",
  familyId: "mock-family",
  name: "ラニ",
  breed: "ポメラニアン×ビション",
  birthDate: "2022-04-10",
  gender: "female",
  photoURL: undefined,
  createdBy: "mock-user",
  createdAt: MOCK_TIMESTAMP,
};

// 直近14日分の体調チェック（3タップ版）。あえて食欲低下・排泄なしの日を混ぜてある。
const APPETITE_SEQUENCE: (MealAmountEaten | "")[] = [
  "完食", "完食", "半分", "完食", "完食", "少し", "完食",
  "完食", "半分", "完食", "食べてない", "完食", "完食", "完食",
];
const ELIMINATION_SEQUENCE: (EliminationStatus | "")[] = [
  "あり", "あり", "あり", "あり", "なし", "あり", "あり",
  "あり", "あり", "あり", "あり", "なし", "あり", "あり",
];
const ENERGY_SEQUENCE = [4, 4, 3, 4, 5, 2, 4, 4, 3, 4, 2, 4, 5, 4];
const MEMO_BY_INDEX: Record<number, string> = {
  4: "散歩中に少し元気いっぱいだった",
  5: "朝ごはん残しがち、様子見",
  10: "夕方から元気なく、食欲もなかった",
};

const MOCK_CHECKS: (DailyHealthCheck & { date: string })[] = Array.from({ length: TREND_DAYS }).map((_, i) => ({
  date: daysAgoJST(i),
  energy: ENERGY_SEQUENCE[i] ?? 3,
  appetite: APPETITE_SEQUENCE[i] ?? "完食",
  elimination: ELIMINATION_SEQUENCE[i] ?? "あり",
  memo: MEMO_BY_INDEX[i] ?? "",
  updatedAt: MOCK_TIMESTAMP,
}));

// 直近3ヶ月分の体重ログ（週1回・緩やかな増減）
const WEIGHT_BASE = 4.3;
const MOCK_WEIGHT_LOGS: HealthLog[] = Array.from({ length: 13 }).map((_, i) => {
  const daysAgo = i * 7;
  const wobble = Math.sin(i / 2) * 0.15 - i * 0.01;
  return {
    id: `mock-weight-${i}`,
    dogId: MOCK_DOG.id,
    type: "weight",
    date: daysAgoJST(daysAgo),
    weight: Math.round((WEIGHT_BASE + wobble) * 10) / 10,
    createdBy: "mock-user",
    createdAt: MOCK_TIMESTAMP,
  };
});

// 投薬・通院メモ（記録済み + 予定）
const MOCK_CARE_LOGS: HealthLog[] = [
  {
    id: "mock-care-1",
    dogId: MOCK_DOG.id,
    type: "vet_visit",
    date: daysAgoJST(9),
    note: "皮膚のかゆみで受診。アレルギー用のシャンプーを処方してもらった。",
    createdBy: "mock-user",
    createdAt: MOCK_TIMESTAMP,
  },
  {
    id: "mock-care-2",
    dogId: MOCK_DOG.id,
    type: "medication",
    date: daysAgoJST(9),
    note: "抗炎症薬を朝晩1錠ずつ、5日間",
    createdBy: "mock-user",
    createdAt: MOCK_TIMESTAMP,
  },
  {
    id: "mock-care-3",
    dogId: MOCK_DOG.id,
    type: "vaccine",
    date: daysAgoJST(60),
    note: "混合ワクチン接種。特に副反応なし。",
    createdBy: "mock-user",
    createdAt: MOCK_TIMESTAMP,
  },
];

const MOCK_REMINDERS: Reminder[] = [
  {
    id: "mock-reminder-1",
    dogId: MOCK_DOG.id,
    type: "vet_visit",
    title: "皮膚炎の経過観察で再診",
    note: "前回処方のシャンプーの効果を確認する",
    dueDate: daysAgoJST(-5), // 5日後
    recurring: false,
    isDone: false,
    createdBy: "mock-user",
    createdAt: MOCK_TIMESTAMP,
  },
  {
    id: "mock-reminder-2",
    dogId: MOCK_DOG.id,
    type: "medication",
    title: "フィラリア予防薬",
    dueDate: daysAgoJST(-12), // 12日後
    recurring: true,
    intervalDays: 30,
    isDone: false,
    createdBy: "mock-user",
    createdAt: MOCK_TIMESTAMP,
  },
];

// ─────────────────────────────────────────────
// 通院サマリー（実装済み画面と同じUI構成。モックデータを表示するだけ）
// 実体: app/(app)/dogs/[dogId]/summary/page.tsx から移植
// ─────────────────────────────────────────────
function MockSummarySection() {
  const [weightRangeIdx, setWeightRangeIdx] = useState(1); // デフォルト: 3ヶ月

  const recentChecks = useMemo(() => {
    const cutoff = daysAgoJST(TREND_DAYS);
    return MOCK_CHECKS.filter((c) => c.date >= cutoff).sort((a, b) => b.date.localeCompare(a.date));
  }, []);

  const energyValues = recentChecks.map((c) => c.energy).filter((n) => n > 0);
  const avgEnergy = energyValues.length > 0 ? energyValues.reduce((a, b) => a + b, 0) / energyValues.length : null;
  const lowAppetiteDays = recentChecks.filter((c) => c.appetite === "少し" || c.appetite === "食べてない").length;
  const eliminationConcernDays = recentChecks.filter((c) => c.elimination === "なし").length;

  const weightRange = WEIGHT_RANGES[weightRangeIdx];
  const weightChartData = useMemo(() => {
    const cutoff = Number.isFinite(weightRange.days) ? daysAgoJST(weightRange.days) : "0000-00-00";
    return MOCK_WEIGHT_LOGS
      .filter((l) => l.type === "weight" && typeof l.weight === "number" && l.date >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((l) => ({ date: l.date, weight: l.weight as number }));
  }, [weightRange]);

  const latestWeight = MOCK_WEIGHT_LOGS.find((l) => l.type === "weight")?.weight;

  const activeCareItems = MOCK_REMINDERS
    .filter((r) => !r.isDone && (r.type === "medication" || r.type === "vaccine" || r.type === "vet_visit"))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const recentCareLogs = MOCK_CARE_LOGS
    .filter((l) => l.type === "medication" || l.type === "vet_visit" || l.type === "vaccine")
    .slice(0, 8);

  const today = getTodayJST();

  return (
    <div className="px-4 space-y-5">
      {/* ── 基本情報 ── */}
      <div className="bg-white rounded-3xl p-5 shadow-sm flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl overflow-hidden flex-shrink-0 ring-4 ring-amber-100">
          🐕
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-gray-800">{MOCK_DOG.name}</h1>
          <div className="flex flex-wrap gap-x-2 mt-0.5 text-gray-500 text-xs">
            {MOCK_DOG.breed && <span>{MOCK_DOG.breed}</span>}
            <span>·</span>
            <span>{MOCK_DOG.gender === "male" ? "♂ オス" : "♀ メス"}</span>
            <span>·</span>
            <span>{calcAge(MOCK_DOG.birthDate)}</span>
            {latestWeight && <><span>·</span><span>⚖️ {latestWeight}kg</span></>}
          </div>
          <p className="text-[10px] text-gray-300 mt-1">{today} 時点</p>
        </div>
      </div>

      {/* ── 体調の傾向（直近14日間） ── */}
      <section>
        <div className="flex items-center gap-1.5 bg-green-100 text-green-600 px-3 py-1.5 rounded-full mb-3 self-start">
          <span className="text-sm">📈</span>
          <span className="text-xs font-black">体調の傾向（直近{TREND_DAYS}日間）</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
            <p className="text-2xl">{avgEnergy ? ENERGY_ICON[Math.round(avgEnergy)] : "－"}</p>
            <p className="text-[10px] text-gray-400 mt-1">平均元気度</p>
            <p className="text-xs font-bold text-gray-600">{avgEnergy ? avgEnergy.toFixed(1) : "記録なし"}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
            <p className="text-2xl">{lowAppetiteDays > 0 ? "⚠️" : "✅"}</p>
            <p className="text-[10px] text-gray-400 mt-1">食欲低下</p>
            <p className="text-xs font-bold text-gray-600">{lowAppetiteDays}日</p>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
            <p className="text-2xl">{eliminationConcernDays > 0 ? "⚠️" : "✅"}</p>
            <p className="text-[10px] text-gray-400 mt-1">排泄なし</p>
            <p className="text-xs font-bold text-gray-600">{eliminationConcernDays}日</p>
          </div>
        </div>

        {recentChecks.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <p className="text-gray-400 text-sm">直近{TREND_DAYS}日間の体調チェック記録がありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-50">
                    <th className="text-left font-bold py-2 pl-4 pr-2 whitespace-nowrap">日付</th>
                    <th className="text-center font-bold py-2 px-2">元気</th>
                    <th className="text-center font-bold py-2 px-2">食欲</th>
                    <th className="text-center font-bold py-2 px-2">排泄</th>
                    <th className="text-left font-bold py-2 pr-4 pl-2">メモ</th>
                  </tr>
                </thead>
                <tbody>
                  {recentChecks.map((c) => (
                    <tr key={c.date} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pl-4 pr-2 whitespace-nowrap text-gray-600">{formatShortDate(c.date)}</td>
                      <td className="py-2 px-2 text-center">{c.energy > 0 ? ENERGY_ICON[c.energy] : "－"}</td>
                      <td className="py-2 px-2 text-center text-gray-600">{c.appetite || "－"}</td>
                      <td className={`py-2 px-2 text-center ${c.elimination === "なし" ? "text-red-500 font-bold" : "text-gray-600"}`}>{c.elimination || "－"}</td>
                      <td className="py-2 pr-4 pl-2 text-gray-400 max-w-[120px] truncate">{c.memo || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── 体重推移 ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 bg-amber-100 text-amber-600 px-3 py-1.5 rounded-full">
            <span className="text-sm">⚖️</span>
            <span className="text-xs font-black">体重推移</span>
          </div>
          <div className="flex bg-gray-100 rounded-full p-0.5">
            {WEIGHT_RANGES.map((r, i) => (
              <button
                key={r.label}
                onClick={() => setWeightRangeIdx(i)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${weightRangeIdx === i ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 shadow-sm">
          {weightChartData.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-gray-400 text-sm">体重の記録がありません</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weightChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickFormatter={(value: string) => {
                    const d = new Date(value + "T00:00:00");
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tickFormatter={(v: number) => `${Math.round(v * 10) / 10}`}
                />
                <Tooltip
                  contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#f9fafb" }}
                  formatter={(value) => [`${value} kg`, "体重"]}
                />
                <Line type="monotone" dataKey="weight" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b" }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ── 投薬・通院メモ ── */}
      <section>
        <div className="flex items-center gap-1.5 bg-violet-100 text-violet-600 px-3 py-1.5 rounded-full mb-3 self-start">
          <span className="text-sm">💊</span>
          <span className="text-xs font-black">投薬・通院メモ</span>
        </div>

        {activeCareItems.length === 0 && recentCareLogs.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <p className="text-gray-400 text-sm">投薬・通院の記録がありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeCareItems.map((r) => (
              <div key={r.id} className="flex items-start gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm">
                <span className="text-xl mt-0.5">{r.type === "medication" ? "💊" : r.type === "vaccine" ? "💉" : "🏥"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black text-gray-400 uppercase">{REMINDER_LABELS[r.type]}（予定）</p>
                  </div>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{r.title}</p>
                  {r.note && <p className="text-xs text-gray-500 mt-0.5">{r.note}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{r.dueDate}</p>
                </div>
              </div>
            ))}
            {recentCareLogs.map((l) => (
              <div key={l.id} className="flex items-start gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm">
                <span className="text-xl mt-0.5">{l.type === "medication" ? "💊" : l.type === "vaccine" ? "💉" : "🏥"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-gray-400 uppercase">{LOG_LABELS[l.type]}（記録）</p>
                  {l.note && <p className="text-sm text-gray-700 mt-0.5">{l.note}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{l.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────
// 3タップの体調チェック（モック版）
// 実体: components/HealthCheckSheet.tsx から移植。
// Firestore への保存は行わず console.log のみ（見た目・操作感の確認用）。
// ─────────────────────────────────────────────
const EMPTY_CHECK: Omit<DailyHealthCheck, "updatedAt"> = {
  energy: 0,
  appetite: "",
  elimination: "",
  memo: "",
};

const ENERGY_LEVELS: { value: number; icon: string; label: string }[] = [
  { value: 1, icon: "😪", label: "元気ない" },
  { value: 2, icon: "😐", label: "やや元気ない" },
  { value: 3, icon: "🙂", label: "普通" },
  { value: 4, icon: "😃", label: "元気" },
  { value: 5, icon: "🤩", label: "とても元気" },
];

const APPETITE_OPTIONS: MealAmountEaten[] = ["完食", "半分", "少し", "食べてない"];
const ELIMINATION_OPTIONS: EliminationStatus[] = ["あり", "なし"];

function TapChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors active:scale-95 ${
        active
          ? "bg-amber-500 text-white border-amber-500"
          : "border-gray-100 text-gray-500 bg-white"
      }`}
    >
      {label}
    </button>
  );
}

function MockHealthCheckSheet() {
  const [form, setForm] = useState<Omit<DailyHealthCheck, "updatedAt">>(EMPTY_CHECK);
  const [open, setOpen] = useState(true); // プレビューなので最初から開いておく
  const [memoOpen, setMemoOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  function mockPersist(next: Omit<DailyHealthCheck, "updatedAt">) {
    // 実際のFirestore書き込みは行わない。選択内容の確認用にconsole.logのみ。
    console.log("[dev-preview] 体調チェック（モック保存）:", next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function selectEnergy(value: number) {
    setForm((f) => {
      const next = { ...f, energy: value };
      mockPersist(next);
      return next;
    });
  }

  function selectAppetite(value: MealAmountEaten) {
    setForm((f) => {
      const appetite: MealAmountEaten | "" = f.appetite === value ? "" : value;
      const next = { ...f, appetite };
      mockPersist(next);
      return next;
    });
  }

  function selectElimination(value: EliminationStatus) {
    setForm((f) => {
      const elimination: EliminationStatus | "" = f.elimination === value ? "" : value;
      const next = { ...f, elimination };
      mockPersist(next);
      return next;
    });
  }

  function handleMemoChange(value: string) {
    setForm((f) => ({ ...f, memo: value }));
  }

  return (
    <section className="mb-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between mb-3 active:opacity-70"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-green-100 text-green-600 px-3 py-1.5 rounded-full">
            <span className="text-sm">🩺</span>
            <span className="text-xs font-black">今日の体調チェック（{MOCK_DOG.name}）</span>
          </div>
          {saved && !open && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-medium">
              保存済み ✓
            </span>
          )}
        </div>
        <span className={`text-gray-400 text-xs transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-full bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between active:scale-98 transition-transform"
        >
          <span className="text-sm text-gray-400">タップして記録する（3タップで完了）</span>
          <span className="text-amber-400 text-lg">＋</span>
        </button>
      )}

      {open && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* ① 元気度 */}
          <div className="px-4 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">⚡  元気度</h3>
            <div className="flex justify-between gap-1">
              {ENERGY_LEVELS.map(({ value, icon, label }) => (
                <button
                  key={value}
                  onClick={() => selectEnergy(value)}
                  aria-label={label}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-all active:scale-90 ${
                    form.energy === value ? "bg-amber-100 scale-105" : ""
                  }`}
                >
                  <span className={`text-2xl transition-transform ${form.energy === value ? "scale-110" : "opacity-50"}`}>
                    {icon}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-1 px-1">
              <span className="text-[10px] text-gray-300">元気ない</span>
              <span className="text-[10px] text-gray-300">とても元気</span>
            </div>
          </div>

          {/* ② 食欲 */}
          <div className="px-4 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">🍚  食欲</h3>
            <div className="flex gap-2 flex-wrap">
              {APPETITE_OPTIONS.map((opt) => (
                <TapChip
                  key={opt}
                  label={opt}
                  active={form.appetite === opt}
                  onClick={() => selectAppetite(opt)}
                />
              ))}
            </div>
          </div>

          {/* ③ 排泄 */}
          <div className="px-4 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">💩  排泄</h3>
            <div className="flex gap-2 flex-wrap">
              {ELIMINATION_OPTIONS.map((opt) => (
                <TapChip
                  key={opt}
                  label={opt}
                  active={form.elimination === opt}
                  onClick={() => selectElimination(opt)}
                />
              ))}
            </div>
          </div>

          {/* メモ（任意・デフォルト非表示） */}
          <div className="px-4 py-3">
            {memoOpen ? (
              <div>
                <h3 className="text-xs font-bold text-gray-400 mb-2">📝 メモ（任意）</h3>
                <textarea
                  value={form.memo}
                  onChange={(e) => handleMemoChange(e.target.value)}
                  onBlur={() => mockPersist(form)}
                  placeholder="気になることがあれば書いてください"
                  rows={2}
                  autoFocus
                  className="w-full text-sm text-gray-700 outline-none placeholder-gray-300 resize-none border-b border-gray-100 pb-1"
                />
              </div>
            ) : (
              <button
                onClick={() => setMemoOpen(true)}
                className="text-sm text-amber-500 font-medium active:opacity-70"
              >
                ＋ メモを書く（任意）
              </button>
            )}
          </div>

          {saved && (
            <div className="px-4 pb-4">
              <span className="text-xs text-green-600 font-medium">✓ 保存しました（モック・実際には保存されません）</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────
// ページ本体
// ─────────────────────────────────────────────
export default function DevPreviewSummaryPage() {
  return (
    <div className="max-w-lg mx-auto pb-16 min-h-screen bg-gray-50">
      {/* ── 開発確認用の注記（目立つ位置に固定表示） ── */}
      <div className="sticky top-0 z-50 bg-red-600 text-white text-center text-xs font-bold py-2 px-4 shadow-md">
        ⚠️ 開発確認用プレビュー（本番には含めない） / ログイン不要・全データはモック
      </div>

      {/* ── トップバー ── */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <div className="flex items-center gap-1.5 bg-sky-100 text-sky-600 px-3 py-1.5 rounded-full">
          <span className="text-sm">🏥</span>
          <span className="text-sm font-black">通院サマリー（プレビュー）</span>
        </div>
      </div>

      {/* ── 今日の体調チェック（3タップ）: 実際のダッシュボードと同じく最上部に配置 ── */}
      <div className="px-4">
        <div className="flex items-center gap-1.5 bg-gray-200 text-gray-500 px-3 py-1.5 rounded-full mb-3 self-start">
          <span className="text-xs font-black">↓ ダッシュボードの最上部を想定（3タップの体調チェックUI・モック）</span>
        </div>
        <MockHealthCheckSheet />
      </div>

      <div className="px-4 mt-2 mb-3">
        <div className="flex items-center gap-1.5 bg-sky-50 text-sky-500 px-3 py-1.5 rounded-full self-start">
          <span className="text-xs font-black">↓ ここから別ページ想定（通院サマリー画面）</span>
        </div>
      </div>

      <MockSummarySection />
    </div>
  );
}
