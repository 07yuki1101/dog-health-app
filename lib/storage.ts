import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getFirebaseStorage } from "./firebase";

export async function uploadPhoto(
  userId: string,
  dogId: string,
  file: File,
  prefix = "logs"
): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `users/${userId}/dogs/${dogId}/${prefix}/${Date.now()}.${ext}`;
  const storageRef = ref(getFirebaseStorage(), path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadDogPhoto(userId: string, dogId: string, file: File): Promise<string> {
  return uploadPhoto(userId, dogId, file, "profile");
}

// Firebase Storage download URLからストレージパスを取得して削除
export async function deletePhotoByURL(url: string): Promise<void> {
  try {
    const path = decodeURIComponent(url.split("/o/")[1].split("?")[0]);
    const storageRef = ref(getFirebaseStorage(), path);
    await deleteObject(storageRef);
  } catch {
    // 削除失敗してもUIは続行（既に削除済み等）
  }
}
