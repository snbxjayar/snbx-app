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
        // 1. Load user profile — query by email match or by doc ID
        const usersRef = collection(db, "users");
        const userSnap = await getDocs(usersRef);

        let userDoc: UserProfile | null = null;

        // Try matching by document ID first, then by userId field
        userSnap.forEach((d) => {
          if (d.id === firebaseUID || d.data().uid === firebaseUID) {
            userDoc = { id: d.id, ...d.data() } as UserProfile;
          }
        });

        // Fallback: match by email stored in Firestore
        if (!userDoc) {
          userSnap.forEach((d) => {
            const data = d.data();
            if (data.firebaseUID === firebaseUID) {
              userDoc = { id: d.id, ...data } as UserProfile;
            }
          });
        }

        setProfile(userDoc);

        // 2. Load subscriptions for this user
        if (userDoc) {
          const subRef   = collection(db, "subscriptions");
          const subQuery = query(subRef, where("userId", "==", (userDoc as UserProfile).id));
          const subSnap  = await getDocs(subQuery);
          const subs: Subscription[] = [];
          subSnap.forEach((d) => subs.push({ id: d.id, ...d.data() } as Subscription));
          setSubscriptions(subs);
        }
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
