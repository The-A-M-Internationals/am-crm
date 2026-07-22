"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "./firebase";
import { CRMUser } from "@/types";
import { setCookie, deleteCookie } from "cookies-next";

interface AuthContextType {
  user: User | null;
  crmUser: CRMUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [crmUser, setCrmUser] = useState<CRMUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Instantly Hydrate from Persistent Cache
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cachedUser = localStorage.getItem("crm-user-cache");
        if (cachedUser) {
          setCrmUser(JSON.parse(cachedUser));
          setLoading(false); // Eliminate the white screen loading phase instantly
        }
      } catch (err) {
        console.error("Failed to parse local user cache", err);
      }
    }
  }, []);

  // 2. Silent Background Sync with Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const usersRef  = collection(db, "users");
          const q         = query(usersRef, where("uid", "==", firebaseUser.uid));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            const fetchedUser = querySnap.docs[0].data() as CRMUser;
            setCrmUser(fetchedUser);
            // Overwrite cache silently in the background
            localStorage.setItem("crm-user-cache", JSON.stringify(fetchedUser));
          }
          // Keep session cookie fresh
          setCookie("am-crm-session", "true", { maxAge: 60 * 60 * 24 * 7 });
        } catch (err) {
          console.error("Error fetching user profile:", err);
        }
      } else {
        setCrmUser(null);
        localStorage.removeItem("crm-user-cache");
        // Clear cookie when logged out
        deleteCookie("am-crm-session");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setCrmUser(null);
    deleteCookie("am-crm-session");
    if (typeof window !== "undefined") {
      localStorage.removeItem("crm-user-cache");
    }
    // Hard redirect to login — clears any stale state
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, crmUser, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
