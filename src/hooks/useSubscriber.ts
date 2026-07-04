// src/hooks/useSubscriber.ts
// Place at: snbx-app/src/hooks/useSubscriber.ts

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  ghlContactId: string;
  createdAt: any;
  isAdmin?: boolean;
};

export type Subscription = {
  id: string;
  userId: string;
  plan: "Basic" | "Standard" | "Premium" | "Special" | string;
  subAccountId: string;
  chessLevel: string;
  status: "active" | "inactive" | "expired" | string;
  renewalDate: any;
  createdAt: any;
};

export type SubscriberData = {
  profile: UserProfile | null;
  subscriptions: Subscription[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

// Chess level progression config
export const CHESS_LEVELS = [
  "Pawn",
  "Knight",
  "Bishop",
  "Rook",
  "Queen",
  "King",
  "The Master",
];

export const CHESS_ICONS: Record<string, string> = {
  Pawn:       "♟",
  Knight:     "♞",
  Bishop:     "♝",
  Rook:       "♜",
  Queen:      "♛",
  King:       "♚",
  "The Master": "👑",
};

export const PLAN_COLORS: Record<string, string> = {
  Basic:    "#5E8271",
  Standard: "#1D9E75",
  Premium:  "#B8933A",
  Special:  "#8B6FE8",
};

// ── IMPORTANT DATA MODEL ──────────────────────────────────────────────────
// users/{firebaseUID}        ← document ID IS the Firebase Auth UID directly
// subscriptions/{autoId}     ← has a userId field == Firebase Auth UID
//
// This makes Firestore security rules simple and fast: no collection scans,
// just direct document lookups and a single indexed query.

export function useSubscriber(firebaseUID: string | undefined): SubscriberData {
  const [profile, setProfile]             = useState<UserProfile | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [tick, setTick]                   = useState(0);

  const refetch = () => setTick((t) => t + 1);

  useEffect(() => {
    if (!firebaseUID) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Direct document lookup — fast, secure, no collection scan
        const userRef  = doc(db, "users", firebaseUID);
        const userSnap = await getDoc(userRef);
        if (cancelled) return;

        const userDoc: UserProfile | null = userSnap.exists()
          ? ({ id: userSnap.id, ...userSnap.data() } as UserProfile)
          : null;

        setProfile(userDoc);

        // 2. Query subscriptions where userId == this Firebase UID
        const subRef   = collection(db, "subscriptions");
        const subQuery = query(subRef, where("userId", "==", firebaseUID));
        const subSnap  = await getDocs(subQuery);
        if (cancelled) return;

        const subs: Subscription[] = [];
        subSnap.forEach((d) => subs.push({ id: d.id, ...d.data() } as Subscription));
        setSubscriptions(subs);

      } catch (e: any) {
        if (cancelled) return;
        // If the user signed out mid-request, Firestore throws permission-denied.
        // That's an expected race during logout — ignore it silently.
        if (e?.code === "permission-denied" && !auth.currentUser) {
          console.log("useSubscriber: request aborted by sign-out (ignored)");
          return;
        }
        setError("Failed to load your data. Please try again.");
        console.error("Firestore error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => { cancelled = true; };
  }, [firebaseUID, tick]);

  return { profile, subscriptions, loading, error, refetch };
}