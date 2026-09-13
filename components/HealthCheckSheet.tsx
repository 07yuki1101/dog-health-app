"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getDogs, getDailyHealthCheck, saveDailyHealthCheck } from "@/lib/firestore";
import type { Dog, DailyHealthCheck, MealAmountEaten, EliminationStatus } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Chip, Tag } from "@/components/ui/Chip";

function getTodayJST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
}

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

export function HealthCheckSheet() {
  const { familyId } = useAuth();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<DailyHealthCheck, "updatedAt">>(EMPTY_CHECK);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const memoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = getTodayJST();

  useEffect(() => {
    if (!familyId) return;
    getDogs(familyId).then((list) => {
      setDogs(list);
      if (list.length > 0) setSelectedDogId(list[0].id);
      else setLoading(false);
    });
  }, [familyId]);

  useEffect(() => {
    if (!familyId || !selectedDogId) return;
    setLoading(true);
    setForm(EMPTY_CHECK);
    setMemoOpen(false);
    getDailyHealthCheck(familyId, selectedDogId, today).then((data) => {
      if (data) {
        setForm({
          energy: data.energy ?? 0,
          appetite: data.appetite ?? "",
          elimination: data.elimination ?? "",
          memo: data.memo ?? "",
        });
        if (data.memo) setMemoOpen(true);
      }
      setLoading(false);
    });
  }, [familyId, selectedDogId, today]);

  function persist(next: Omit<DailyHealthCheck, "updatedAt">) {
    if (!familyId || !selectedDogId) return;
    saveDailyHealthCheck(familyId, selectedDogId, today, next).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  function selectEnergy(value: number) {
    setForm((f) => {
      const next = { ...f, energy: value };
      persist(next);
      return next;
    });
  }

  function selectAppetite(value: MealAmountEaten) {
    setForm((f) => {
      const appetite: MealAmountEaten | "" = f.appetite === value ? "" : value;
      const next = { ...f, appetite };
      persist(next);
      return next;
    });
  }

  function selectElimination(value: EliminationStatus) {
    setForm((f) => {
      const elimination: EliminationStatus | "" = f.elimination === value ? "" : value;
      const next = { ...f, elimination };
      persist(next);
      return next;
    });
  }

  function handleMemoChange(value: string) {
    setForm((f) => {
      const next = { ...f, memo: value };
      if (memoTimer.current) clearTimeout(memoTimer.current);
      memoTimer.current = setTimeout(() => persist(next), 600);
      return next;
    });
  }

  if (!familyId) return null;

  if (dogs.length === 0 && !loading) {
    return (
      <section className="mb-8">
        <SectionHeading icon="🩺" title="今日の体調チェック" />
        <Card className="text-center">
          <p className="text-ink-faint text-sm">まずわんこを登録してください</p>
        </Card>
      </section>
    );
  }

  // まだ何も記録していないか（＝これからやるべきこと）を判定
  const isUnrecorded = !loading && form.energy === 0 && !form.appetite && !form.elimination;

  return (
    <section className="mb-8">
      <SectionHeading
        icon="🩺"
        title="今日の体調チェック"
        trailing={saved && !open ? <Tag label="保存済み" tone="success" /> : undefined}
      />

      {open && dogs.length > 1 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {dogs.map((dog) => (
            <button
              key={dog.id}
              onClick={() => { setSelectedDogId(dog.id); setSaved(false); }}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedDogId === dog.id
                  ? "bg-brand text-white"
                  : "bg-surface text-ink-soft shadow-sm"
              }`}
            >
              {dog.name}
            </button>
          ))}
        </div>
      )}

      {!open && isUnrecorded && (
        // ── 未記録: 「今やること」として最も目立つトーンで提示する ──
        <button
          onClick={() => setOpen(true)}
          className="w-full text-left rounded-3xl p-5 flex items-center gap-4 border-2 border-brand-start/40 bg-gradient-to-br from-brand-soft to-white shadow-sm active:scale-[0.98] transition-transform"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-start to-brand-end flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
            🐾
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-ink text-sm">今日はまだ記録がありません</p>
            <p className="text-ink-soft text-xs mt-0.5">3タップで完了します</p>
          </div>
          <span className="text-brand text-xl flex-shrink-0">＋</span>
        </button>
      )}

      {!open && !isUnrecorded && (
        // ── 記録済み: 情報を圧縮し、確認・編集のための控えめな行として表示する ──
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 bg-surface rounded-2xl px-4 py-3 shadow-sm shadow-black/[0.03] active:scale-[0.98] transition-transform"
        >
          <span className="text-lg flex-shrink-0">✅</span>
          <span className="flex-1 text-left text-sm text-ink-soft font-medium">今日の体調チェックは記録済みです</span>
          <span className="text-ink-faint text-xs font-semibold">編集する</span>
        </button>
      )}

      {open && (
        <Card padding="sm" className="overflow-hidden !p-0">
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="text-2xl animate-pulse">🐾</div>
            </div>
          ) : (
            <>
              {/* ① 元気度 */}
              <div className="px-5 py-5 border-b border-cream">
                <h3 className="text-sm font-bold text-ink mb-3">⚡ 元気度</h3>
                <div className="flex justify-between gap-1">
                  {ENERGY_LEVELS.map(({ value, icon, label }) => (
                    <button
                      key={value}
                      onClick={() => selectEnergy(value)}
                      aria-label={label}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-all active:scale-90 ${
                        form.energy === value ? "bg-brand-soft scale-105" : ""
                      }`}
                    >
                      <span className={`text-2xl transition-transform ${form.energy === value ? "scale-110" : "opacity-40"}`}>
                        {icon}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-1 px-1">
                  <span className="text-[10px] text-ink-faint">元気ない</span>
                  <span className="text-[10px] text-ink-faint">とても元気</span>
                </div>
              </div>

              {/* ② 食欲 */}
              <div className="px-5 py-5 border-b border-cream">
                <h3 className="text-sm font-bold text-ink mb-3">🍚 食欲</h3>
                <div className="flex gap-2 flex-wrap">
                  {APPETITE_OPTIONS.map((opt) => (
                    <Chip
                      key={opt}
                      label={opt}
                      active={form.appetite === opt}
                      onClick={() => selectAppetite(opt)}
                    />
                  ))}
                </div>
              </div>

              {/* ③ 排泄 */}
              <div className="px-5 py-5 border-b border-cream">
                <h3 className="text-sm font-bold text-ink mb-3">💩 排泄</h3>
                <div className="flex gap-2 flex-wrap">
                  {ELIMINATION_OPTIONS.map((opt) => (
                    <Chip
                      key={opt}
                      label={opt}
                      active={form.elimination === opt}
                      onClick={() => selectElimination(opt)}
                    />
                  ))}
                </div>
              </div>

              {/* メモ（任意・デフォルト非表示） */}
              <div className="px-5 py-4">
                {memoOpen ? (
                  <div>
                    <h3 className="text-xs font-bold text-ink-faint mb-2">📝 メモ（任意）</h3>
                    <textarea
                      value={form.memo}
                      onChange={(e) => handleMemoChange(e.target.value)}
                      onBlur={() => { if (memoTimer.current) clearTimeout(memoTimer.current); persist(form); }}
                      placeholder="気になることがあれば書いてください"
                      rows={2}
                      autoFocus
                      className="w-full text-sm text-ink outline-none placeholder-ink-faint resize-none border-b border-cream pb-1"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setMemoOpen(true)}
                    className="text-sm text-brand font-bold active:opacity-70"
                  >
                    ＋ メモを書く（任意）
                  </button>
                )}
              </div>

              <div className="px-5 pb-4 flex items-center justify-between">
                <span className={`text-xs font-medium transition-opacity ${saved ? "text-success opacity-100" : "opacity-0"}`}>
                  ✓ 保存しました
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="text-xs text-ink-faint font-semibold active:opacity-60"
                >
                  閉じる
                </button>
              </div>
            </>
          )}
        </Card>
      )}
    </section>
  );
}
