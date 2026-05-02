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
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { deletePhotoByURL } from "./storage";
import type { Dog, Reminder, HealthLog, Family, UserDoc } from "./types";

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

  batch.delete(dogRef(familyId, dogId));
  await batch.commit();
}
