"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { getFamily, leaveFamily, deleteFamily } from "@/lib/firestore";
import { enableNotifications, getNotificationPermission } from "@/lib/messaging";
import type { Family } from "@/lib/types";

export default function SettingsPage() {
  const { user, familyId } = useAuth();
  const router = useRouter();
  const [family, setFamily] = useState<Family | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | "unsupported" | "loading">("loading");
  const [dissolving, setDissolving] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    getFamily(familyId).then((f) => { setFamily(f); setLoading(false); });
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
    if (!user || !familyId || !confirm("家族を抜けますか？\nペットや記録は削除されません。")) return;
    setDissolving(true);
    try { await leaveFamily(user.uid, familyId); router.push("/onboarding"); }
    catch { alert("エラーが発生しました。"); setDissolving(false); }
  }

  async function handleDeleteFamily() {
    if (!user || !familyId || !family) return;
    if (!confirm("「家族を解散」すると、すべてのペット・記録・リマインダーが完全に削除されます。\n\n本当に解散しますか？")) return;
    setDissolving(true);
    try { await deleteFamily(familyId, family.memberIds); router.push("/onboarding"); }
    catch { alert("エラーが発生しました。"); setDissolving(false); }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="text-5xl animate-pulse">🐾</div>
    </div>
  );

  const members = Object.entries(family?.memberInfo ?? {});
  const isCreator = user?.uid === family?.createdBy;

  return (
    <div className="max-w-lg mx-auto pb-28">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full inline-flex">
          <span className="text-sm">⚙️</span>
          <span className="text-sm font-black">設定</span>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* ── 家族 ── */}
        <section>
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex items-center gap-1.5 bg-violet-100 text-violet-600 px-3 py-1.5 rounded-full">
              <span className="text-sm">👨‍👩‍👧</span>
              <span className="text-sm font-black">家族</span>
            </div>
          </div>

          <div className="space-y-3">
            {/* 招待コード */}
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              <p className="text-xs font-black text-gray-400 mb-3">招待コード</p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-4xl font-black tracking-widest text-amber-500">{family?.inviteCode}</p>
                <button onClick={copyCode}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${copied ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-700 active:scale-95"}`}>
                  {copied ? "コピー済み ✓" : "コピー"}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3">このコードを家族に共有してください。一緒にわんこを管理できます。</p>
            </div>

            {/* メンバー */}
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              <p className="text-xs font-black text-gray-400 mb-4">メンバー（{members.length}人）</p>
              <div className="space-y-3">
                {members.map(([uid, info]) => (
                  <div key={uid} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-lg overflow-hidden flex-shrink-0 ring-2 ring-amber-200">
                      {info.photoURL ? <img src={info.photoURL} alt={info.displayName} className="w-full h-full object-cover" /> : "👤"}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{info.displayName}</p>
                      {uid === family?.createdBy && <p className="text-xs text-amber-500 font-bold">作成者</p>}
                      {uid === user?.uid && uid !== family?.createdBy && <p className="text-xs text-gray-400">あなた</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 退出・解散 */}
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              {isCreator ? (
                <>
                  <p className="text-xs font-black text-gray-400 mb-1">家族を解散する</p>
                  <p className="text-xs text-gray-400 mb-4">すべてのペット・記録・リマインダーが削除されます。この操作は取り消せません。</p>
                  <button onClick={handleDeleteFamily} disabled={dissolving}
                    className="w-full py-3 bg-red-50 text-red-500 font-bold rounded-2xl active:scale-95 transition-all disabled:opacity-50">
                    {dissolving ? "処理中..." : "家族を解散する"}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs font-black text-gray-400 mb-1">家族を抜ける</p>
                  <p className="text-xs text-gray-400 mb-4">家族グループから退出します。ペットや記録は残ります。</p>
                  <button onClick={handleLeave} disabled={dissolving}
                    className="w-full py-3 bg-red-50 text-red-500 font-bold rounded-2xl active:scale-95 transition-all disabled:opacity-50">
                    {dissolving ? "処理中..." : "家族を抜ける"}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── 通知 ── */}
        <section>
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex items-center gap-1.5 bg-pink-100 text-pink-600 px-3 py-1.5 rounded-full">
              <span className="text-sm">🔔</span>
              <span className="text-sm font-black">通知</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <p className="text-xs font-black text-gray-400 mb-1">プッシュ通知</p>
            <p className="text-xs text-gray-400 mb-4">リマインダーの期限日に通知を受け取れます。</p>
            {notifStatus === "loading" && <p className="text-sm text-gray-400">確認中...</p>}
            {notifStatus === "granted" && (
              <div className="flex items-center gap-2 text-green-600">
                <span className="text-lg">🔔</span>
                <span className="text-sm font-bold">通知が有効です</span>
              </div>
            )}
            {notifStatus === "denied" && (
              <div>
                <div className="flex items-center gap-2 text-red-500 mb-1">
                  <span className="text-lg">🔕</span>
                  <span className="text-sm font-bold">通知がブロックされています</span>
                </div>
                <p className="text-xs text-gray-400">ブラウザの設定から通知を許可してください。</p>
              </div>
            )}
            {notifStatus === "unsupported" && (
              <p className="text-sm text-gray-400">このブラウザはプッシュ通知に対応していません。</p>
            )}
            {notifStatus === "default" && (
              <button onClick={handleEnableNotifications}
                className="w-full py-3 bg-amber-500 text-white font-black rounded-2xl active:scale-95 transition-all">
                🔔 通知を有効にする
              </button>
            )}
          </div>
        </section>

        {/* ── アカウント ── */}
        <section>
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">
              <span className="text-sm">👤</span>
              <span className="text-sm font-black">アカウント</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm">
            {user?.photoURL && (
              <div className="flex items-center gap-3 mb-4">
                <img src={user.photoURL} alt={user.displayName ?? ""} className="w-10 h-10 rounded-full ring-2 ring-amber-200" />
                <div>
                  <p className="font-bold text-gray-800">{user.displayName}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
              </div>
            )}
            <button
              onClick={() => signOut(getFirebaseAuth())}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-500 font-bold rounded-2xl active:scale-95 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              ログアウト
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
