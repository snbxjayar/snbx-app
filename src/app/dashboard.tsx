// src/app/dashboard.tsx
import SetupChecklist from "../components/SetupChecklist";
import {
  View, Text, StyleSheet, StatusBar, Pressable,
  ScrollView, ActivityIndicator, RefreshControl,
  NativeModules, Platform, Image,
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

// Which ranks unlock which tools
const SMS_RANKS = ["Pawn", "Rook", "Knight", "Bishop", "Queen", "King", "The Master", "Standard", "Premium", "VIP"];
const GHL_RANKS = ["Basic", ...SMS_RANKS];
const AXA_RANKS = ["Knight", "Bishop", "Queen", "King"];

function canAccess(tool: string, profile?: { rankLevel?: string; hasPolicy?: boolean; axaRole?: string }) {
  const rank = profile?.rankLevel ?? "Unranked";
  switch (tool) {
    case "sms":     return SMS_RANKS.includes(rank);
    case "ghl":     return GHL_RANKS.includes(rank);
    case "insurance":
      return AXA_RANKS.includes(rank)
        || profile?.hasPolicy === true
        || (profile?.axaRole && profile.axaRole !== "none");
    default:        return true;
  }
}

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
function ProfileCard({ user, name, avatarColor }: { user: User; name: string; avatarColor?: string }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : (user.email?.[0] ?? "S").toUpperCase();

  return (
    <Pressable
      style={({ pressed }) => [st.profileCard, pressed && { opacity: 0.85 }]}
      onPress={() => router.push("/edit-profile" as any)}
    >
      <View style={[st.avatar, { backgroundColor: avatarColor || C.green }]}>
        <Text style={st.avatarText}>{initials}</Text>
      </View>
      <View style={st.profileInfo}>
        <Text style={st.profileName}>{name || "SNBX Subscriber"}</Text>
        <Text style={st.profileEmail}>{user.email}</Text>
        <View style={st.activeBadge}>
          <View style={st.activeDot} />
          <Text style={st.activeText}>Active Member · Tap to edit</Text>
        </View>
      </View>
      <Image
        source={require("../../assets/images/snbx-logo.png")}
        style={st.logoMark}
        resizeMode="contain"
      />
    </Pressable>
  );
}

// Level order for progress calculation
const LEVEL_ORDER = ["Pawn", "Rook", "Knight", "Bishop", "Queen", "King", "The Master"];

const LEVEL_INFO: Record<string, { icon: string; label: string; sub: string }> = {
  Unranked:     { icon: "🎖️", label: "Unranked",          sub: "Select a plan to start" },
  Basic:        { icon: "🌱", label: "Basic Plan",         sub: "The Essentials" },
  Pawn:         { icon: "♟",  label: "Pawn · Lvl 1",       sub: "The First Step" },
  Rook:         { icon: "♜",  label: "Rook · Lvl 2",       sub: "The Referral Reward" },
  Knight:       { icon: "♞",  label: "Knight · Lvl 3",     sub: "Protected. Fearless." },
  Bishop:       { icon: "♝",  label: "Bishop · Lvl 4",     sub: "A Professional. Respected." },
  Queen:        { icon: "♛",  label: "Queen · Lvl 5",      sub: "A Leader of Leaders" },
  King:         { icon: "♚",  label: "King · Lvl 6",       sub: "You Command the Board" },
  "The Master": { icon: "👑", label: "The Master · Lvl 7", sub: "Success & Freedom" },
  Standard:     { icon: "⚡", label: "Standard Plan",      sub: "Power User" },
  Premium:      { icon: "⚡", label: "Premium Plan",       sub: "Full Power" },
  VIP:          { icon: "👑✨", label: "VIP Member",        sub: "Team SNBX Elite" },
};

function RankStatusCard({ rankLevel, sub }: { rankLevel?: string; sub?: Subscription }) {
  const rank = rankLevel ?? "Unranked";
  const info = LEVEL_INFO[rank] ?? LEVEL_INFO.Unranked;
  const isVIP = rank === "VIP";
  const isUnranked = rank === "Unranked";

  const levelIndex = LEVEL_ORDER.indexOf(rank);
  const isLevel = levelIndex !== -1;
  const progress = isLevel ? Math.round(((levelIndex + 1) / LEVEL_ORDER.length) * 100) : 0;

  const renewal = sub?.renewalDate;
  const daysLeft = renewal ? daysUntil(renewal) : null;

  return (
    <Pressable
      style={({ pressed }) => [st.rankCard, isVIP && st.rankCardVIP, pressed && { opacity: 0.9 }]}
      onPress={() => router.push("/ranking" as any)}
    >
      {/* Top row: icon + name + status pill */}
      <View style={st.rankTopRow}>
        <View style={[st.rankIconWrap, isVIP && st.rankIconWrapVIP]}>
          <Text style={st.rankIconText}>{info.icon}</Text>
        </View>
        <View style={st.rankInfo}>
          <Text style={st.rankLabelText}>{info.label}</Text>
          <Text style={st.rankSubText}>{info.sub}</Text>
        </View>
        <View style={[
          st.rankPill,
          isUnranked ? st.rankPillMuted : isVIP ? st.rankPillVIP : st.rankPillActive,
        ]}>
          <Text style={[
            st.rankPillText,
            isUnranked ? { color: C.muted } : isVIP ? { color: C.gold } : { color: C.greenDark },
          ]}>
            {isUnranked ? "Set up" : isVIP ? "Elite" : "Active"}
          </Text>
        </View>
      </View>

      {/* Progress bar — only for level-track members */}
      {isLevel && (
        <>
          <View style={st.rankProgressTrack}>
            <View style={[st.rankProgressFill, { width: `${progress}%` as any }]} />
          </View>
          <Text style={st.rankProgressLabel}>
            Level {levelIndex + 1} of {LEVEL_ORDER.length} · {progress}% to Master
          </Text>
        </>
      )}

      {/* Subscription meta — renewal + sub-account */}
      {sub && (
        <View style={st.rankMetaRow}>
          <View style={st.rankMeta}>
            <Text style={st.rankMetaLabel}>Renewal Date</Text>
            <Text style={st.rankMetaValue}>{formatDate(sub.renewalDate)}</Text>
            {daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && (
              <Text style={st.rankMetaWarn}>{daysLeft} day(s) left</Text>
            )}
          </View>
          <View style={st.rankMeta}>
            <Text style={st.rankMetaLabel}>Sub-Account</Text>
            <Text style={st.rankMetaValue} numberOfLines={1}>{sub.subAccountId || "—"}</Text>
          </View>
        </View>
      )}

      <Text style={st.rankTapHint}>Tap to view your full ranking journey →</Text>
    </Pressable>
  );
}

function ToolCard({ icon, label, desc, onPress, locked }: {
  icon: string; label: string; desc: string; onPress: () => void; locked?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [st.toolCard, pressed && st.toolPressed, locked && st.toolCardLocked]}
      onPress={onPress}
    >
      <Text style={[st.toolIcon, locked && { opacity: 0.4 }]}>{locked ? "🔒" : icon}</Text>
      <View style={st.toolBody}>
        <Text style={[st.toolLabel, locked && { color: C.muted }]}>{label}</Text>
        <Text style={st.toolDesc}>{locked ? "Upgrade to unlock" : desc}</Text>
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

      // First-visit welcome carousel
      try {
        const userSnap = await getDoc(doc(db, "users", u.uid));
        if (userSnap.exists() && userSnap.data().welcomeSeen !== true) {
          router.replace("/welcome" as any);
          return;
        }
      } catch {}

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
        {user && <ProfileCard user={user} name={profile?.name ?? ""} avatarColor={profile?.avatarColor} />}

        {/* Onboarding checklist (auto-hides when complete + dismissed) */}
        {user && <SetupChecklist uid={user.uid} />}

        {/* Error */}
        {error && (
          <View style={st.errorBox}>
            <Text style={st.errorText}>{error}</Text>
            <Pressable onPress={refetch}><Text style={st.errorRetry}>Retry</Text></Pressable>
          </View>
        )}

        {/* Rank / Plan status */}
        <Text style={st.sectionLabel}>Your Plan</Text>
        <RankStatusCard rankLevel={profile?.rankLevel} sub={subscriptions[0]} />

        {/* Tools */}
        <Text style={[st.sectionLabel, { marginTop: 24 }]}>Your Tools</Text>

<ToolCard
          icon="📖" label="Terminologies" desc="Dictionary of GHL, marketing & business terms"
          onPress={() => router.push("/terminologies" as any)}
        />

        <ToolCard
          icon="💬" label="SMS Center" desc="Send & receive messages"
          locked={!canAccess("sms", profile)}
          onPress={() => canAccess("sms", profile)
            ? router.push("/sms-center" as any)
            : router.push("/payments" as any)}
        />
        <ToolCard
          icon="📱" label="SMS Gateway" desc="Manage your SIM gateway settings"
          locked={!canAccess("sms", profile)}
          onPress={() => canAccess("sms", profile)
            ? router.push("/gateway-setup" as any)
            : router.push("/payments" as any)}
        />
        <ToolCard
          icon="📊" label="GHL Dashboard" desc="Your sub-account overview"
          locked={!canAccess("ghl", profile)}
          onPress={() => canAccess("ghl", profile)
            ? router.push("/ghl-hub" as any)
            : router.push("/payments" as any)}
        />
        <ToolCard
          icon="🛡️" label="Insurance & Financial" desc="Protection & financial wellness"
          locked={!canAccess("insurance", profile)}
          onPress={() => canAccess("insurance", profile)
            ? router.push("/insurance-financial" as any)
            : router.push("/payments" as any)}
        />
        <ToolCard
          icon="💳" label="Upgrade Plan" desc="View plans & upgrade your subscription"
          onPress={() => router.push("/payments" as any)}
        />
        <ToolCard
          icon="♟" label="SNBX Ranking" desc="Track your level from Pawn to Master"
          onPress={() => router.push("/ranking" as any)}
        />

        <ToolCard
          icon="📚" label="Resources" desc="Apps to install & important links"
          onPress={() => router.push("/resources" as any)}
        />

        <ToolCard
          icon="❓" label="How to Use" desc="Learn how each feature works"
          onPress={() => router.push("/guide" as any)}
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
  logoMark: { width: 36, height: 36 },
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

  rankCard: {
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 16, padding: 16, marginBottom: 20,
  },
  rankCardVIP: { borderColor: C.gold, backgroundColor: "#FBF6E9" },
  rankTopRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  rankIconWrap: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: C.greenSoft,
    alignItems: "center", justifyContent: "center",
  },
  rankIconWrapVIP: { backgroundColor: "#F5E9C8" },
  rankIconText: { fontSize: 22 },
  rankInfo: { flex: 1 },
  rankLabelText: { fontSize: 16, fontWeight: "800", color: C.ink, marginBottom: 2 },
  rankSubText: { fontSize: 12, color: C.muted },
  rankPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  rankPillActive: { backgroundColor: C.greenSoft, borderColor: "rgba(29,158,117,0.4)" },
  rankPillVIP: { backgroundColor: "#F5E9C8", borderColor: C.gold },
  rankPillMuted: { backgroundColor: C.bg, borderColor: C.cardBorder },
  rankPillText: { fontSize: 12, fontWeight: "700" },

  rankProgressTrack: { height: 5, backgroundColor: C.cardBorder, borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  rankProgressFill: { height: "100%", backgroundColor: C.green, borderRadius: 3 },
  rankProgressLabel: { fontSize: 11, color: C.muted, marginBottom: 14 },

  rankMetaRow: { flexDirection: "row", gap: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.cardBorder },
  rankMeta: { flex: 1 },
  rankMetaLabel: { fontSize: 11, color: C.muted, marginBottom: 3 },
  rankMetaValue: { fontSize: 13, color: C.body, fontWeight: "500" },
  rankMetaWarn: { fontSize: 11, color: C.gold, fontWeight: "600", marginTop: 2 },
  rankTapHint: { fontSize: 11, color: C.green, textAlign: "center", marginTop: 12, fontWeight: "500" },

  toolCardLocked: { opacity: 0.7, borderStyle: "dashed" },
});