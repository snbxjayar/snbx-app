// src/hooks/useSubscriber.ts
// Place at: snbx-app/src/hooks/useSubscriber.ts

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  ghlContactId: string;
  createdAt: any;
  isAdmin?: boolean;
  avatarColor?: string;
  rankLevel?: string;
  hasPolicy?: boolean;
  axaRole?: string; // "none" | "Advisor" | "Unit Manager" | "Branch Manager"
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

    // Live listener on the user profile doc → reflects edits instantly
    const unsubProfile = onSnapshot(
      doc(db, "users", firebaseUID),
      (snap) => {
        if (cancelled) return;
        setProfile(snap.exists() ? ({ id: snap.id, ...snap.data() } as UserProfile) : null);
      },
      (e: any) => {
        if (e?.code === "permission-denied" && !auth.currentUser) return; // sign-out race
        console.error("Profile listener error:", e);
      }
    );

    // Subscriptions: one-time fetch (re-runs on refetch via tick)
    const loadSubs = async () => {
      setLoading(true);
      setError(null);
      try {
        const subRef   = collection(db, "subscriptions");
        const subQuery = query(subRef, where("userId", "==", firebaseUID));
        const subSnap  = await getDocs(subQuery);
        if (cancelled) return;
        const subs: Subscription[] = [];
        subSnap.forEach((d) => subs.push({ id: d.id, ...d.data() } as Subscription));
        setSubscriptions(subs);
      } catch (e: any) {
        if (cancelled) return;
        if (e?.code === "permission-denied" && !auth.currentUser) return;
        setError("Failed to load your data. Please try again.");
        console.error("Firestore error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSubs();

    return () => {
      cancelled = true;
      unsubProfile();
    };
  }, [firebaseUID, tick]);

  return { profile, subscriptions, loading, error, refetch };
}