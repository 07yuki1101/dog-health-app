"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getDogs, getDailyHealthCheck, saveDailyHealthCheck } from "@/lib/firestore";
import type {
  Dog,
  DailyHealthCheck,
  MealEntry,
  MealAmountEaten,
  PoopCondition,
  PeeCondition,
} from "@/lib/types";

function getTodayJST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
}

const emptyMeal = (label: MealEntry["label"]): MealEntry => ({
  label,
  foodType: "",
  amount: "",
  amountEaten: "",
});

const DEFAULT_MEALS: MealEntry[] = [emptyMeal("朝"), emptyMeal("夜")];

const EMPTY_CHECK: Omit<DailyHealthCheck, "updatedAt"> = {
  meals: DEFAULT_MEALS,
  poop: { condition: "", memo: "" },
  pee: { condition: "" },
  energy: 0,
  memo: "",
};

function ChoiceButton({
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
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors active:scale-95 ${
        active
          ? "bg-amber-500 text-white border-amber-500"
          : "border-gray-200 text-gray-600 bg-white"
      }`}
    >
      {label}
    </button>
  );
}

function MealSection({
  meal,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  meal: MealEntry;
  index: number;
  canRemove: boolean;
  onChange: (updated: MealEntry) => void;
  onRemove: () => void;
}) {
  return (
    <div className="px-4 py-4 border-b border-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          🍚 ご飯（{meal.label}）
        </h3>
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-xs text-red-400 active:text-red-600"
          >
            削除
          </button>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">フードの種類</label>
          <input
            type="text"
            value={meal.foodType}
            onChange={(e) => onChange({ ...meal, foodType: e.target.value })}
            placeholder="例：ドライフード"
            className="w-full text-sm text-gray-700 border-b border-gray-100 pb-1 outline-none placeholder-gray-300"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">量（g）</label>
          <input
            type="number"
            inputMode="decimal"
            value={meal.amount}
            onChange={(e) => onChange({ ...meal, amount: e.target.value })}
            placeholder="例：100"
            className="w-full text-sm text-gray-700 border-b border-gray-100 pb-1 outline-none placeholder-gray-300"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-2 block">食べた量</label>
          <div className="flex gap-2 flex-wrap">
            {(["完食", "半分", "少し", "食べてない"] as MealAmountEaten[]).map((opt) => (
              <ChoiceButton
                key={opt}
                label={opt}
                active={meal.amountEaten === opt}
                onClick={() => onChange({ ...meal, amountEaten: opt })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeMeals(data: DailyHealthCheck): MealEntry[] {
  // 旧フォーマット（meal単数）の互換処理
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as any;
  if (!data.meals && raw.meal) {
    return [{ label: "朝", ...raw.meal }, emptyMeal("夜")];
  }
  return data.meals ?? DEFAULT_MEALS;
}

export function HealthCheckSheet() {
  const { familyId } = useAuth();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<DailyHealthCheck, "updatedAt">>(EMPTY_CHECK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const today = getTodayJST();

  const hasLunch = form.meals.some((m) => m.label === "昼");

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
    getDailyHealthCheck(familyId, selectedDogId, today).then((data) => {
      if (data) {
        setForm({
          meals: normalizeMeals(data),
          poop: data.poop ?? EMPTY_CHECK.poop,
          pee: data.pee ?? EMPTY_CHECK.pee,
          energy: data.energy ?? 0,
          memo: data.memo ?? "",
        });
      }
      setLoading(false);
    });
  }, [familyId, selectedDogId, today]);

  function updateMeal(index: number, updated: MealEntry) {
    setForm((f) => {
      const meals = [...f.meals];
      meals[index] = updated;
      return { ...f, meals };
    });
  }

  function addLunch() {
    setForm((f) => {
      const meals = [...f.meals];
      // 朝の後・夜の前に挿入
      const eveningIdx = meals.findIndex((m) => m.label === "夜");
      const insertAt = eveningIdx >= 0 ? eveningIdx : meals.length;
      meals.splice(insertAt, 0, emptyMeal("昼"));
      return { ...f, meals };
    });
  }

  function removeMeal(index: number) {
    setForm((f) => ({
      ...f,
      meals: f.meals.filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    if (!familyId || !selectedDogId || saving) return;
    setSaving(true);
    await saveDailyHealthCheck(familyId, selectedDogId, today, form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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
          <span className="text-sm text-gray-400">タップして記録する</span>
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
              {/* ① ご飯（複数食対応） */}
              {form.meals.map((meal, i) => (
                <MealSection
                  key={meal.label}
                  meal={meal}
                  index={i}
                  canRemove={meal.label === "昼"}
                  onChange={(updated) => updateMeal(i, updated)}
                  onRemove={() => removeMeal(i)}
                />
              ))}

              {/* 昼ごはん追加ボタン */}
              {!hasLunch && (
                <div className="px-4 py-3 border-b border-gray-50">
                  <button
                    onClick={addLunch}
                    className="w-full flex items-center justify-center gap-1.5 text-sm text-amber-500 font-medium py-1 active:opacity-70"
                  >
                    <span>＋</span>
                    <span>昼ごはんを追加</span>
                  </button>
                </div>
              )}

              {/* ② うんち */}
              <div className="px-4 py-4 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">💩  うんち</h3>
                <div className="flex gap-2 flex-wrap mb-3">
                  {(["良い", "少しゆるい", "下痢", "出てない"] as PoopCondition[]).map((opt) => (
                    <ChoiceButton
                      key={opt}
                      label={opt}
                      active={form.poop.condition === opt}
                      onClick={() => setForm((f) => ({ ...f, poop: { ...f.poop, condition: opt } }))}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={form.poop.memo}
                  onChange={(e) => setForm((f) => ({ ...f, poop: { ...f.poop, memo: e.target.value } }))}
                  placeholder="メモ（任意）"
                  className="w-full text-sm text-gray-700 border-b border-gray-100 pb-1 outline-none placeholder-gray-300"
                />
              </div>

              {/* ③ おしっこ */}
              <div className="px-4 py-4 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">💧  おしっこ</h3>
                <div className="flex gap-2 flex-wrap">
                  {(["普通", "少ない", "多い"] as PeeCondition[]).map((opt) => (
                    <ChoiceButton
                      key={opt}
                      label={opt}
                      active={form.pee.condition === opt}
                      onClick={() => setForm((f) => ({ ...f, pee: { condition: opt } }))}
                    />
                  ))}
                </div>
              </div>

              {/* ④ 元気度 */}
              <div className="px-4 py-4 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">⚡  元気度</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-16 text-right">元気ない</span>
                  <div className="flex gap-2 flex-1 justify-center">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setForm((f) => ({ ...f, energy: n }))}
                        className={`w-10 h-10 rounded-full text-sm font-bold transition-all active:scale-90 ${
                          form.energy === n
                            ? "bg-amber-500 text-white scale-110 shadow-md"
                            : form.energy > 0 && n < form.energy
                            ? "bg-amber-200 text-amber-700"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-gray-400 w-16">とても元気</span>
                </div>
              </div>

              {/* ⑤ メモ */}
              <div className="px-4 py-4 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">📝  メモ</h3>
                <textarea
                  value={form.memo}
                  onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
                  placeholder={"例：食欲少なめ、よく寝ていた\n病院へ行った、散歩で疲れていた"}
                  rows={3}
                  className="w-full text-sm text-gray-700 outline-none placeholder-gray-300 resize-none"
                />
              </div>

              {/* 保存 */}
              <div className="px-4 py-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-98 disabled:opacity-60 ${
                    saved ? "bg-green-500 text-white" : "bg-amber-500 text-white"
                  }`}
                >
                  {saved ? "✓ 保存しました" : saving ? "保存中..." : "保存する"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
