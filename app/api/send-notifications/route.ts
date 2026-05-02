import { getAdminApp } from "@/lib/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  getAdminApp();
  const db = getFirestore();
  const messaging = getMessaging();

  // 日本時間で「今日」の日付を取得
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayJST = jstNow.toISOString().split("T")[0];

  const familiesSnap = await db.collection("families").get();
  let sent = 0;
  const errors: string[] = [];

  for (const familyDoc of familiesSnap.docs) {
    const memberIds: string[] = familyDoc.data().memberIds ?? [];
    const dogsSnap = await db
      .collection("families").doc(familyDoc.id)
      .collection("dogs").get();

    for (const dogDoc of dogsSnap.docs) {
      const remindersSnap = await db
        .collection("families").doc(familyDoc.id)
        .collection("dogs").doc(dogDoc.id)
        .collection("reminders")
        .where("isDone", "==", false)
        .where("dueDate", "==", todayJST)
        .get();

      if (remindersSnap.empty) continue;

      const dogName: string = dogDoc.data().name ?? "わんこ";
      const titles = remindersSnap.docs.map((d) => d.data().title as string).join("、");

      for (const memberId of memberIds) {
        const userDoc = await db.collection("users").doc(memberId).get();
        const fcmToken: string | undefined = userDoc.data()?.fcmToken;
        if (!fcmToken) continue;

        try {
          await messaging.send({
            token: fcmToken,
            notification: {
              title: `🐾 ${dogName}のリマインド`,
              body: `本日: ${titles}`,
            },
            webpush: {
              fcmOptions: { link: "/dashboard" },
              notification: { icon: "/icon-192.png" },
            },
          });
          sent++;
        } catch (err) {
          errors.push(`${memberId}: ${String(err)}`);
        }
      }
    }
  }

  return Response.json({ sent, errors, date: todayJST });
}
