"use client";

import { saveFCMToken } from "./firestore";

export async function enableNotifications(userId: string): Promise<"granted" | "denied" | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    return "unsupported";
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  try {
    const { getToken } = await import("firebase/messaging");
    const { getFirebaseMessagingAsync } = await import("./firebase");

    const messaging = await getFirebaseMessagingAsync();
    if (!messaging) return "unsupported";

    const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (token) await saveFCMToken(userId, token);
    return "granted";
  } catch (err) {
    console.error("FCM token error:", err);
    return "denied";
  }
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}
