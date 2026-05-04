"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  subscribeTaskDefs,
  initDefaultTaskDefs,
  addTaskDef,
  deleteTaskDef,
  moveTaskDef,
  subscribeDailyCompletions,
  toggleCompletion,
} from "@/lib/firestore";
import type { TaskDef } from "@/lib/types";

function getTodayJST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
}

export function DailyTasks() {
  const { familyId } = useAuth();
  const [tasks, setTasks] = useState<TaskDef[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const initialized = useRef(false);
  const today = getTodayJST();

  useEffect(() => {
    if (!familyId) return;

    const unsub1 = subscribeTaskDefs(familyId, (t) => {
      setTasks(t);
      setTasksLoaded(true);
      if (!initialized.current) {
        initialized.current = true;
        if (t.length === 0) initDefaultTaskDefs(familyId);
      }
    });

    const unsub2 = subscribeDailyCompletions(familyId, today, setCompletions);

    return () => {
      unsub1();
      unsub2();
    };
  }, [familyId, today]);

  async function handleToggle(taskId: string) {
    if (!familyId) return;
    await toggleCompletion(familyId, today, taskId, !completions[taskId]);
  }

  async function handleAdd() {
    if (!familyId || !newLabel.trim() || adding) return;
    setAdding(true);
    await addTaskDef(familyId, newLabel.trim());
    setNewLabel("");
    setAdding(false);
  }

  async function handleDelete(taskId: string) {
    if (!familyId) return;
    await deleteTaskDef(familyId, taskId);
  }

  async function handleMove(taskId: string, direction: "up" | "down") {
    if (!familyId) return;
    await moveTaskDef(familyId, tasks, taskId, direction);
  }

  const doneCount = tasks.filter((t) => completions[t.id]).length;
  const allDone = tasksLoaded && tasks.length > 0 && doneCount === tasks.length;

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            今日のタスク
          </h2>
          {tasksLoaded && tasks.length > 0 && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                allDone
                  ? "bg-green-100 text-green-600"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {doneCount}/{tasks.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          className="text-xs text-amber-600 font-medium px-2 py-0.5"
        >
          {editMode ? "完了" : "編集"}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {!tasksLoaded ? (
          <div className="p-6 text-center">
            <div className="text-2xl animate-pulse">🐾</div>
          </div>
        ) : (
          <>
            {allDone && (
              <div className="bg-green-50 px-4 py-2 text-center text-sm text-green-600 font-medium border-b border-green-100">
                🎉 今日のお世話、すべて完了！
              </div>
            )}

            <div className="divide-y divide-gray-50">
              {tasks.map((task, idx) => {
                const done = !!completions[task.id];
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      done && !editMode ? "bg-green-50/40" : ""
                    }`}
                  >
                    {editMode ? (
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => handleMove(task.id, "up")}
                          disabled={idx === 0}
                          className="text-gray-300 disabled:opacity-20 text-xs leading-none active:text-gray-500 px-0.5"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleMove(task.id, "down")}
                          disabled={idx === tasks.length - 1}
                          className="text-gray-300 disabled:opacity-20 text-xs leading-none active:text-gray-500 px-0.5"
                        >
                          ▼
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleToggle(task.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
                          done
                            ? "bg-green-500 border-green-500"
                            : "border-gray-300"
                        }`}
                      >
                        {done && (
                          <span className="text-white text-xs font-bold">✓</span>
                        )}
                      </button>
                    )}

                    <span
                      className={`flex-1 text-sm transition-all ${
                        done && !editMode
                          ? "line-through text-gray-400"
                          : "text-gray-700"
                      }`}
                    >
                      {task.label}
                    </span>

                    {editMode && (
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="text-red-300 text-base leading-none active:text-red-500 flex-shrink-0 w-7 h-7 flex items-center justify-center"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}

              {editMode && (
                <div className="flex items-center gap-2 px-4 py-3">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    placeholder="タスクを追加..."
                    className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-300"
                    autoComplete="off"
                  />
                  <button
                    onClick={handleAdd}
                    disabled={!newLabel.trim() || adding}
                    className="text-amber-500 text-sm font-semibold disabled:opacity-30"
                  >
                    追加
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
