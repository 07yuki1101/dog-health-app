"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { getFamily, leaveFamily, deleteFamily } from "@/lib/firestore";
import { enableNotifications, getNotificationPermission } from "@/lib/messaging";
import type { Family } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";

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
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-5xl animate-pulse">🐾</div>
    </div>
  );

  const members = Object.entries(family?.memberInfo ?? {});
  const isCreator = user?.uid === family?.createdBy;

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto pb-28">

        {/* ── トップバー ── */}
        <div className="flex items-center gap-2 px-5 pt-6 pb-5">
          <span className="text-2xl">⚙️</span>
          <span className="text-lg font-black text-ink tracking-tight">設定</span>
        </div>

        <div className="px-5 space-y-8">
          {/* ── 家族 ── */}
          <section>
            <SectionHeading icon="👨‍👩‍👧" title="家族" />

            <div className="space-y-3">
              {/* 招待コード */}
              <Card>
                <p className="text-xs font-bold text-ink-faint mb-3">招待コード</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-4xl font-black tracking-widest text-brand">{family?.inviteCode}</p>
                  <button onClick={copyCode}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${copied ? "bg-success-soft text-success" : "bg-brand-soft text-brand active:scale-95"}`}>
                    {copied ? "コピー済み ✓" : "コピー"}
                  </button>
                </div>
                <p className="text-xs text-ink-faint mt-3">このコードを家族に共有してください。一緒にわんこを管理できます。</p>
              </Card>

              {/* メンバー */}
              <Card>
                <p className="text-xs font-bold text-ink-faint mb-4">メンバー（{members.length}人）</p>
                <div className="space-y-3">
                  {members.map(([uid, info]) => (
                    <div key={uid} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center text-lg overflow-hidden flex-shrink-0 ring-2 ring-brand-soft">
                        {info.photoURL ? <img src={info.photoURL} alt={info.displayName} className="w-full h-full object-cover" /> : "👤"}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-ink">{info.displayName}</p>
                        {uid === family?.createdBy && <p className="text-xs text-brand font-bold">作成者</p>}
                        {uid === user?.uid && uid !== family?.createdBy && <p className="text-xs text-ink-faint">あなた</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* 退出・解散 */}
              <Card>
                {isCreator ? (
                  <>
                    <p className="text-xs font-bold text-ink-faint mb-1">家族を解散する</p>
                    <p className="text-xs text-ink-faint mb-4">すべてのペット・記録・リマインダーが削除されます。この操作は取り消せません。</p>
                    <button onClick={handleDeleteFamily} disabled={dissolving}
                      className="w-full py-3 bg-danger-soft text-danger font-bold rounded-2xl active:scale-95 transition-all disabled:opacity-50">
                      {dissolving ? "処理中..." : "家族を解散する"}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold text-ink-faint mb-1">家族を抜ける</p>
                    <p className="text-xs text-ink-faint mb-4">家族グループから退出します。ペットや記録は残ります。</p>
                    <button onClick={handleLeave} disabled={dissolving}
                      className="w-full py-3 bg-danger-soft text-danger font-bold rounded-2xl active:scale-95 transition-all disabled:opacity-50">
                      {dissolving ? "処理中..." : "家族を抜ける"}
                    </button>
                  </>
                )}
              </Card>
            </div>
          </section>

          {/* ── 通知 ── */}
          <section>
            <SectionHeading icon="🔔" title="通知" />

            <Card>
              <p className="text-xs font-bold text-ink-faint mb-1">プッシュ通知</p>
              <p className="text-xs text-ink-faint mb-4">リマインダーの期限日に通知を受け取れます。</p>
              {notifStatus === "loading" && <p className="text-sm text-ink-faint">確認中...</p>}
              {notifStatus === "granted" && (
                <div className="flex items-center gap-2 text-success">
                  <span className="text-lg">🔔</span>
                  <span className="text-sm font-bold">通知が有効です</span>
                </div>
              )}
              {notifStatus === "denied" && (
                <div>
                  <div className="flex items-center gap-2 text-danger mb-1">
                    <span className="text-lg">🔕</span>
                    <span className="text-sm font-bold">通知がブロックされています</span>
                  </div>
                  <p className="text-xs text-ink-faint">ブラウザの設定から通知を許可してください。</p>
                </div>
              )}
              {notifStatus === "unsupported" && (
                <p className="text-sm text-ink-faint">このブラウザはプッシュ通知に対応していません。</p>
              )}
              {notifStatus === "default" && (
                <button onClick={handleEnableNotifications}
                  className="w-full py-3 bg-gradient-to-br from-brand-start to-brand-end text-white font-black rounded-2xl shadow-md shadow-amber-200 active:scale-95 transition-all">
                  🔔 通知を有効にする
                </button>
              )}
            </Card>
          </section>

          {/* ── アカウント ── */}
          <section>
            <SectionHeading icon="👤" title="アカウント" />

            <Card>
              {user?.photoURL && (
                <div className="flex items-center gap-3 mb-4">
                  <img src={user.photoURL} alt={user.displayName ?? ""} className="w-10 h-10 rounded-full ring-2 ring-brand-soft" />
                  <div>
                    <p className="font-bold text-ink">{user.displayName}</p>
                    <p className="text-xs text-ink-faint">{user.email}</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => signOut(getFirebaseAuth())}
                className="w-full flex items-center justify-center gap-2 py-3 bg-cream text-ink-soft font-bold rounded-2xl active:scale-95 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                ログアウト
              </button>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
