import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { deletePhotoByURL } from "./storage";
import type { Dog, Reminder, HealthLog } from "./types";

const db = () => getFirebaseDb();

// Dogs
const dogsRef = (userId: string) => collection(db(), "users", userId, "dogs");
const dogRef = (userId: string, dogId: string) => doc(db(), "users", userId, "dogs", dogId);

export async function getDogs(userId: string): Promise<Dog[]> {
  const snap = await getDocs(query(dogsRef(userId), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Dog));
}

export async function getDog(userId: string, dogId: string): Promise<Dog | null> {
  const snap = await getDoc(dogRef(userId, dogId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Dog;
}

export async function addDog(userId: string, data: Omit<Dog, "id" | "createdAt">) {
  return addDoc(dogsRef(userId), { ...data, createdAt: serverTimestamp() });
}

export async function updateDog(userId: string, dogId: string, data: Partial<Dog>) {
  return updateDoc(dogRef(userId, dogId), data);
}

// Reminders
const remindersRef = (userId: string, dogId: string) =>
  collection(db(), "users", userId, "dogs", dogId, "reminders");

const reminderRef = (userId: string, dogId: string, reminderId: string) =>
  doc(db(), "users", userId, "dogs", dogId, "reminders", reminderId);

export async function getReminders(userId: string, dogId: string): Promise<Reminder[]> {
  const snap = await getDocs(query(remindersRef(userId, dogId), orderBy("dueDate", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reminder));
}

export async function getUpcomingReminders(userId: string, dogId: string): Promise<Reminder[]> {
  const today = new Date().toISOString().split("T")[0];
  const snap = await getDocs(
    query(
      remindersRef(userId, dogId),
      where("isDone", "==", false),
      where("dueDate", ">=", today),
      orderBy("dueDate", "asc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reminder));
}

export async function addReminder(
  userId: string,
  dogId: string,
  data: Omit<Reminder, "id" | "createdAt">
) {
  return addDoc(remindersRef(userId, dogId), { ...data, createdAt: serverTimestamp() });
}

export async function updateReminder(
  userId: string,
  dogId: string,
  reminderId: string,
  data: Partial<Reminder>
) {
  return updateDoc(reminderRef(userId, dogId, reminderId), data);
}

export async function deleteReminder(userId: string, dogId: string, reminderId: string) {
  return deleteDoc(reminderRef(userId, dogId, reminderId));
}

// Health Logs
const logsRef = (userId: string, dogId: string) =>
  collection(db(), "users", userId, "dogs", dogId, "logs");

const logRef = (userId: string, dogId: string, logId: string) =>
  doc(db(), "users", userId, "dogs", dogId, "logs", logId);

export async function getLogs(userId: string, dogId: string): Promise<HealthLog[]> {
  const snap = await getDocs(query(logsRef(userId, dogId), orderBy("date", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as HealthLog));
}

export async function addLog(
  userId: string,
  dogId: string,
  data: Omit<HealthLog, "id" | "createdAt">
) {
  return addDoc(logsRef(userId, dogId), { ...data, createdAt: serverTimestamp() });
}

export async function deleteLog(userId: string, dogId: string, logId: string) {
  return deleteDoc(logRef(userId, dogId, logId));
}

// Dog全削除（サブコレクション・Storage写真含む）
export async function deleteDog(userId: string, dogId: string): Promise<void> {
  const db_ = db();

  // ログの写真をStorageから削除
  const logSnap = await getDocs(logsRef(userId, dogId));
  await Promise.all(
    logSnap.docs
      .map((d) => (d.data() as HealthLog).photoURL)
      .filter(Boolean)
      .map((url) => deletePhotoByURL(url!))
  );

  // 犬のプロフィール写真をStorageから削除
  const dogSnap = await getDoc(dogRef(userId, dogId));
  const photoURL = dogSnap.exists() ? (dogSnap.data() as Dog).photoURL : undefined;
  if (photoURL) await deletePhotoByURL(photoURL);

  // Firestoreのサブコレクション・ドキュメントをバッチ削除
  const batch = writeBatch(db_);
  logSnap.docs.forEach((d) => batch.delete(d.ref));

  const reminderSnap = await getDocs(remindersRef(userId, dogId));
  reminderSnap.docs.forEach((d) => batch.delete(d.ref));

  batch.delete(dogRef(userId, dogId));
  await batch.commit();
}
