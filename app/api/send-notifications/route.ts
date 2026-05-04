import { getAdminApp } from "@/lib/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

export const maxDuration = 60;

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(to + "T00:00:00Z").getTime() - new Date(from + "T00:00:00Z").getTime()) / 86400000
  );
}

async function sendToMembers(
  messaging: ReturnType<typeof getMessaging>,
  db: ReturnType<typeof getFirestore>,
  memberIds: string[],
  title: string,
  body: string,
  errors: string[]
): Promise<number> {
  let sent = 0;
  for (const memberId of memberIds) {
    const userDoc = await db.collection("users").doc(memberId).get();
    const fcmToken: string | undefined = userDoc.data()?.fcmToken;
    if (!fcmToken) continue;
    try {
      await messaging.send({
        token: fcmToken,
        notification: { title, body },
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
  return sent;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  getAdminApp();
  const db = getFirestore();
  const messaging = getMessaging();

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
      const dogName: string = dogDoc.data().name ?? "わんこ";

      // ─── リマインダー通知 ───────────────────────────────────
      const remindersSnap = await db
        .collection("families").doc(familyDoc.id)
        .collection("dogs").doc(dogDoc.id)
        .collection("reminders")
        .where("isDone", "==", false)
        .where("dueDate", "==", todayJST)
        .get();

      if (!remindersSnap.empty) {
        const titles = remindersSnap.docs.map((d) => d.data().title as string).join("、");
        sent += await sendToMembers(
          messaging, db, memberIds,
          `🐾 ${dogName}のリマインド`,
          `本日: ${titles}`,
          errors
        );
      }

      // ─── 定期ケア通知 ───────────────────────────────────────
      const caresSnap = await db
        .collection("families").doc(familyDoc.id)
        .collection("dogs").doc(dogDoc.id)
        .collection("periodicCares").get();

      for (const careDoc of caresSnap.docs) {
        const data = careDoc.data();
        const lastDoneDate: string = data.lastDoneDate;
        const cycleDays: number = data.cycleDays;
        const notifyDaysBefore: number = data.notifyDaysBefore;
        const careName: string = data.name;

        const nextDueDate = addDays(lastDoneDate, cycleDays);
        const daysUntil = daysBetween(todayJST, nextDueDate);

        if (daysUntil === notifyDaysBefore || daysUntil === 0) {
          const body =
            daysUntil === 0
              ? `${careName}の予定日です`
              : `${careName}まであと${daysUntil}日です`;

          sent += await sendToMembers(
            messaging, db, memberIds,
            `🛁 ${dogName}の定期ケア`,
            body,
            errors
          );
        }
      }
    }
  }

  return Response.json({ sent, errors, date: todayJST });
}
