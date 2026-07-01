// src/hooks/useSubscriber.ts
// Place at: snbx-app/src/hooks/useSubscriber.ts

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  ghlContactId: string;
  createdAt: any;
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
  Basic:    "#7A9E8E",
  Standard: "#1D9E75",
  Premium:  "#C9A84C",
  Special:  "#A78BFA",
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

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Direct document lookup — fast, secure, no collection scan
        const userRef  = doc(db, "users", firebaseUID);
        const userSnap = await getDoc(userRef);

        const userDoc: UserProfile | null = userSnap.exists()
          ? ({ id: userSnap.id, ...userSnap.data() } as UserProfile)
          : null;

        setProfile(userDoc);

        // 2. Query subscriptions where userId == this Firebase UID
        const subRef   = collection(db, "subscriptions");
        const subQuery = query(subRef, where("userId", "==", firebaseUID));
        const subSnap  = await getDocs(subQuery);
        const subs: Subscription[] = [];
        subSnap.forEach((d) => subs.push({ id: d.id, ...d.data() } as Subscription));
        setSubscriptions(subs);

      } catch (e: any) {
        setError("Failed to load your data. Please try again.");
        console.error("Firestore error:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [firebaseUID, tick]);

  return { profile, subscriptions, loading, error, refetch };
}