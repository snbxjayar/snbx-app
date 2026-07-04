// src/hooks/useGHL.ts
// Place at: snbx-app/src/hooks/useGHL.ts

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";

export type GHLCredentials = {
  locationId: string;
  apiKey: string;
};

export type GHLContact = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  dateAdded?: string;
  country?: string;
  city?: string;
  companyName?: string;
};

// ── Vercel proxy base URL ─────────────────────────────────────────────────────
const PROXY_URL = "https://snbx-pay.vercel.app/api/ghl";

// ── Save GHL credentials to Firestore ────────────────────────────────────────
export async function saveGHLCredentials(creds: GHLCredentials): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  await setDoc(doc(db, "users", uid), {
    ghlLocationId: creds.locationId,
    ghlApiKey:     creds.apiKey,
    ghlUpdatedAt:  serverTimestamp(),
  }, { merge: true });
}

// ── Load GHL credentials from Firestore ──────────────────────────────────────
export async function loadGHLCredentials(): Promise<GHLCredentials | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (!data.ghlLocationId || !data.ghlApiKey) return null;
  return { locationId: data.ghlLocationId, apiKey: data.ghlApiKey };
}

// ── GHL API proxy call ────────────────────────────────────────────────────────
async function ghlProxy(
  action: string,
  creds: GHLCredentials,
  payload?: any
): Promise<any> {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...creds, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "GHL API error");
  return data;
}

// ── Contacts ──────────────────────────────────────────────────────────────────
export async function getContacts(
  creds: GHLCredentials,
  search?: string,
  page = 1
): Promise<{ contacts: GHLContact[]; total: number }> {
  return ghlProxy("getContacts", creds, { search, page });
}

export async function getContact(
  creds: GHLCredentials,
  contactId: string
): Promise<GHLContact> {
  return ghlProxy("getContact", creds, { contactId });
}

export async function createContact(
  creds: GHLCredentials,
  contact: Partial<GHLContact>
): Promise<GHLContact> {
  return ghlProxy("createContact", creds, { contact });
}

export async function updateContact(
  creds: GHLCredentials,
  contactId: string,
  contact: Partial<GHLContact>
): Promise<GHLContact> {
  return ghlProxy("updateContact", creds, { contactId, contact });
}

export async function addTagsToContact(
  creds: GHLCredentials,
  contactId: string,
  tags: string[]
): Promise<void> {
  return ghlProxy("addTags", creds, { contactId, tags });
}

export async function removeTagsFromContact(
  creds: GHLCredentials,
  contactId: string,
  tags: string[]
): Promise<void> {
  return ghlProxy("removeTags", creds, { contactId, tags });
}

// ── useGHLCredentials hook ────────────────────────────────────────────────────
export function useGHLCredentials() {
  const [creds, setCreds]     = useState<GHLCredentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    loadGHLCredentials()
      .then(setCreds)
      .catch(() => setError("Failed to load GHL credentials"))
      .finally(() => setLoading(false));
  }, []);

  return { creds, loading, error, reload: () => {
    setLoading(true);
    loadGHLCredentials()
      .then(setCreds)
      .catch(() => setError("Failed to load GHL credentials"))
      .finally(() => setLoading(false));
  }};
}