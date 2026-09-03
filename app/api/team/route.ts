import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    let uid: string;
    try {
      // Check if user already exists in Firebase Auth
      const existingUser = await adminAuth.getUserByEmail(email);
      uid = existingUser.uid;
      // Update password and display name if they exist
      await adminAuth.updateUser(uid, { 
        password, 
        displayName: name,
        disabled: false // Ensure account is enabled if it was disabled
      });
      console.log(`Updated existing user: ${email} (${uid})`);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        // Create new user
        const newUser = await adminAuth.createUser({
          email,
          password,
          displayName: name,
        });
        uid = newUser.uid;
        console.log(`Created new user: ${email} (${uid})`);
      } else {
        throw err;
      }
    }

    // Upsert Firestore document in the "users" collection
    const usersRef = adminDb.collection("users");
    const snapshot = await usersRef.where("uid", "==", uid).get();
    
    const userData = {
      uid,
      name,
      email,
      role,
      requiresPasswordChange: true, // Force password change on next login
      updatedAt: new Date().toISOString(),
    };

    if (snapshot.empty) {
      await usersRef.add({
        ...userData,
        createdAt: new Date().toISOString(),
      });
    } else {
      await snapshot.docs[0].ref.update(userData);
    }

    return NextResponse.json({ success: true, uid });
  } catch (error: any) {
    console.error("Team API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { uid } = await req.json();
    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    console.log(`Deleting user: ${uid}`);

    // Delete from Firebase Auth
    try {
      await adminAuth.deleteUser(uid);
    } catch (err: any) {
      console.warn("Auth deletion failed or user already gone:", err.message);
    }

    // Delete from Firestore "users" collection
    const usersRef = adminDb.collection("users");
    const snapshot = await usersRef.where("uid", "==", uid).get();
    
    if (!snapshot.empty) {
      const batch = adminDb.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Team API Delete Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
