"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getDogs, getDailyHealthCheck, saveDailyHealthCheck } from "@/lib/firestore";
import type { Dog, DailyHealthCheck, MealAmountEaten, EliminationStatus } from "@/lib/types";

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
      <section className="mb-6">
        <div className="flex items-center gap-1.5 bg-green-100 text-green-600 px-3 py-1.5 rounded-full mb-3 self-start">
          <span className="text-sm">🩺</span>
          <span className="text-xs font-black">今日の体調チェック</span>
        </div>
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
          <p className="text-gray-400 text-sm">まずわんこを登録してください</p>
        </div>
      </section>
    );
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
            <span className="text-xs font-black">今日の体調チェック</span>
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

      {open && dogs.length > 1 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {dogs.map((dog) => (
            <button
              key={dog.id}
              onClick={() => { setSelectedDogId(dog.id); setSaved(false); }}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedDogId === dog.id
                  ? "bg-amber-500 text-white"
                  : "bg-white text-gray-600 shadow-sm"
              }`}
            >
              {dog.name}
            </button>
          ))}
        </div>
      )}

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
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="text-2xl animate-pulse">🐾</div>
            </div>
          ) : (
            <>
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
                      onBlur={() => { if (memoTimer.current) clearTimeout(memoTimer.current); persist(form); }}
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
                  <span className="text-xs text-green-600 font-medium">✓ 保存しました</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
