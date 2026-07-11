// src/app/admin.tsx
// Place at: snbx-app/src/app/admin.tsx
// Only accessible to users with isAdmin: true in Firestore

import {
  View, Text, StyleSheet, StatusBar, Pressable,
  ScrollView, ActivityIndicator, RefreshControl, Modal, Alert, TextInput,
} from "react-native";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, serverTimestamp, orderBy,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { router } from "expo-router";
import { C } from "../theme";

const RANK_OPTIONS = [
  "Unranked", "Basic",
  "Pawn", "Rook", "Knight", "Bishop", "Queen", "King", "The Master",
  "Standard", "Premium", "VIP",
];

const AXA_ROLES = ["none", "Advisor", "Unit Manager", "Branch Manager"];

const RANK_SORT_ORDER = [
  "Unranked", "Basic", "Pawn", "Rook", "Knight", "Bishop",
  "Queen", "King", "The Master", "Standard", "Premium", "VIP",
];

type SortField = "date" | "name" | "rank";
type SortDir = "asc" | "desc";

const SORT_FIELD_OPTIONS: { id: SortField; label: string; icon: string }[] = [
  { id: "date", label: "Date Joined", icon: "🗓" },
  { id: "name", label: "Alphabetical", icon: "🔤" },
  { id: "rank", label: "Rank", icon: "♟" },
];

type UserRecord = {
  id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  isAdmin: boolean;
  rankLevel?: string;
  hasPolicy?: boolean;
  axaRole?: string;
  createdAt: any;
};

type Tab = "pending" | "approved" | "rejected";

