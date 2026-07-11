// src/app/resources.tsx
// Resources — required apps + important links for subscribers
// Place at: snbx-app/src/app/resources.tsx

import {
  View, Text, StyleSheet, StatusBar, Pressable, ScrollView, Linking,
} from "react-native";
import { router } from "expo-router";
import { C } from "../theme";

type AppItem = {
  icon: string;
  name: string;
  desc: string;
  androidUrl: string;
  iosUrl?: string;
  installed?: boolean; // SNBX Pro is always "installed" since they're using it
};

type LinkItem = {
  icon: string;
  title: string;
  desc: string;
  url: string;
};

const APPS: AppItem[] = [
  {
    icon: "🟢",
    name: "SNBX Pro App",
    desc: "Ang app na ginagamit mo ngayon — SMS, Payments, at business tools.",
    androidUrl: "https://www.snbxpro.com/app",
    installed: true,
  },
  {
    icon: "🔵",
    name: "HighLevel App",
    desc: "I-manage ang business system mo, contacts, at conversations mula sa phone.",
    androidUrl: "https://play.google.com/store/apps/details?id=com.gohighlevel",
    iosUrl: "https://apps.apple.com/app/highlevel/id1518082601",
  },
  {
    icon: "🟣",
    name: "GoKollab App",
    desc: "Para sa collaboration at pagtutulungan sa community.",
    androidUrl: "https://play.google.com/store/apps/details?id=com.gokollab",
  },
  {
    icon: "🟤",
    name: "Discord App",
    desc: "Dito nagaganap ang mga community discussions at updates.",
    androidUrl: "https://play.google.com/store/apps/details?id=com.discord",
    iosUrl: "https://apps.apple.com/app/discord/id985746746",
  },
];

const LINKS: LinkItem[] = [
  {
    icon: "📘",
    title: "HighLevel Documentation",
    desc: "Official help articles at guides para sa GHL features.",
    url: "https://help.gohighlevel.com/support/solutions",
  },
  {
    icon: "🆕",
    title: "HighLevel Updates",
    desc: "Latest changelog at bagong features ng platform.",
    url: "https://ideas.gohighlevel.com/changelog",
  },
];

function AppCard({ item }: { item: AppItem }) {
  return (
    <View style={s.appCard}>
      <Text style={s.appIcon}>{item.icon}</Text>
      <View style={{ flex: 1 }}>
        <View style={s.appTitleRow}>
          <Text style={s.appName}>{item.name}</Text>
          {item.installed && (
            <View style={s.installedBadge}>
              <Text style={s.installedBadgeText}>✓ You're here</Text>
            </View>
          )}
        </View>
        <Text style={s.appDesc}>{item.desc}</Text>

        {!item.installed && (
          <View style={s.appBtnRow}>
            <Pressable
              style={s.appBtn}
              onPress={() => Linking.openURL(item.androidUrl).catch(() => {})}
            >
              <Text style={s.appBtnText}>Android</Text>
            </Pressable>
            {item.iosUrl && (
              <Pressable
                style={[s.appBtn, s.appBtnSecondary]}
                onPress={() => Linking.openURL(item.iosUrl!).catch(() => {})}
              >
                <Text style={[s.appBtnText, s.appBtnTextSecondary]}>iOS</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function LinkCard({ item }: { item: LinkItem }) {
  return (
    <Pressable
      style={({ pressed }) => [s.linkCard, pressed && { opacity: 0.7 }]}
      onPress={() => Linking.openURL(item.url).catch(() => {})}
    >
      <Text style={s.linkIcon}>{item.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.linkTitle}>{item.title}</Text>
        <Text style={s.linkDesc}>{item.desc}</Text>
      </View>
      <Text style={s.linkArrow}>↗</Text>
    </Pressable>
  );
}

export default function ResourcesScreen() {
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <Pressable
          onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/dashboard" as any); }}
          style={s.back}
        >
          <Text style={s.backText}>←</Text>
        </Pressable>
        <Text style={s.headerTitle}>Resources</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>
          Ito ang mga apps at links na kailangan mo para sa buong SNBX Pro experience.
          I-install ang mga apps sa baba at i-bookmark ang mga resources para hindi ka maligaw! 📚
        </Text>

        <Text style={s.sectionLabel}>Required Apps</Text>
        {APPS.map((app) => (
          <AppCard key={app.name} item={app} />
        ))}

        <Text style={[s.sectionLabel, { marginTop: 8 }]}>Important Links</Text>
        {LINKS.map((link) => (
          <LinkCard key={link.title} item={link} />
        ))}

        <View style={s.helpCard}>
          <Text style={s.helpText}>
            May link o app na dapat idagdag dito? I-message ang SNBX Pro team! 💚
          </Text>
        </View>

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
  headerTitle: { fontSize: 17, fontWeight: "800", color: C.ink },

  intro: { fontSize: 13, color: C.body, lineHeight: 21, marginTop: 16, marginBottom: 20 },

  sectionLabel: {
    fontSize: 12, fontWeight: "600", color: C.muted,
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 12,
  },

  // App cards
  appCard: {
    flexDirection: "row", gap: 14,
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 16, padding: 16, marginBottom: 10,
  },
  appIcon: { fontSize: 28 },
  appTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" },
  appName: { fontSize: 15, fontWeight: "800", color: C.ink },
  installedBadge: {
    backgroundColor: C.greenSoft, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  installedBadgeText: { fontSize: 10, fontWeight: "700", color: C.greenDark },
  appDesc: { fontSize: 12, color: C.muted, lineHeight: 18, marginBottom: 10 },
  appBtnRow: { flexDirection: "row", gap: 8 },
  appBtn: {
    backgroundColor: C.green, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
  },
  appBtnSecondary: { backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder },
  appBtnText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  appBtnTextSecondary: { color: C.body },

  // Link cards
  linkCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 14, padding: 14, marginBottom: 8,
  },
  linkIcon: { fontSize: 22 },
  linkTitle: { fontSize: 14, fontWeight: "700", color: C.ink, marginBottom: 2 },
  linkDesc: { fontSize: 12, color: C.muted },
  linkArrow: { fontSize: 16, color: C.muted },

  helpCard: {
    backgroundColor: C.greenSoft, borderWidth: 1, borderColor: "#CBEADF",
    borderRadius: 14, padding: 16, marginTop: 10, marginBottom: 20,
  },
  helpText: { fontSize: 13, color: C.body, textAlign: "center", lineHeight: 20 },

  domain: { fontSize: 12, color: C.muted, textAlign: "center", letterSpacing: 1.2 },
});