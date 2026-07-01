// src/hooks/usePayments.ts
// Place at: snbx-app/src/hooks/usePayments.ts

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export type PaymentRecord = {
  id: string;
  userId: string;
  type: "plan_upgrade" | "sim_load" | "renewal";
  amount: number;
  method: "gcash" | "maya" | "card";
  status: "pending" | "paid" | "failed" | "expired";
  description: string;
  planTarget?: string;
  paymongoCheckoutId?: string;
  createdAt: any;
  paidAt?: any;
};

export const PLAN_PRICES: Record<string, number> = {
  Basic:    499,
  Standard: 2499,
  Premium:  4999,
};

export const PLAN_FEATURES: Record<string, string[]> = {
  Basic:    ["SNBX Community Access", "Basic GHL Templates", "Email Support"],
  Standard: ["Everything in Basic", "SMS Gateway Access", "GHL Sub-Account", "Priority Support"],
  Premium:  ["Everything in Standard", "Unlimited SMS Jobs", "Custom Automations", "1-on-1 Onboarding"],
};

export function usePayments(userId: string | undefined) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "payments"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const records: PaymentRecord[] = [];
      snap.forEach((d) => records.push({ id: d.id, ...d.data() } as PaymentRecord));
      setPayments(records);
      setLoading(false);
    }, (err) => {
      console.error("Payments listener error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [userId]);

  return { payments, loading };
}