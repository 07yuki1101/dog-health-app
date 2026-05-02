import { initializeApp, cert, getApps, type App } from "firebase-admin/app";

let _adminApp: App | undefined;

export function getAdminApp(): App {
  if (_adminApp) return _adminApp;
  const existing = getApps().find((a) => a.name === "admin");
  if (existing) { _adminApp = existing; return _adminApp; }

  _adminApp = initializeApp(
    {
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    },
    "admin"
  );
  return _adminApp;
}