function formatDate(ts: any): string {
  if (!ts) return "—";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Compact list row ──────────────────────────────────────────────
function UserRow({ user, onPress }: { user: UserRecord; onPress: () => void }) {
  const initials = user.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  return (
    <Pressable style={({ pressed }) => [st.row, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <View style={st.rowAvatar}>
        <Text style={st.rowAvatarText}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.rowName}>{user.name || "Unknown"}</Text>
        <Text style={st.rowEmail}>{user.email}</Text>
      </View>
      <View style={st.rowBadges}>
        {user.status === "approved" && (
          <View style={st.rankBadgeSmall}>
            <Text style={st.rankBadgeSmallText}>{user.rankLevel ?? "Unranked"}</Text>
          </View>
        )}
        <Text style={st.rowArrow}>›</Text>
      </View>
    </Pressable>
  );
}

// ── Filter / Sort popup ──────────────────────────────────────────
function FilterModal({
  visible, onClose, sortField, sortDir, onApply,
}: {
  visible: boolean;
  onClose: () => void;
  sortField: SortField;
  sortDir: SortDir;
  onApply: (field: SortField, dir: SortDir) => void;
}) {
  const [field, setField] = useState<SortField>(sortField);
  const [dir, setDir] = useState<SortDir>(sortDir);

  useEffect(() => {
    if (visible) { setField(sortField); setDir(sortDir); }
  }, [visible, sortField, sortDir]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={fm.overlay}>
        <Pressable style={fm.overlayBg} onPress={onClose} />
        <View style={fm.card}>
          <Text style={fm.title}>Sort By</Text>

          {SORT_FIELD_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              style={[fm.optionRow, field === opt.id && fm.optionRowActive]}
              onPress={() => setField(opt.id)}
            >
              <Text style={fm.optionIcon}>{opt.icon}</Text>
              <Text style={[fm.optionText, field === opt.id && fm.optionTextActive]}>{opt.label}</Text>
              {field === opt.id && <Text style={fm.check}>✓</Text>}
            </Pressable>
          ))}

          <Text style={[fm.title, { marginTop: 16 }]}>Direction</Text>
          <View style={fm.dirRow}>
            <Pressable
              style={[fm.dirBtn, dir === "asc" && fm.dirBtnActive]}
              onPress={() => setDir("asc")}
            >
              <Text style={[fm.dirBtnText, dir === "asc" && fm.dirBtnTextActive]}>↑ Ascending</Text>
            </Pressable>
            <Pressable
              style={[fm.dirBtn, dir === "desc" && fm.dirBtnActive]}
              onPress={() => setDir("desc")}
            >
              <Text style={[fm.dirBtnText, dir === "desc" && fm.dirBtnTextActive]}>↓ Descending</Text>
            </Pressable>
          </View>

          <Pressable
            style={fm.applyBtn}
            onPress={() => { onApply(field, dir); onClose(); }}
          >
            <Text style={fm.applyBtnText}>Apply</Text>
          </Pressable>
          <Pressable style={fm.cancelBtn} onPress={onClose}>
            <Text style={fm.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Detail modal ──────────────────────────────────────────────────
function UserDetailModal({
  user, visible, onClose, onApprove, onReject, onRevoke, onSetRank, onTogglePolicy, onSetAxaRole, processing,
}: {
  user: UserRecord | null;
  visible: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRevoke: (id: string) => void;
  onSetRank: (id: string, rank: string) => void;
  onTogglePolicy: (id: string, current: boolean) => void;
  onSetAxaRole: (id: string, role: string) => void;
  processing: string | null;
}) {
  if (!user) return null;
  const isProcessing = processing === user.id;

  const initials = user.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const handleRevokePress = () => {
    Alert.alert(
      "Revoke Access?",
      `Sigurado ka bang gusto mong bawiin ang access ni ${user.name || user.email}? Hindi na sila makakapag-login hanggang muli mo silang aprubahan.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke Access",
          style: "destructive",
          onPress: () => { onRevoke(user.id); onClose(); },
        },
      ]
    );
  };

  const handleRejectPress = () => {
    Alert.alert(
      "Reject Request?",
      `I-reject ang signup request ni ${user.name || user.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => { onReject(user.id); onClose(); },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={dm.overlay}>
        <Pressable style={dm.overlayBg} onPress={onClose} />
        <View style={dm.sheet}>
          <View style={dm.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={dm.header}>
              <View style={dm.avatar}>
                <Text style={dm.avatarText}>{initials}</Text>
              </View>
              <Text style={dm.name}>{user.name || "Unknown"}</Text>
              <Text style={dm.email}>{user.email}</Text>
              <View style={[
                dm.statusBadge,
                user.status === "approved" && dm.statusApproved,
                user.status === "rejected" && dm.statusRejected,
                user.status === "pending"  && dm.statusPending,
              ]}>
                <Text style={[
                  dm.statusText,
                  user.status === "approved" && { color: C.greenDark },
                  user.status === "rejected" && { color: C.error },
                  user.status === "pending"  && { color: C.gold },
                ]}>
                  {user.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={dm.metaRow}>
              <Text style={dm.metaLabel}>Joined</Text>
              <Text style={dm.metaValue}>{formatDate(user.createdAt)}</Text>
            </View>

            {user.status === "pending" && (
              <View style={dm.actionRow}>
                <Pressable
                  style={({ pressed }) => [dm.approveBtn, pressed && dm.approveBtnPressed, isProcessing && dm.btnDisabled]}
                  onPress={() => { onApprove(user.id); onClose(); }}
                  disabled={!!processing}
                >
                  {isProcessing
                    ? <ActivityIndicator color="#FFFFFF" size="small" />
                    : <Text style={dm.approveBtnText}>✓ Approve</Text>
                  }
                </Pressable>
                <Pressable
                  style={({ pressed }) => [dm.rejectBtn, pressed && dm.rejectBtnPressed]}
                  onPress={handleRejectPress}
                  disabled={!!processing}
                >
                  <Text style={dm.rejectBtnText}>✗ Reject</Text>
                </Pressable>
              </View>
            )}

            {user.status === "rejected" && (
              <Pressable
                style={({ pressed }) => [dm.approveBtn, { marginTop: 16 }, pressed && dm.approveBtnPressed]}
                onPress={() => { onApprove(user.id); onClose(); }}
                disabled={!!processing}
              >
                <Text style={dm.approveBtnText}>✓ Approve</Text>
              </Pressable>
            )}

            {user.status === "approved" && (
              <>
                <Text style={dm.sectionLabel}>Plan / Rank</Text>
                <View style={dm.chipGrid}>
                  {RANK_OPTIONS.map((opt) => {
                    const active = (user.rankLevel ?? "Unranked") === opt;
                    return (
                      <Pressable
                        key={opt}
                        style={[dm.chip, active && dm.chipActive, opt === "VIP" && active && dm.chipVIP]}
                        onPress={() => onSetRank(user.id, opt)}
                      >
                        <Text style={[dm.chipText, active && dm.chipTextActive]}>{opt}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={dm.sectionLabel}>Insurance / AXA</Text>
                <View style={dm.axaRow}>
                  <Text style={dm.axaLabel}>Has Policy</Text>
                  <Pressable
                    style={[dm.policyToggle, user.hasPolicy && dm.policyToggleOn]}
                    onPress={() => onTogglePolicy(user.id, !!user.hasPolicy)}
                  >
                    <Text style={[dm.policyToggleText, user.hasPolicy && { color: "#FFFFFF" }]}>
                      {user.hasPolicy ? "✓ Yes" : "No"}
                    </Text>
                  </Pressable>
                </View>

                <Text style={[dm.axaLabel, { marginBottom: 8 }]}>AXA Role</Text>
                <View style={dm.chipGrid}>
                  {AXA_ROLES.map((role) => {
                    const active = (user.axaRole ?? "none") === role;
                    return (
                      <Pressable
                        key={role}
                        style={[dm.chip, active && dm.chipActive]}
                        onPress={() => onSetAxaRole(user.id, role)}
                      >
                        <Text style={[dm.chipText, active && dm.chipTextActive]}>
                          {role === "none" ? "None" : role}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {!user.isAdmin && (
                  <Pressable
                    style={({ pressed }) => [dm.revokeBtn, pressed && dm.revokeBtnPressed]}
                    onPress={handleRevokePress}
                  >
                    <Text style={dm.revokeBtnText}>Revoke Access</Text>
                  </Pressable>
                )}
              </>
            )}

            <Pressable style={dm.closeBtn} onPress={onClose}>
              <Text style={dm.closeBtnText}>Close</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
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
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  const [search, setSearch]       = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir]     = useState<SortDir>("desc");

  const unsubAdminCheckRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        unsubAdminCheckRef.current?.();
        unsubAdminCheckRef.current = null;
        router.replace("/");
        return;
      }
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

      setSelectedUser((prev) => {
        if (!prev) return prev;
        const updated = records.find((r) => r.id === prev.id);
        return updated ?? prev;
      });
    }, (err) => {
      console.log("Admin list listener ended:", err.code);
    });

    return () => unsub();
  }, [tab, authChecked, isAdmin]);

  const displayedUsers = useMemo(() => {
    let list = [...users];

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") {
        cmp = (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0);
      } else if (sortField === "name") {
        cmp = (a.name ?? "").localeCompare(b.name ?? "");
      } else if (sortField === "rank") {
        const ai = RANK_SORT_ORDER.indexOf(a.rankLevel ?? "Unranked");
        const bi = RANK_SORT_ORDER.indexOf(b.rankLevel ?? "Unranked");
        cmp = ai - bi;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [users, search, sortField, sortDir]);

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

  const handleSetRank = useCallback(async (userId: string, rankLevel: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { rankLevel });
    } catch (e) { console.error("Set rank error:", e); }
  }, []);

  const handleTogglePolicy = useCallback(async (userId: string, current: boolean) => {
    try {
      await updateDoc(doc(db, "users", userId), { hasPolicy: !current });
    } catch (e) { console.error("Toggle policy error:", e); }
  }, []);

  const handleSetAxaRole = useCallback(async (userId: string, axaRole: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { axaRole });
    } catch (e) { console.error("Set AXA role error:", e); }
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

  const activeSortLabel = SORT_FIELD_OPTIONS.find((o) => o.id === sortField)?.label ?? "Sort";

  return (
    <View style={st.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={st.header}>
        <Pressable
          onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/dashboard" as any); }}
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

      {/* Search + Filter — ONE row */}
      <View style={st.searchFilterRow}>
        <View style={st.searchBox}>
          <Text style={st.searchIcon}>🔍</Text>
          <TextInput
            style={st.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor={C.muted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
        <Pressable style={st.filterBtn} onPress={() => setFilterOpen(true)}>
          <Text style={st.filterBtnIcon}>⚙️</Text>
        </Pressable>
      </View>

      {/* Active sort indicator */}
      <View style={st.activeSortRow}>
        <Text style={st.activeSortText}>
          Sorted by: {activeSortLabel} ({sortDir === "asc" ? "↑ Ascending" : "↓ Descending"})
        </Text>
      </View>

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
        ) : displayedUsers.length === 0 ? (
          <View style={st.center}>
            <Text style={st.emptyIcon}>
              {search ? "🔍" : tab === "pending" ? "🎉" : tab === "approved" ? "👥" : "📭"}
            </Text>
            <Text style={st.emptyText}>
              {search
                ? `No results for "${search}"`
                : tab === "pending"
                ? "No pending requests.\nYou're all caught up!"
                : tab === "approved"
                ? "No approved subscribers yet."
                : "No rejected subscribers."}
            </Text>
          </View>
        ) : (
          displayedUsers.map((user) => (
            <UserRow key={user.id} user={user} onPress={() => setSelectedUser(user)} />
          ))
        )}
      </ScrollView>

      <FilterModal
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        sortField={sortField}
        sortDir={sortDir}
        onApply={(field, dir) => { setSortField(field); setSortDir(dir); }}
      />

      <UserDetailModal
        user={selectedUser}
        visible={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        onRevoke={handleReject}
        onSetRank={handleSetRank}
        onTogglePolicy={handleTogglePolicy}
        onSetAxaRole={handleSetAxaRole}
        processing={processing}
      />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadingRoot: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 48 },
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

  // Search + Filter row
  searchFilterRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 20, marginBottom: 8,
  },
  searchBox: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: C.ink, padding: 0 },
  filterBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    alignItems: "center", justifyContent: "center",
  },
  filterBtnIcon: { fontSize: 18 },

  activeSortRow: { paddingHorizontal: 20, marginBottom: 12 },
  activeSortText: { fontSize: 11, color: C.muted, fontStyle: "italic" },

  // List row
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.cardBg, borderWidth: 1,
    borderColor: C.cardBorder, borderRadius: 14,
    padding: 14, marginBottom: 8,
  },
  rowAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.green, alignItems: "center", justifyContent: "center",
  },
  rowAvatarText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  rowName: { fontSize: 14, fontWeight: "700", color: C.ink, marginBottom: 2 },
  rowEmail: { fontSize: 12, color: C.muted },
  rowBadges: { flexDirection: "row", alignItems: "center", gap: 8 },
  rankBadgeSmall: {
    backgroundColor: C.greenSoft, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  rankBadgeSmallText: { fontSize: 10, fontWeight: "700", color: C.greenDark },
  rowArrow: { fontSize: 20, color: C.muted },
});

// ── Filter modal styles ──────────────────────────────────────────
const fm = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(13,27,42,0.5)" },
  card: {
    backgroundColor: C.bg, borderRadius: 20, padding: 22,
    width: "100%", maxWidth: 380,
  },
  title: { fontSize: 13, fontWeight: "700", color: C.muted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 },

  optionRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12,
    borderWidth: 1, borderColor: C.cardBorder, marginBottom: 8,
  },
  optionRowActive: { backgroundColor: C.greenSoft, borderColor: C.green },
  optionIcon: { fontSize: 16 },
  optionText: { fontSize: 14, color: C.body, fontWeight: "600", flex: 1 },
  optionTextActive: { color: C.greenDark },
  check: { fontSize: 14, color: C.green, fontWeight: "800" },

  dirRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  dirBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 12,
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    alignItems: "center",
  },
  dirBtnActive: { backgroundColor: C.green, borderColor: C.green },
  dirBtnText: { fontSize: 13, fontWeight: "600", color: C.muted },
  dirBtnTextActive: { color: "#FFFFFF" },

  applyBtn: { backgroundColor: C.green, paddingVertical: 14, borderRadius: 12, alignItems: "center", marginBottom: 8 },
  applyBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  cancelBtn: { alignItems: "center", paddingVertical: 10 },
  cancelBtnText: { fontSize: 14, color: C.muted, fontWeight: "600" },
});

// ── Detail modal styles ──────────────────────────────────────────
const dm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(13,27,42,0.5)" },
  sheet: {
    backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: "88%",
  },
  handle: { width: 40, height: 4, backgroundColor: C.cardBorder, borderRadius: 2, alignSelf: "center", marginBottom: 16 },

  header: { alignItems: "center", marginBottom: 16 },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.green, alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  avatarText: { fontSize: 22, fontWeight: "700", color: "#FFFFFF" },
  name: { fontSize: 18, fontWeight: "800", color: C.ink, marginBottom: 2 },
  email: { fontSize: 13, color: C.muted, marginBottom: 10 },

  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusApproved: { backgroundColor: C.greenSoft, borderColor: "rgba(29,158,117,0.4)" },
  statusRejected: { backgroundColor: "rgba(214,69,69,0.06)", borderColor: "rgba(214,69,69,0.35)" },
  statusPending:  { backgroundColor: C.goldSoft, borderColor: "rgba(184,147,58,0.45)" },
  statusText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },

  metaRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.cardBorder,
    marginBottom: 16,
  },
  metaLabel: { fontSize: 13, color: C.muted },
  metaValue: { fontSize: 13, color: C.body, fontWeight: "600" },

  actionRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  approveBtn: { flex: 1, backgroundColor: C.green, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  approveBtnPressed: { backgroundColor: C.greenDark },
  approveBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  rejectBtn: {
    flex: 1, backgroundColor: "transparent", paddingVertical: 13,
    borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: C.error,
  },
  rejectBtnPressed: { backgroundColor: "rgba(214,69,69,0.06)" },
  rejectBtnText: { fontSize: 14, fontWeight: "700", color: C.error },
  btnDisabled: { opacity: 0.6 },

  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: C.muted, letterSpacing: 0.5,
    textTransform: "uppercase", marginBottom: 10, marginTop: 16,
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16,
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    marginRight: 8, marginBottom: 8,
  },
  chipActive: { backgroundColor: C.green, borderColor: C.green },
  chipVIP: { backgroundColor: C.gold, borderColor: C.gold },
  chipText: { fontSize: 12, fontWeight: "600", color: C.muted },
  chipTextActive: { color: "#FFFFFF" },

  axaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  axaLabel: { fontSize: 13, color: C.body, fontWeight: "600" },
  policyToggle: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 16,
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
  },
  policyToggleOn: { backgroundColor: C.green, borderColor: C.green },
  policyToggleText: { fontSize: 12, fontWeight: "700", color: C.muted },

  revokeBtn: {
    borderWidth: 1, borderColor: C.error, borderRadius: 12,
    paddingVertical: 13, alignItems: "center", marginTop: 20,
  },
  revokeBtnPressed: { backgroundColor: "rgba(214,69,69,0.06)" },
  revokeBtnText: { fontSize: 14, fontWeight: "700", color: C.error },

  closeBtn: { alignItems: "center", paddingVertical: 14, marginTop: 12 },
  closeBtnText: { fontSize: 14, color: C.muted, fontWeight: "600" },
});