// src/app/admin.tsx
// Place at: snbx-app/src/app/admin.tsx
// Only accessible to users with isAdmin: true in Firestore

import {
  View, Text, StyleSheet, StatusBar, Pressable,
  ScrollView, ActivityIndicator, RefreshControl,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, serverTimestamp, orderBy,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { router } from "expo-router";
import { C } from "../theme";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  isAdmin: boolean;
  createdAt: any;
};

type Tab = "pending" | "approved" | "rejected";

function formatDate(ts: any): string {
  if (!ts) return "—";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function UserCard({
  user, onApprove, onReject, processing,
}: {
  user: UserRecord;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  processing: string | null;
}) {
  const isProcessing = processing === user.id;
  const initials = user.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  return (
    <View style={st.card}>
      <View style={st.cardHeader}>
        <View style={st.avatar}>
          <Text style={st.avatarText}>{initials}</Text>
        </View>
        <View style={st.cardInfo}>
          <Text style={st.cardName}>{user.name || "Unknown"}</Text>
          <Text style={st.cardEmail}>{user.email}</Text>
          <Text style={st.cardDate}>Joined {formatDate(user.createdAt)}</Text>
        </View>
        <View style={[
          st.statusBadge,
          user.status === "approved" && st.statusApproved,
          user.status === "rejected" && st.statusRejected,
          user.status === "pending"  && st.statusPending,
        ]}>
          <Text style={[
            st.statusText,
            user.status === "approved" && { color: C.greenDark },
            user.status === "rejected" && { color: C.error },
            user.status === "pending"  && { color: C.gold },
          ]}>
            {user.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Action buttons for pending users */}
      {user.status === "pending" && (
        <View style={st.actions}>
          <Pressable
            style={({ pressed }) => [st.approveBtn, pressed && st.approveBtnPressed, isProcessing && st.btnDisabled]}
            onPress={() => onApprove?.(user.id)}
            disabled={!!processing}
          >
            {isProcessing
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={st.approveBtnText}>✓ Approve</Text>
            }
          </Pressable>
          <Pressable
            style={({ pressed }) => [st.rejectBtn, pressed && st.rejectBtnPressed, isProcessing && st.btnDisabled]}
            onPress={() => onReject?.(user.id)}
            disabled={!!processing}
          >
            <Text style={st.rejectBtnText}>✗ Reject</Text>
          </Pressable>
        </View>
      )}

      {/* Revoke button for approved users */}
      {user.status === "approved" && !user.isAdmin && (
        <View style={st.actions}>
          <Pressable
            style={({ pressed }) => [st.rejectBtn, { flex: 1 }, pressed && st.rejectBtnPressed]}
            onPress={() => onReject?.(user.id)}
            disabled={!!processing}
          >
            <Text style={st.rejectBtnText}>Revoke Access</Text>
          </Pressable>
        </View>
      )}

      {/* Re-approve button for rejected users */}
      {user.status === "rejected" && (
        <View style={st.actions}>
          <Pressable
            style={({ pressed }) => [st.approveBtn, { flex: 1 }, pressed && st.approveBtnPressed]}
            onPress={() => onApprove?.(user.id)}
            disabled={!!processing}
          >
            <Text style={st.approveBtnText}>✓ Approve</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function AdminScreen() {
  const [tab, setTab]             = useState<Tab>("pending");
  const [users, setUsers]         = useState<UserRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const unsubAdminCheckRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Signed out — detach admin-check listener before redirecting
        unsubAdminCheckRef.current?.();
        unsubAdminCheckRef.current = null;
        router.replace("/");
        return;
      }

      // Check admin status in real-time
      const userRef = doc(db, "users", user.uid);
      unsubAdminCheckRef.current = onSnapshot(userRef, (snap) => {
        if (!snap.exists() || !snap.data().isAdmin) {
          unsubAdminCheckRef.current?.();
          unsubAdminCheckRef.current = null;
          router.replace("/dashboard" as any);
          return;
        }
        setIsAdmin(true);
        setAuthChecked(true);
      });
    });

    return () => {
      unsub();
      unsubAdminCheckRef.current?.();
      unsubAdminCheckRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!authChecked || !isAdmin) return;

    setLoading(true);
    const q = query(
      collection(db, "users"),
      where("status", "==", tab),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const records: UserRecord[] = [];
      snap.forEach((d) => records.push({ id: d.id, ...d.data() } as UserRecord));
      setUsers(records);
      setLoading(false);
    }, (err) => {
      // Sign-out mid-listen throws permission-denied — expected, ignore
      console.log("Admin list listener ended:", err.code);
    });

    return () => unsub();
  }, [tab, authChecked, isAdmin]);

  const handleApprove = useCallback(async (userId: string) => {
    setProcessing(userId);
    try {
      await updateDoc(doc(db, "users", userId), {
        status: "approved",
        approvedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Approve error:", e);
    } finally {
      setProcessing(null);
    }
  }, []);

  const handleReject = useCallback(async (userId: string) => {
    setProcessing(userId);
    try {
      await updateDoc(doc(db, "users", userId), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Reject error:", e);
    } finally {
      setProcessing(null);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const pendingCount = tab === "pending" ? users.length : 0;

  if (!authChecked) {
    return (
      <View style={st.loadingRoot}>
        <ActivityIndicator color={C.green} size="large" />
      </View>
    );
  }

  return (
    <View style={st.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={st.header}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/dashboard" as any);
            }
          }}
          style={st.back}
        >
          <Text style={st.backText}>←</Text>
        </Pressable>
        <View>
          <Text style={st.headerTitle}>Admin Panel</Text>
          <Text style={st.headerSub}>SNBX Pro Super Admin</Text>
        </View>
        <View style={st.adminBadge}>
          <Text style={st.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={st.tabs}>
        {([
          { id: "pending",  label: "Pending",  count: pendingCount },
          { id: "approved", label: "Approved", count: null },
          { id: "rejected", label: "Rejected", count: null },
        ] as const).map((t) => (
          <Pressable
            key={t.id}
            style={[st.tab, tab === t.id && st.tabActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[st.tabText, tab === t.id && st.tabTextActive]}>
              {t.label}
              {t.count && t.count > 0 ? ` (${t.count})` : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* User list */}
      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green} colors={[C.green]} />
        }
      >
        {loading ? (
          <View style={st.center}>
            <ActivityIndicator color={C.green} size="large" />
          </View>
        ) : users.length === 0 ? (
          <View style={st.center}>
            <Text style={st.emptyIcon}>
              {tab === "pending" ? "🎉" : tab === "approved" ? "👥" : "📭"}
            </Text>
            <Text style={st.emptyText}>
              {tab === "pending"
                ? "No pending requests.\nYou're all caught up!"
                : tab === "approved"
                ? "No approved subscribers yet."
                : "No rejected subscribers."}
            </Text>
          </View>
        ) : (
          users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              processing={processing}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadingRoot: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  center: { alignItems: "center", justifyContent: "center", padding: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 14 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 22 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.cardBorder,
  },
  back: { padding: 4 },
  backText: { fontSize: 22, color: C.muted },
  headerTitle: { fontSize: 17, fontWeight: "800", color: C.ink },
  headerSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  adminBadge: {
    backgroundColor: C.goldSoft, borderWidth: 1,
    borderColor: C.gold, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  adminBadgeText: { fontSize: 10, fontWeight: "700", color: C.gold, letterSpacing: 0.5 },

  tabs: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 20,
    alignItems: "center", backgroundColor: C.cardBg,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  tabActive: { backgroundColor: C.green, borderColor: C.green },
  tabText: { fontSize: 12, fontWeight: "600", color: C.muted },
  tabTextActive: { color: "#FFFFFF" },

  card: {
    backgroundColor: C.cardBg, borderWidth: 1,
    borderColor: C.cardBorder, borderRadius: 16,
    padding: 16, marginBottom: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.green, alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "700", color: C.ink, marginBottom: 2 },
  cardEmail: { fontSize: 12, color: C.muted, marginBottom: 2 },
  cardDate: { fontSize: 11, color: C.muted },

  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  statusApproved: { backgroundColor: C.greenSoft, borderColor: "rgba(29,158,117,0.4)" },
  statusRejected: { backgroundColor: "rgba(214,69,69,0.06)", borderColor: "rgba(214,69,69,0.35)" },
  statusPending:  { backgroundColor: C.goldSoft, borderColor: "rgba(184,147,58,0.45)" },
  statusText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },

  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  approveBtn: {
    flex: 1, backgroundColor: C.green, paddingVertical: 10,
    borderRadius: 10, alignItems: "center",
  },
  approveBtnPressed: { backgroundColor: C.greenDark },
  approveBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  rejectBtn: {
    flex: 1, backgroundColor: "transparent", paddingVertical: 10,
    borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: C.error,
  },
  rejectBtnPressed: { backgroundColor: "rgba(214,69,69,0.06)" },
  rejectBtnText: { fontSize: 13, fontWeight: "700", color: C.error },
  btnDisabled: { opacity: 0.6 },
});