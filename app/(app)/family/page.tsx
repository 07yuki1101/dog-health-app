"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getFamily, leaveFamily, deleteFamily } from "@/lib/firestore";
import { enableNotifications, getNotificationPermission } from "@/lib/messaging";
import type { Family } from "@/lib/types";

export default function FamilyPage() {
  const { user, familyId } = useAuth();
  const router = useRouter();
  const [family, setFamily] = useState<Family | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | "unsupported" | "loading">("loading");
  const [dissolving, setDissolving] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    getFamily(familyId).then((f) => {
      setFamily(f);
      setLoading(false);
    });
    setNotifStatus(getNotificationPermission());
  }, [familyId]);

  async function copyCode() {
    if (!family) return;
    await navigator.clipboard.writeText(family.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleEnableNotifications() {
    if (!user) return;
    setNotifStatus("loading");
    const result = await enableNotifications(user.uid);
    setNotifStatus(result === "granted" ? "granted" : result === "denied" ? "denied" : "unsupported");
  }

  async function handleLeave() {
    if (!user || !familyId) return;
    if (!confirm("家族を抜けますか？\nペットや記録は削除されません。")) return;
    setDissolving(true);
    try {
      await leaveFamily(user.uid, familyId);
      router.push("/onboarding");
    } catch {
      alert("エラーが発生しました。もう一度試してください。");
      setDissolving(false);
    }
  }

  async function handleDeleteFamily() {
    if (!user || !familyId || !family) return;
    const confirmed = confirm(
      `「家族を解散」すると、すべてのペット・記録・リマインダーが完全に削除されます。\n\n本当に解散しますか？`
    );
    if (!confirmed) return;
    setDissolving(true);
    try {
      await deleteFamily(familyId, family.memberIds);
      router.push("/onboarding");
    } catch {
      alert("エラーが発生しました。もう一度試してください。");
      setDissolving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-pulse">🐾</div>
      </div>
    );
  }

  const members = Object.entries(family?.memberInfo ?? {});
  const isCreator = user?.uid === family?.createdBy;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-6">家族の管理</h1>

      {/* 招待コード */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-5">
        <p className="text-sm font-semibold text-gray-500 mb-3">招待コード</p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-4xl font-bold tracking-widest text-amber-600">
            {family?.inviteCode}
          </p>
          <button
            onClick={copyCode}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              copied
                ? "bg-green-100 text-green-600"
                : "bg-amber-100 text-amber-700 active:scale-95"
            }`}
          >
            {copied ? "コピー済み ✓" : "コピー"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          このコードを家族に共有してください。参加した人と犬の情報・記録を共有できます。
        </p>
      </section>

      {/* プッシュ通知 */}
      <section className="bg-white rounded-2xl p-5 shadow-sm mb-5">
        <p className="text-sm font-semibold text-gray-500 mb-1">プッシュ通知</p>
        <p className="text-xs text-gray-400 mb-4">
          リマインダーの期限日に通知を受け取れます。
        </p>
        {notifStatus === "loading" && (
          <p className="text-sm text-gray-400">確認中...</p>
        )}
        {notifStatus === "granted" && (
          <div className="flex items-center gap-2 text-green-600">
            <span className="text-lg">🔔</span>
            <span className="text-sm font-medium">通知が有効です</span>
          </div>
        )}
        {notifStatus === "denied" && (
          <div>
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <span className="text-lg">🔕</span>
              <span className="text-sm font-medium">通知がブロックされています</span>
            </div>
            <p className="text-xs text-gray-400">
              ブラウザの設定から通知を許可してください。
            </p>
          </div>
        )}
        {notifStatus === "unsupported" && (
          <p className="text-sm text-gray-400">
            このブラウザはプッシュ通知に対応していません。
          </p>
        )}
        {notifStatus === "default" && (
          <button
            onClick={handleEnableNotifications}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-semibold rounded-xl transition-all"
          >
            🔔 通知を有効にする
          </button>
        )}
      </section>

      {/* メンバー一覧 */}
      <section className="bg-white rounded-2xl p-5 shadow-sm mb-5">
        <p className="text-sm font-semibold text-gray-500 mb-4">
          メンバー（{members.length}人）
        </p>
        <div className="space-y-3">
          {members.map(([uid, info]) => (
            <div key={uid} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-lg overflow-hidden flex-shrink-0">
                {info.photoURL ? (
                  <img src={info.photoURL} alt={info.displayName} className="w-full h-full object-cover" />
                ) : (
                  "👤"
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{info.displayName}</p>
                {uid === family?.createdBy && (
                  <p className="text-xs text-amber-500">作成者</p>
                )}
                {uid === user?.uid && uid !== family?.createdBy && (
                  <p className="text-xs text-gray-400">あなた</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 退出・解散 */}
      <section className="bg-white rounded-2xl p-5 shadow-sm">
        {isCreator ? (
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">家族を解散する</p>
            <p className="text-xs text-gray-400 mb-4">
              すべてのペット・記録・リマインダーが削除されます。この操作は取り消せません。
            </p>
            <button
              onClick={handleDeleteFamily}
              disabled={dissolving}
              className="w-full py-3 bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              {dissolving ? "処理中..." : "家族を解散する"}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">家族を抜ける</p>
            <p className="text-xs text-gray-400 mb-4">
              家族グループから退出します。ペットや記録は残ります。
            </p>
            <button
              onClick={handleLeave}
              disabled={dissolving}
              className="w-full py-3 bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              {dissolving ? "処理中..." : "家族を抜ける"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
