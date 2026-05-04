import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  deleteField,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { deletePhotoByURL } from "./storage";
import type { Dog, Reminder, HealthLog, Family, UserDoc, TaskDef, PeriodicCare } from "./types";

const db = () => getFirebaseDb();

// ─── Invite code ──────────────────────────────────────────────
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ─── User doc ─────────────────────────────────────────────────
export const userDocRef = (userId: string) => doc(db(), "users", userId);

export async function getUserDoc(userId: string): Promise<UserDoc | null> {
  const snap = await getDoc(userDocRef(userId));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

export async function saveFCMToken(userId: string, fcmToken: string): Promise<void> {
  await updateDoc(userDocRef(userId), { fcmToken });
}

export function subscribeUserDoc(userId: string, cb: (doc: UserDoc | null) => void): Unsubscribe {
  return onSnapshot(userDocRef(userId), (snap) => {
    cb(snap.exists() ? (snap.data() as UserDoc) : null);
  });
}

// ─── Family ───────────────────────────────────────────────────
const familyRef = (familyId: string) => doc(db(), "families", familyId);

export async function getFamily(familyId: string): Promise<Family | null> {
  const snap = await getDoc(familyRef(familyId));
  return snap.exists() ? { id: snap.id, ...snap.data() } as Family : null;
}

export async function createFamily(
  userId: string,
  displayName: string,
  photoURL?: string
): Promise<string> {
  const familyRef_ = doc(collection(db(), "families"));
  const inviteCode = generateInviteCode();

  await setDoc(familyRef_, {
    inviteCode,
    memberIds: [userId],
    memberInfo: { [userId]: { displayName, ...(photoURL ? { photoURL } : {}) } },
    createdBy: userId,
    createdAt: serverTimestamp(),
  });

  await setDoc(userDocRef(userId), {
    familyId: familyRef_.id,
    displayName,
    email: "",
    ...(photoURL ? { photoURL } : {}),
  });

  return familyRef_.id;
}

export async function joinFamily(
  userId: string,
  inviteCode: string,
  displayName: string,
  photoURL?: string
): Promise<string | null> {
  const snap = await getDocs(
    query(collection(db(), "families"), where("inviteCode", "==", inviteCode.toUpperCase()))
  );
  if (snap.empty) return null;

  const familyDoc = snap.docs[0];
  const familyId = familyDoc.id;

  await updateDoc(familyDoc.ref, {
    memberIds: [...(familyDoc.data().memberIds ?? []), userId],
    [`memberInfo.${userId}`]: { displayName, ...(photoURL ? { photoURL } : {}) },
  });

  await setDoc(userDocRef(userId), {
    familyId,
    displayName,
    email: "",
    ...(photoURL ? { photoURL } : {}),
  });

  return familyId;
}

export async function leaveFamily(userId: string, familyId: string): Promise<void> {
  const snap = await getDoc(familyRef(familyId));
  if (!snap.exists()) return;
  const data = snap.data() as Family;

  const newMemberIds = data.memberIds.filter((id) => id !== userId);
  const newMemberInfo = { ...data.memberInfo };
  delete newMemberInfo[userId];

  await updateDoc(familyRef(familyId), {
    memberIds: newMemberIds,
    memberInfo: newMemberInfo,
  });
  await updateDoc(userDocRef(userId), { familyId: deleteField() });
}

export async function deleteFamily(familyId: string, memberIds: string[]): Promise<void> {
  const dogSnap = await getDocs(dogsRef(familyId));

  for (const dogDoc of dogSnap.docs) {
    const dogId = dogDoc.id;

    const logSnap = await getDocs(logsRef(familyId, dogId));
    await Promise.all(
      logSnap.docs
        .map((d) => (d.data() as HealthLog).photoURL)
        .filter(Boolean)
        .map((url) => deletePhotoByURL(url!))
    );

    const dogPhotoURL = (dogDoc.data() as Dog).photoURL;
    if (dogPhotoURL) await deletePhotoByURL(dogPhotoURL);

    const batch = writeBatch(db());
    logSnap.docs.forEach((d) => batch.delete(d.ref));
    const reminderSnap = await getDocs(remindersRef(familyId, dogId));
    reminderSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(dogDoc.ref);
    await batch.commit();
  }

  await Promise.all(
    memberIds.map((uid) => updateDoc(userDocRef(uid), { familyId: deleteField() }))
  );
  await deleteDoc(familyRef(familyId));
}

// ─── Dogs ─────────────────────────────────────────────────────
const dogsRef = (familyId: string) => collection(db(), "families", familyId, "dogs");
const dogRef = (familyId: string, dogId: string) =>
  doc(db(), "families", familyId, "dogs", dogId);

export async function getDogs(familyId: string): Promise<Dog[]> {
  const snap = await getDocs(query(dogsRef(familyId), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Dog);
}

export async function getDog(familyId: string, dogId: string): Promise<Dog | null> {
  const snap = await getDoc(dogRef(familyId, dogId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Dog) : null;
}

export async function addDog(familyId: string, data: Omit<Dog, "id" | "createdAt">) {
  return addDoc(dogsRef(familyId), { ...data, createdAt: serverTimestamp() });
}

export async function updateDog(familyId: string, dogId: string, data: Partial<Dog>) {
  return updateDoc(dogRef(familyId, dogId), data);
}

// ─── Reminders ────────────────────────────────────────────────
const remindersRef = (familyId: string, dogId: string) =>
  collection(db(), "families", familyId, "dogs", dogId, "reminders");
const reminderRef = (familyId: string, dogId: string, reminderId: string) =>
  doc(db(), "families", familyId, "dogs", dogId, "reminders", reminderId);

export async function getReminders(familyId: string, dogId: string): Promise<Reminder[]> {
  const snap = await getDocs(query(remindersRef(familyId, dogId), orderBy("dueDate", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Reminder);
}

export async function getUpcomingReminders(familyId: string, dogId: string): Promise<Reminder[]> {
  const today = new Date().toISOString().split("T")[0];
  const snap = await getDocs(
    query(
      remindersRef(familyId, dogId),
      where("isDone", "==", false),
      where("dueDate", ">=", today),
      orderBy("dueDate", "asc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Reminder);
}

export async function addReminder(
  familyId: string,
  dogId: string,
  data: Omit<Reminder, "id" | "createdAt">
) {
  return addDoc(remindersRef(familyId, dogId), { ...data, createdAt: serverTimestamp() });
}

export async function updateReminder(
  familyId: string,
  dogId: string,
  reminderId: string,
  data: Partial<Reminder>
) {
  return updateDoc(reminderRef(familyId, dogId, reminderId), data);
}

export async function deleteReminder(familyId: string, dogId: string, reminderId: string) {
  return deleteDoc(reminderRef(familyId, dogId, reminderId));
}

// ─── Health Logs ──────────────────────────────────────────────
const logsRef = (familyId: string, dogId: string) =>
  collection(db(), "families", familyId, "dogs", dogId, "logs");
const logRef = (familyId: string, dogId: string, logId: string) =>
  doc(db(), "families", familyId, "dogs", dogId, "logs", logId);

export async function getLogs(familyId: string, dogId: string): Promise<HealthLog[]> {
  const snap = await getDocs(query(logsRef(familyId, dogId), orderBy("date", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as HealthLog);
}

export async function addLog(
  familyId: string,
  dogId: string,
  data: Omit<HealthLog, "id" | "createdAt">
) {
  return addDoc(logsRef(familyId, dogId), { ...data, createdAt: serverTimestamp() });
}

export async function deleteLog(familyId: string, dogId: string, logId: string) {
  return deleteDoc(logRef(familyId, dogId, logId));
}

// ─── Dog 全削除 ───────────────────────────────────────────────
export async function deleteDog(familyId: string, dogId: string): Promise<void> {
  const logSnap = await getDocs(logsRef(familyId, dogId));
  await Promise.all(
    logSnap.docs
      .map((d) => (d.data() as HealthLog).photoURL)
      .filter(Boolean)
      .map((url) => deletePhotoByURL(url!))
  );

  const dogSnap = await getDoc(dogRef(familyId, dogId));
  const photoURL = dogSnap.exists() ? (dogSnap.data() as Dog).photoURL : undefined;
  if (photoURL) await deletePhotoByURL(photoURL);

  const batch = writeBatch(db());
  logSnap.docs.forEach((d) => batch.delete(d.ref));

  const reminderSnap = await getDocs(remindersRef(familyId, dogId));
  reminderSnap.docs.forEach((d) => batch.delete(d.ref));

  const careSnap = await getDocs(caresRef(familyId, dogId));
  careSnap.docs.forEach((d) => batch.delete(d.ref));

  batch.delete(dogRef(familyId, dogId));
  await batch.commit();
}

// ─── Periodic Cares ───────────────────────────────────────────
const caresRef = (familyId: string, dogId: string) =>
  collection(db(), "families", familyId, "dogs", dogId, "periodicCares");
const careRef = (familyId: string, dogId: string, careId: string) =>
  doc(db(), "families", familyId, "dogs", dogId, "periodicCares", careId);

export function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

export async function getPeriodicCares(familyId: string, dogId: string): Promise<PeriodicCare[]> {
  const snap = await getDocs(query(caresRef(familyId, dogId), orderBy("createdAt", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PeriodicCare);
}

export async function addPeriodicCare(
  familyId: string,
  dogId: string,
  data: Omit<PeriodicCare, "id" | "createdAt">
) {
  return addDoc(caresRef(familyId, dogId), { ...data, createdAt: serverTimestamp() });
}

export async function deletePeriodicCare(familyId: string, dogId: string, careId: string) {
  return deleteDoc(careRef(familyId, dogId, careId));
}

export async function markCareAsDone(familyId: string, dogId: string, careId: string): Promise<void> {
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
  await updateDoc(careRef(familyId, dogId, careId), { lastDoneDate: today });
}

export async function getUpcomingPeriodicCares(
  familyId: string,
  dogs: Dog[]
): Promise<{ dog: Dog; care: PeriodicCare; nextDueDate: string; daysUntil: number }[]> {
  const todayJST = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
  const results: { dog: Dog; care: PeriodicCare; nextDueDate: string; daysUntil: number }[] = [];

  for (const dog of dogs) {
    const cares = await getPeriodicCares(familyId, dog.id);
    for (const care of cares) {
      const nextDueDate = addDaysToDate(care.lastDoneDate, care.cycleDays);
      const daysUntil = Math.ceil(
        (new Date(nextDueDate + "T00:00:00Z").getTime() - new Date(todayJST + "T00:00:00Z").getTime()) / 86400000
      );
      if (daysUntil <= care.notifyDaysBefore) {
        results.push({ dog, care, nextDueDate, daysUntil });
      }
    }
  }

  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

// ─── Daily Tasks ──────────────────────────────────────────────
const taskDefsRef = (familyId: string) =>
  collection(db(), "families", familyId, "taskDefs");
const taskDefDocRef = (familyId: string, taskId: string) =>
  doc(db(), "families", familyId, "taskDefs", taskId);
const dailyCompletionRef = (familyId: string, date: string) =>
  doc(db(), "families", familyId, "dailyCompletions", date);

const DEFAULT_TASKS = [
  { label: "🍚 朝食", order: 0 },
  { label: "🌙 夕食", order: 1 },
  { label: "🦮 散歩", order: 2 },
  { label: "💩 うんち", order: 3 },
  { label: "🚽 トイレ交換", order: 4 },
  { label: "💧 水交換", order: 5 },
];

export async function initDefaultTaskDefs(familyId: string): Promise<void> {
  const snap = await getDocs(taskDefsRef(familyId));
  if (!snap.empty) return;
  await Promise.all(
    DEFAULT_TASKS.map(({ label, order }) =>
      addDoc(taskDefsRef(familyId), { label, order, createdAt: serverTimestamp() })
    )
  );
}

export function subscribeTaskDefs(
  familyId: string,
  cb: (tasks: TaskDef[]) => void
): Unsubscribe {
  return onSnapshot(
    query(taskDefsRef(familyId), orderBy("order", "asc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskDef)
  ));
}

export async function addTaskDef(familyId: string, label: string): Promise<void> {
  const snap = await getDocs(taskDefsRef(familyId));
  const maxOrder = snap.docs.reduce(
    (max, d) => Math.max(max, (d.data().order as number) ?? 0),
    -1
  );
  await addDoc(taskDefsRef(familyId), {
    label,
    order: maxOrder + 1,
    createdAt: serverTimestamp(),
  });
}

export async function deleteTaskDef(familyId: string, taskId: string): Promise<void> {
  await deleteDoc(taskDefDocRef(familyId, taskId));
}

export async function moveTaskDef(
  familyId: string,
  tasks: TaskDef[],
  taskId: string,
  direction: "up" | "down"
): Promise<void> {
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= tasks.length) return;
  const batch = writeBatch(db());
  batch.update(taskDefDocRef(familyId, tasks[idx].id), { order: tasks[swapIdx].order });
  batch.update(taskDefDocRef(familyId, tasks[swapIdx].id), { order: tasks[idx].order });
  await batch.commit();
}

export function subscribeDailyCompletions(
  familyId: string,
  date: string,
  cb: (completions: Record<string, boolean>) => void
): Unsubscribe {
  return onSnapshot(dailyCompletionRef(familyId, date), (snap) => {
    cb(snap.exists() ? (snap.data() as Record<string, boolean>) : {});
  });
}

export async function toggleCompletion(
  familyId: string,
  date: string,
  taskId: string,
  done: boolean
): Promise<void> {
  await setDoc(dailyCompletionRef(familyId, date), { [taskId]: done }, { merge: true });
}
