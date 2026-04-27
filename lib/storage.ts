import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
