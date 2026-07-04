// src/app/ghl-hub.tsx
// Place at: snbx-app/src/app/ghl-hub.tsx

import {
  View, Text, StyleSheet, StatusBar, Pressable,
  ScrollView, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useGHLCredentials } from "../hooks/useGHL";
import { C } from "../theme";

const MODULES = [
  {
    icon: "👥",
    label: "Contacts",
    desc: "View, add, edit and tag your GHL contacts",
    route: "/ghl-contacts",
    available: true,
  },
  {
    icon: "📊",
    label: "Pipelines",
    desc: "View opportunities and move stages",
    route: "/ghl-pipelines",
    available: false,
  },
  {
    icon: "📅",
    label: "Calendar",
    desc: "View appointments and manage bookings",
    route: "/ghl-calendar",
    available: false,
  },
  {
    icon: "💬",
    label: "Conversations",
    desc: "View and reply to your GHL inbox",
    route: "/ghl-conversations",
    available: false,
  },
  {
    icon: "📈",
    label: "Reports",
    desc: "Dashboard stats and conversion rates",
    route: "/ghl-reports",
    available: false,
  },
];

export default function GHLHubScreen() {
  const { creds, loading } = useGHLCredentials();

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>←</Text>
        </Pressable>
        <View>
          <Text style={s.headerTitle}>GHL Dashboard</Text>
          <Text style={s.headerSub}>GoHighLevel Integration</Text>
        </View>
        <Pressable
          style={s.settingsBtn}
          onPress={() => router.push("/ghl-settings" as any)}
        >
          <Text style={s.settingsBtnText}>⚙️</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Connection status */}
        {loading ? (
          <ActivityIndicator color={C.green} style={{ marginBottom: 20 }} />
        ) : (
          <View style={[s.statusCard, creds ? s.statusConnected : s.statusDisconnected]}>
            <View style={[s.statusDot, { backgroundColor: creds ? C.green : C.gold }]} />
            <View style={s.statusInfo}>
              <Text style={s.statusTitle}>
                {creds ? "Connected to GHL" : "Not Connected"}
              </Text>
              <Text style={s.statusDesc}>
                {creds
                  ? `Location: ${creds.locationId.slice(0, 8)}...`
                  : "Tap ⚙️ to add your GHL API credentials"}
              </Text>
            </View>
            {!creds && (
              <Pressable
                style={s.connectBtn}
                onPress={() => router.push("/ghl-settings" as any)}
              >
                <Text style={s.connectBtnText}>Connect</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Module grid */}
        <Text style={s.sectionLabel}>GHL Modules</Text>

        {MODULES.map((mod) => (
          <Pressable
            key={mod.label}
            style={({ pressed }) => [
              s.moduleCard,
              !mod.available && s.moduleCardLocked,
              pressed && mod.available && s.moduleCardPressed,
            ]}
            onPress={() => {
              if (!mod.available) return;
              if (!creds) {
                router.push("/ghl-settings" as any);
                return;
              }
              router.push(mod.route as any);
            }}
            disabled={!mod.available}
          >
            <Text style={s.moduleIcon}>{mod.icon}</Text>
            <View style={s.moduleBody}>
              <View style={s.moduleTitleRow}>
                <Text style={[s.moduleLabel, !mod.available && s.moduleLabelLocked]}>
                  {mod.label}
                </Text>
                {!mod.available && (
                  <View style={s.comingSoonBadge}>
                    <Text style={s.comingSoonText}>Coming Soon</Text>
                  </View>
                )}
              </View>
              <Text style={s.moduleDesc}>{mod.desc}</Text>
            </View>
            {mod.available && <Text style={s.moduleArrow}>›</Text>}
          </Pressable>
        ))}

        <Text style={s.domain}>snbxpro.com</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.cardBorder,
  },
  back: { padding: 4 },
  backText: { fontSize: 22, color: C.muted },
  headerTitle: { fontSize: 17, fontWeight: "800", color: C.ink, textAlign: "center" },
  headerSub: { fontSize: 12, color: C.muted, textAlign: "center" },
  settingsBtn: { padding: 4 },
  settingsBtnText: { fontSize: 22 },

  statusCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 16, marginBottom: 20,
  },
  statusConnected: { backgroundColor: C.greenSoft, borderColor: "rgba(29,158,117,0.35)" },
  statusDisconnected: { backgroundColor: C.goldSoft, borderColor: "rgba(184,147,58,0.4)" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusInfo: { flex: 1 },
  statusTitle: { fontSize: 14, fontWeight: "700", color: C.ink, marginBottom: 2 },
  statusDesc: { fontSize: 12, color: C.muted },
  connectBtn: {
    backgroundColor: C.green, paddingHorizontal: 14,
    paddingVertical: 7, borderRadius: 10,
  },
  connectBtnText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },

  sectionLabel: {
    fontSize: 12, fontWeight: "600", color: C.muted,
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 12,
  },

  moduleCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.cardBg, borderWidth: 1,
    borderColor: C.cardBorder, borderRadius: 14,
    padding: 16, marginBottom: 10,
  },
  moduleCardLocked: { opacity: 0.55 },
  moduleCardPressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  moduleIcon: { fontSize: 24 },
  moduleBody: { flex: 1 },
  moduleTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  moduleLabel: { fontSize: 15, fontWeight: "700", color: C.ink },
  moduleLabelLocked: { color: C.muted },
  moduleDesc: { fontSize: 12, color: C.muted },
  moduleArrow: { fontSize: 20, color: C.muted },
  comingSoonBadge: {
    backgroundColor: C.goldSoft, borderWidth: 1,
    borderColor: "rgba(184,147,58,0.4)", borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  comingSoonText: { fontSize: 9, fontWeight: "600", color: C.gold },
  domain: { fontSize: 12, color: C.muted, textAlign: "center", letterSpacing: 1.2, marginTop: 8 },
});