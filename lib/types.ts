import { Timestamp } from "firebase/firestore";

export interface Dog {
  id: string;
  userId: string;
  name: string;
  breed: string;
  birthDate: string; // ISO string YYYY-MM-DD
  gender: "male" | "female";
  photoURL?: string;
  createdAt: Timestamp;
}

export type ReminderType = "medication" | "vaccine" | "vet_visit";

export interface Reminder {
  id: string;
  dogId: string;
  type: ReminderType;
  title: string;
  note?: string;
  dueDate: string; // ISO string YYYY-MM-DD
  recurring: boolean;
  intervalDays?: number;
  isDone: boolean;
  createdAt: Timestamp;
}

export type LogType = "weight" | "note" | "medication" | "vaccine" | "vet_visit" | "photo";

export interface HealthLog {
  id: string;
  dogId: string;
  type: LogType;
  date: string; // ISO string YYYY-MM-DD
  note?: string;
  weight?: number; // kg
  photoURL?: string;
  createdAt: Timestamp;
}

export const REMINDER_LABELS: Record<ReminderType, string> = {
  medication: "💊 投薬",
  vaccine: "💉 ワクチン",
  vet_visit: "🏥 通院",
};

export const LOG_LABELS: Record<LogType, string> = {
  weight: "⚖️ 体重",
  note: "📝 メモ",
  medication: "💊 投薬",
  vaccine: "💉 ワクチン",
  vet_visit: "🏥 通院",
  photo: "📷 写真",
};
