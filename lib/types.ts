import { Timestamp } from "firebase/firestore";

export interface MemberInfo {
  displayName: string;
  photoURL?: string;
}

export interface Family {
  id: string;
  inviteCode: string;
  memberIds: string[];
  memberInfo: Record<string, MemberInfo>;
  createdBy: string;
  createdAt: Timestamp;
}

export interface UserDoc {
  familyId: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export interface Dog {
  id: string;
  familyId: string;
  name: string;
  breed: string;
  birthDate: string;
  gender: "male" | "female";
  photoURL?: string;
  createdBy: string;
  createdAt: Timestamp;
}

export type ReminderType = "medication" | "vaccine" | "vet_visit";

export interface Reminder {
  id: string;
  dogId: string;
  type: ReminderType;
  title: string;
  note?: string;
  dueDate: string;
  recurring: boolean;
  intervalDays?: number;
  isDone: boolean;
  createdBy: string;
  createdAt: Timestamp;
}

export type LogType = "weight" | "note" | "medication" | "vaccine" | "vet_visit" | "photo";

export interface HealthLog {
  id: string;
  dogId: string;
  type: LogType;
  date: string;
  note?: string;
  weight?: number;
  photoURL?: string;
  createdBy: string;
  createdAt: Timestamp;
}

export interface PeriodicCare {
  id: string;
  name: string;
  cycleDays: number;
  lastDoneDate: string;
  notifyDaysBefore: number;
  createdAt: Timestamp;
}

export interface TaskDef {
  id: string;
  label: string;
  order: number;
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
