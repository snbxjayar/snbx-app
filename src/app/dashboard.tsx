// src/app/dashboard.tsx
// Replace your existing: snbx-app/src/app/dashboard.tsx

import {
  View, Text, StyleSheet, StatusBar, Pressable,
  ScrollView, ActivityIndicator, RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { router } from "expo-router";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../firebase";
import {
  useSubscriber,
  CHESS_ICONS,
  CHESS_LEVELS,
  PLAN_COLORS,
  Subscription,
} from "../hooks/useSubscriber";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const C = {
  forestGreen: "#1D9E75",
  darkGreen:   "#1B3A2D",
  midGreen:    "#0F6E56",
  gold:        "#C9A84C",
  navy:        "#0D1B2A",
  navyCard:    "#0F2030",
  navyDeep:    "#091624",
  white:       "#FFFFFF",
  offWhite:    "#F0F5F2",
  muted:       "#7A9E8E",
  border:      "#1A3A2A",
  error:       "#E05A5A",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(ts: any): string {
  if (!ts) return "—";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(ts: any): number {
  if (!ts) return 0;
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function chessProgress(level: string): number {
  const idx = CHESS_LEVELS.indexOf(level);
  return idx === -1 ? 0 : Math.round(((idx + 1) / CHESS_LEVELS.length) * 100);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProfileCard({ user, name }: { user: User; name: string }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : (user.email?.[0] ?? "S").toUpperCase();

  return (
    <View style={st.profileCard}>
      <View style={st.avatar}>
        <Text style={st.avatarText}>{initials}</Text>
      </View>
      <View style={st.profileInfo}>
        <Text style={st.profileName}>{name || "SNBX Subscriber"}</Text>
        <Text style={st.profileEmail}>{user.email}</Text>
        <View style={st.activeBadge}>
          <View style={st.activeDot} />
          <Text style={st.activeText}>Active Member</Text>
        </View>
      </View>
      <View style={st.logoMark}>
        <Text style={st.logoMarkText}>S</Text>
      </View>
    </View>
  );
}

function SubscriptionCard({ sub }: { sub: Subscription }) {
  const planColor = PLAN_COLORS[sub.plan] ?? C.forestGreen;
  const days      = daysUntil(sub.renewalDate);
  const icon      = CHESS_ICONS[sub.chessLevel] ?? "♟";
  const progress  = chessProgress(sub.chessLevel);
  const isExpiring = days <= 7 && days > 0;
  const isExpired  = days === 0;

  return (
    <View style={[st.subCard, { borderLeftColor: planColor, borderLeftWidth: 3 }]}>
      {/* Plan header */}
      <View style={st.subHeader}>
        <View style={[st.planBadge, { backgroundColor: `${planColor}18`, borderColor: `${planColor}50` }]}>
          <Text style={[st.planBadgeText, { color: planColor }]}>{sub.plan} Plan</Text>
        </View>
        <View style={[
          st.statusBadge,
          isExpired   && { backgroundColor: "rgba(224,90,90,0.1)", borderColor: "rgba(224,90,90,0.4)" },
          isExpiring  && { backgroundColor: "rgba(201,168,76,0.1)", borderColor: "rgba(201,168,76,0.4)" },
          !isExpired && !isExpiring && { backgroundColor: "rgba(29,158,117,0.1)", borderColor: "rgba(29,158,117,0.4)" },
        ]}>
          <Text style={[
            st.statusText,
            isExpired  && { color: C.error },
            isExpiring && { color: C.gold },
            !isExpired && !isExpiring && { color: C.forestGreen },
          ]}>
            {isExpired ? "Expired" : isExpiring ? `${days}d left` : "Active"}
          </Text>
        </View>
      </View>

      {/* Chess level */}
      <View style={st.chessRow}>
        <Text style={st.chessIcon}>{icon}</Text>
        <View style={st.chessInfo}>
          <Text style={st.chessLevel}>{sub.chessLevel}</Text>
          <Text style={st.chessSub}>Chess Level</Text>
        </View>
        <Text style={st.chessPercent}>{progress}%</Text>
      </View>

      {/* Progress bar */}
      <View style={st.progressTrack}>
        <View style={[st.progressFill, { width: `${progress}%` as any, backgroundColor: planColor }]} />
      </View>
      <Text style={st.progressLabel}>
        {CHESS_LEVELS.indexOf(sub.chessLevel) + 1} of {CHESS_LEVELS.length} levels
      </Text>

      {/* Renewal */}
      <View style={st.subFooter}>
        <View style={st.subMeta}>
          <Text style={st.subMetaLabel}>Renewal Date</Text>
          <Text style={st.subMetaValue}>{formatDate(sub.renewalDate)}</Text>
        </View>
        <View style={st.subMeta}>
          <Text style={st.subMetaLabel}>Sub-Account</Text>
          <Text style={st.subMetaValue} numberOfLines={1}>{sub.subAccountId || "—"}</Text>
        </View>
      </View>
    </View>
  );
}

function ToolCard({ icon, label, desc, onPress }: {
  icon: string; label: string; desc: string; onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [st.toolCard, pressed && st.toolPressed]}
      onPress={onPress}
    >
      <Text style={st.toolIcon}>{icon}</Text>
      <View style={st.toolBody}>
        <Text style={st.toolLabel}>{label}</Text>
        <Text style={st.toolDesc}>{desc}</Text>
      </View>
      <Text style={st.toolArrow}>›</Text>
    </Pressable>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const [user, setUser]         = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.replace("/login"); return; }
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  const { profile, subscriptions, loading, error, refetch } = useSubscriber(
    authReady ? user?.uid : undefined
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refetch]);

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/");
  };

  if (!authReady || loading) {
    return (
      <View style={st.loadingRoot}>
        <ActivityIndicator color={C.forestGreen} size="large" />
        <Text style={st.loadingText}>Loading your workspace…</Text>
      </View>
    );
  }

  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const displayName = profile?.name ?? user?.email?.split("@")[0] ?? "Subscriber";

  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.forestGreen}
            colors={[C.forestGreen]}
          />
        }
      >
        {/* ── Profile ── */}
        {user && <ProfileCard user={user} name={profile?.name ?? ""} />}

        {/* ── Error ── */}
        {error && (
          <View style={st.errorBox}>
            <Text style={st.errorText}>{error}</Text>
            <Pressable onPress={refetch}><Text style={st.errorRetry}>Retry</Text></Pressable>
          </View>
        )}

        {/* ── Subscriptions ── */}
        <Text style={st.sectionLabel}>
          {activeSubs.length > 1 ? "Your Plans" : "Your Plan"}
        </Text>

        {subscriptions.length === 0 && !loading && (
          <View style={st.emptyBox}>
            <Text style={st.emptyIcon}>📭</Text>
            <Text style={st.emptyText}>No active subscriptions found.{"\n"}Contact your SNBX admin.</Text>
          </View>
        )}

        {subscriptions.map((sub) => (
          <SubscriptionCard key={sub.id} sub={sub} />
        ))}

        {/* ── Tools ── */}
        <Text style={[st.sectionLabel, { marginTop: 24 }]}>Your Tools</Text>

        <ToolCard
          icon="💬" label="SMS Center"
          desc="Send & receive messages"
          onPress={() => router.push("/sms-center" as any)}
        />
        <ToolCard
          icon="💳" label="Payments"
          desc="GCash · Maya · Card"
          onPress={() => router.push("/payments" as any)}
        />
        <ToolCard
          icon="📊" label="GHL Dashboard"
          desc="Your sub-account overview"
          onPress={() => router.push("/gateway-setup" as any)}
        />
        <ToolCard
          icon="🛡️" label="AXA Insurance"
          desc="Policy & documents"
          onPress={() => console.log("AXA — coming soon")}
        />
        <ToolCard
          icon="♟" label="Chess Progress"
          desc="Track your SNBX level"
          onPress={() => console.log("Chess — coming soon")}
        />

        {/* ── Coming soon ── */}
        <View style={st.comingSoon}>
          <Text style={st.comingSoonText}>
            🚧 Pull down to refresh · More widgets coming soon
          </Text>
        </View>

        {profile?.isAdmin && (
  <Pressable
    style={({ pressed }) => [st.adminBtn, pressed && { opacity: 0.7 }]}
    onPress={() => router.push("/admin" as any)}
  >
    <Text style={st.adminBtnText}>⚙️ Admin Panel</Text>
  </Pressable>
)}

        {/* ── Logout ── */}
        <Pressable
          style={({ pressed }) => [st.logout, pressed && st.logoutPressed]}
          onPress={handleLogout}
        >
          <Text style={st.logoutText}>Sign Out</Text>
        </Pressable>

        <Text style={st.domain}>snbxpro.com</Text>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.navy },
  scroll: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 48 },

  // Loading
  loadingRoot: { flex: 1, backgroundColor: C.navy, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { fontSize: 14, color: C.muted },

  // Profile card
  profileCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.navyCard, borderWidth: 0.5,
    borderColor: C.border, borderRadius: 16,
    padding: 16, marginBottom: 20,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.forestGreen,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: C.midGreen,
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: C.white },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: "700", color: C.white, marginBottom: 2 },
  profileEmail: { fontSize: 12, color: C.muted, marginBottom: 6 },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.forestGreen },
  activeText: { fontSize: 11, color: C.forestGreen, fontWeight: "600" },
  logoMark: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.forestGreen, alignItems: "center",
    justifyContent: "center", borderWidth: 1, borderColor: C.midGreen,
  },
  logoMarkText: { fontSize: 16, fontWeight: "800", color: C.white },

  // Error
  errorBox: {
    backgroundColor: "rgba(224,90,90,0.08)", borderWidth: 0.5,
    borderColor: "rgba(224,90,90,0.3)", borderRadius: 12,
    padding: 14, marginBottom: 16, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
  },
  errorText: { fontSize: 13, color: C.error, flex: 1 },
  errorRetry: { fontSize: 13, color: C.forestGreen, fontWeight: "600", marginLeft: 12 },

  // Section label
  sectionLabel: {
    fontSize: 12, fontWeight: "600", color: C.muted,
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 12,
  },

  // Empty state
  emptyBox: {
    backgroundColor: C.navyCard, borderWidth: 0.5, borderColor: C.border,
    borderRadius: 16, padding: 28, alignItems: "center", marginBottom: 12,
  },
  emptyIcon: { fontSize: 32, marginBottom: 10 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 22 },

  // Subscription card
  subCard: {
    backgroundColor: C.navyCard, borderWidth: 0.5,
    borderColor: C.border, borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  subHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  planBadge: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 0.5,
  },
  planBadgeText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 0.5,
  },
  statusText: { fontSize: 12, fontWeight: "600" },

  // Chess level
  chessRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  chessIcon: { fontSize: 28 },
  chessInfo: { flex: 1 },
  chessLevel: { fontSize: 16, fontWeight: "700", color: C.white },
  chessSub: { fontSize: 11, color: C.muted, marginTop: 1 },
  chessPercent: { fontSize: 14, fontWeight: "600", color: C.muted },

  // Progress bar
  progressTrack: {
    height: 4, backgroundColor: C.border,
    borderRadius: 2, marginBottom: 6, overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
  progressLabel: { fontSize: 11, color: C.muted, marginBottom: 14 },

  // Sub footer
  subFooter: { flexDirection: "row", gap: 16, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: C.border },
  subMeta: { flex: 1 },
  subMetaLabel: { fontSize: 11, color: C.muted, marginBottom: 3 },
  subMetaValue: { fontSize: 13, color: C.offWhite, fontWeight: "500" },

  // Tool cards
  toolCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.navyCard, borderWidth: 0.5,
    borderColor: C.border, borderRadius: 14,
    padding: 14, marginBottom: 8,
  },
  toolPressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
  toolIcon: { fontSize: 22 },
  toolBody: { flex: 1 },
  toolLabel: { fontSize: 14, fontWeight: "600", color: C.white, marginBottom: 2 },
  toolDesc: { fontSize: 12, color: C.muted },
  toolArrow: { fontSize: 20, color: C.muted },

  // Coming soon
  comingSoon: {
    backgroundColor: "rgba(29,158,117,0.05)", borderWidth: 0.5,
    borderColor: C.border, borderRadius: 12,
    padding: 14, marginTop: 8, marginBottom: 20,
  },
  comingSoonText: { fontSize: 12, color: C.muted, textAlign: "center" },

  // Logout
  logout: {
    borderWidth: 0.5, borderColor: C.border,
    borderRadius: 14, paddingVertical: 14,
    alignItems: "center", marginBottom: 20,
  },
  logoutPressed: { opacity: 0.6 },
  logoutText: { fontSize: 15, fontWeight: "600", color: C.muted },
  domain: { fontSize: 12, color: C.muted, textAlign: "center", letterSpacing: 1.2 },

  adminBtn: {
  backgroundColor: "rgba(201,168,76,0.1)",
  borderWidth: 0.5, borderColor: C.gold,
  borderRadius: 14, paddingVertical: 14,
  alignItems: "center", marginBottom: 12,
},
adminBtnText: { fontSize: 15, fontWeight: "600", color: C.gold },
});
