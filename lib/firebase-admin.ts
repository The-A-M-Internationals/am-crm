import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let adminApp: App;

function getAdminApp(): App {
  const existingApps = getApps();
  const existingAdmin = existingApps.find((app) => app.name === "admin");
  if (existingAdmin) {
    return existingAdmin;
  }
  if (existingApps.length > 0 && !existingAdmin) {
    // If there is an app but it's not named 'admin', we can return the default one
    // or initialize 'admin' below.
  }

  try {
    const projectId =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    console.log("Firebase Admin Debug:", {
      hasProjectId: !!projectId,
      projectIdLength: projectId?.length,
      hasClientEmail: !!clientEmail,
      clientEmailLength: clientEmail?.length,
      hasPrivateKey: !!privateKeyRaw,
      privateKeyLength: privateKeyRaw?.length,
    });

    if (!projectId || !clientEmail || !privateKeyRaw) {
      const missing = [];
      if (!projectId)
        missing.push(
          "FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID)",
        );
      if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
      if (!privateKeyRaw) missing.push("FIREBASE_PRIVATE_KEY");

      throw new Error(
        `Missing Firebase Admin credentials: ${missing.join(", ")}. ` +
          "Please add these to your .env.local file. You can get these from your Firebase Console > Project Settings > Service Accounts.",
      );
    }

    let privateKey = privateKeyRaw.replace(/\\n/g, "\n");
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }

    // The SDK specifically looks for these keys in the object passed to cert()
    const serviceAccount = {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey,
    };

    adminApp = initializeApp(
      {
        credential: cert(serviceAccount as any),
        projectId: projectId, // Also set projectId at the app level
      },
      "admin",
    );

    console.log(
      "Firebase Admin Initialized successfully for project:",
      projectId,
    );
    return adminApp;
  } catch (error) {
    console.error("Firebase Admin Initialization Error:", error);
    throw error;
  }
}

export const getAdminDb = (): Firestore => {
  return getFirestore(getAdminApp());
};

export const getAdminAuth = (): Auth => {
  return getAuth(getAdminApp());
};

// Export actual instances for compatibility
export const adminDb = null; // Used by some compatibility endpoints, or we can get them dynamically:

let adminAuthInstance: Auth | null = null;
try {
  adminAuthInstance = getAdminAuth();
} catch (err) {
  console.warn(
    "Firebase Admin SDK is not initialized (missing environment keys). Admin endpoints will fail if called.",
  );
}

export const adminAuth = adminAuthInstance as Auth;
