// src/app/dashboard.tsx

import {
  View, Text, StyleSheet, StatusBar, Pressable,
  ScrollView, ActivityIndicator, RefreshControl,
  NativeModules, Platform,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { router } from "expo-router";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { C } from "../theme";
import {
  useSubscriber,
  CHESS_ICONS,
  CHESS_LEVELS,
  PLAN_COLORS,
  Subscription,
} from "../hooks/useSubscriber";

const { SNBXSmsModule } = NativeModules;

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
  const planColor  = PLAN_COLORS[sub.plan] ?? C.green;
  const days       = daysUntil(sub.renewalDate);
  const icon       = CHESS_ICONS[sub.chessLevel] ?? "♟";
  const progress   = chessProgress(sub.chessLevel);
  const isExpiring = days <= 7 && days > 0;
  const isExpired  = days === 0;

  return (
    <View style={[st.subCard, { borderLeftColor: planColor, borderLeftWidth: 3 }]}>
      <View style={st.subHeader}>
        <View style={[st.planBadge, { backgroundColor: `${planColor}14`, borderColor: `${planColor}55` }]}>
          <Text style={[st.planBadgeText, { color: planColor }]}>{sub.plan} Plan</Text>
        </View>
        <View style={[
          st.statusBadge,
          isExpired   && { backgroundColor: "rgba(214,69,69,0.08)", borderColor: "rgba(214,69,69,0.35)" },
          isExpiring  && { backgroundColor: "rgba(184,147,58,0.08)", borderColor: "rgba(184,147,58,0.4)" },
          !isExpired && !isExpiring && { backgroundColor: C.greenSoft, borderColor: "rgba(29,158,117,0.4)" },
        ]}>
          <Text style={[
            st.statusText,
            isExpired  && { color: C.error },
            isExpiring && { color: C.gold },
            !isExpired && !isExpiring && { color: C.greenDark },
          ]}>
            {isExpired ? "Expired" : isExpiring ? `${days}d left` : "Active"}
          </Text>
        </View>
      </View>

      <View style={st.chessRow}>
        <Text style={st.chessIcon}>{icon}</Text>
        <View style={st.chessInfo}>
          <Text style={st.chessLevel}>{sub.chessLevel}</Text>
          <Text style={st.chessSub}>Chess Level</Text>
        </View>
        <Text style={st.chessPercent}>{progress}%</Text>
      </View>

      <View style={st.progressTrack}>
        <View style={[st.progressFill, { width: `${progress}%` as any, backgroundColor: planColor }]} />
      </View>
      <Text style={st.progressLabel}>
        {CHESS_LEVELS.indexOf(sub.chessLevel) + 1} of {CHESS_LEVELS.length} levels
      </Text>

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
  const [user, setUser]             = useState<User | null>(null);
  const [authReady, setAuthReady]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Auth listener + gateway auto-restart ──────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.replace("/"); return; }
      setUser(u);
      setAuthReady(true);

      // Auto-restart gateway if it was previously active
      if (Platform.OS === "android" && SNBXSmsModule) {
        try {
          const gatewayRef  = doc(db, "gateway_status", u.uid);
          const gatewaySnap = await getDoc(gatewayRef);
          if (gatewaySnap.exists() && gatewaySnap.data().isActive) {
            SNBXSmsModule.startGatewayService().catch(console.error);
          }
        } catch (e) {
          console.log("Gateway auto-restart error:", e);
        }
      }
    });
    return () => unsub();
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
    // onAuthStateChanged fires with null and handles the redirect
  };

  if (!authReady || loading) {
    return (
      <View style={st.loadingRoot}>
        <ActivityIndicator color={C.green} size="large" />
        <Text style={st.loadingText}>Loading your workspace…</Text>
      </View>
    );
  }

  const activeSubs  = subscriptions.filter((s) => s.status === "active");

  return (
    <View style={st.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.green}
            colors={[C.green]}
          />
        }
      >
        {/* Profile */}
        {user && <ProfileCard user={user} name={profile?.name ?? ""} />}

        {/* Error */}
        {error && (
          <View style={st.errorBox}>
            <Text style={st.errorText}>{error}</Text>
            <Pressable onPress={refetch}><Text style={st.errorRetry}>Retry</Text></Pressable>
          </View>
        )}

        {/* Subscriptions */}
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

        {/* Tools */}
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
          onPress={() => router.push("/ghl-hub" as any)}
        />
        <ToolCard
          icon="📱" label="SMS Gateway"
          desc="Manage your SIM gateway settings"
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

        {/* Coming soon */}
        <View style={st.comingSoon}>
          <Text style={st.comingSoonText}>
            🚧 Pull down to refresh · More widgets coming soon
          </Text>
        </View>

        {/* Admin Panel — only visible to admin */}
        {profile?.isAdmin && (
          <Pressable
            style={({ pressed }) => [st.adminBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.push("/admin" as any)}
          >
            <Text style={st.adminBtnText}>⚙️ Admin Panel</Text>
          </Pressable>
        )}

        {/* Logout */}
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
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 48 },

  loadingRoot: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { fontSize: 14, color: C.muted },

  profileCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.cardBg, borderWidth: 1,
    borderColor: C.cardBorder, borderRadius: 16,
    padding: 16, marginBottom: 20,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.green,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: "700", color: C.ink, marginBottom: 2 },
  profileEmail: { fontSize: 12, color: C.muted, marginBottom: 6 },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  activeText: { fontSize: 11, color: C.greenDark, fontWeight: "600" },
  logoMark: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.green, alignItems: "center",
    justifyContent: "center",
  },
  logoMarkText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },

  errorBox: {
    backgroundColor: "rgba(214,69,69,0.06)", borderWidth: 1,
    borderColor: "rgba(214,69,69,0.3)", borderRadius: 12,
    padding: 14, marginBottom: 16, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
  },
  errorText: { fontSize: 13, color: C.error, flex: 1 },
  errorRetry: { fontSize: 13, color: C.green, fontWeight: "600", marginLeft: 12 },

  sectionLabel: {
    fontSize: 12, fontWeight: "600", color: C.muted,
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 12,
  },

  emptyBox: {
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 16, padding: 28, alignItems: "center", marginBottom: 12,
  },
  emptyIcon: { fontSize: 32, marginBottom: 10 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 22 },

  subCard: {
    backgroundColor: C.cardBg, borderWidth: 1,
    borderColor: C.cardBorder, borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  subHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  planBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  planBadgeText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusText: { fontSize: 12, fontWeight: "600" },

  chessRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  chessIcon: { fontSize: 28, color: C.ink },
  chessInfo: { flex: 1 },
  chessLevel: { fontSize: 16, fontWeight: "700", color: C.ink },
  chessSub: { fontSize: 11, color: C.muted, marginTop: 1 },
  chessPercent: { fontSize: 14, fontWeight: "600", color: C.muted },

  progressTrack: {
    height: 4, backgroundColor: C.cardBorder,
    borderRadius: 2, marginBottom: 6, overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
  progressLabel: { fontSize: 11, color: C.muted, marginBottom: 14 },

  subFooter: { flexDirection: "row", gap: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.cardBorder },
  subMeta: { flex: 1 },
  subMetaLabel: { fontSize: 11, color: C.muted, marginBottom: 3 },
  subMetaValue: { fontSize: 13, color: C.body, fontWeight: "500" },

  toolCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.cardBg, borderWidth: 1,
    borderColor: C.cardBorder, borderRadius: 14,
    padding: 14, marginBottom: 8,
  },
  toolPressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
  toolIcon: { fontSize: 22 },
  toolBody: { flex: 1 },
  toolLabel: { fontSize: 14, fontWeight: "700", color: C.ink, marginBottom: 2 },
  toolDesc: { fontSize: 12, color: C.muted },
  toolArrow: { fontSize: 20, color: C.muted },

  comingSoon: {
    backgroundColor: C.greenSoft, borderWidth: 1,
    borderColor: "#CBEADF", borderRadius: 12,
    padding: 14, marginTop: 8, marginBottom: 20,
  },
  comingSoonText: { fontSize: 12, color: C.greenDark, textAlign: "center" },

  adminBtn: {
    backgroundColor: C.goldSoft,
    borderWidth: 1, borderColor: C.gold,
    borderRadius: 14, paddingVertical: 14,
    alignItems: "center", marginBottom: 12,
  },
  adminBtnText: { fontSize: 15, fontWeight: "600", color: C.gold },

  logout: {
    borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 14, paddingVertical: 14,
    alignItems: "center", marginBottom: 20,
  },
  logoutPressed: { opacity: 0.6 },
  logoutText: { fontSize: 15, fontWeight: "600", color: C.muted },
  domain: { fontSize: 12, color: C.muted, textAlign: "center", letterSpacing: 1.2 },
});