// src/app/index.tsx
// SNBX Pro — Home / Landing screen (matches snbxpro.com branding)

import {
  View, Text, StyleSheet, StatusBar, Pressable, ScrollView, Image,
} from "react-native";
import { router } from "expo-router";

const C = {
  green:      "#1D9E75",
  greenDark:  "#0F6E56",
  greenSoft:  "#E6F5EF",   // soft green icon circles
  ink:        "#0D1B2A",   // near-black headline
  body:       "#3D4F5C",   // body text
  muted:      "#7A8B96",
  bg:         "#FFFFFF",
  cardBg:     "#FAFBFC",
  cardBorder: "#E8ECEF",
};

const PILLARS = [
  {
    icon: "⚡",
    title: "Software",
    desc: "The tools and systems to build, automate, and grow your professional life online.",
  },
  {
    icon: "🛡️",
    title: "Insurance",
    desc: "The protection that keeps everything you build safe — for you and your family.",
  },
  {
    icon: "📈",
    title: "Financial",
    desc: "The wisdom to turn what you earn into lasting freedom and independence.",
  },
];

export default function HomeScreen() {
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <Image
          source={require("../../assets/images/snbx-logo.png")}
          style={s.logoBadge}
          resizeMode="contain"
        />
        <Text style={s.logoText}>SNBX Pro</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <Text style={s.headline}>
          Build your success.{" "}
          <Text style={s.headlineGreen}>Secure your future.</Text>
          {" "}Find your people.
        </Text>

        <Text style={s.lede}>
          SNBX Pro is built on three things every professional needs — the
          right <Text style={s.ledeBold}>software</Text>, the right{" "}
          <Text style={s.ledeBold}>protection</Text>, and the right{" "}
          <Text style={s.ledeBold}>financial foundation</Text>. Wrapped in a
          community that helps you bring it all together.
        </Text>

        {/* CTA */}
        <Pressable
          style={({ pressed }) => [s.cta, pressed && s.ctaPressed]}
          onPress={() => router.push("/login")}
        >
          <Text style={s.ctaText}>Enter SNBX Pro  →</Text>
        </Pressable>
        <Text style={s.ctaSub}>Your pro journey starts here.</Text>

        {/* Create account */}
        <View style={s.signupRow}>
          <Text style={s.signupText}>New here? </Text>
          <Pressable onPress={() => router.push("/signup")}>
            <Text style={s.signupLink}>Create Account</Text>
          </Pressable>
        </View>

        {/* Section: pillars */}
        <Text style={s.sectionTitle}>
          More than a community.{"\n"}A complete pro program.
        </Text>
        <Text style={s.sectionSub}>
          The Sandbox for Filipino Digital Pros ✨
        </Text>

        {PILLARS.map((p) => (
          <View key={p.title} style={s.card}>
            <View style={s.cardIconCircle}>
              <Text style={s.cardIcon}>{p.icon}</Text>
            </View>
            <Text style={s.cardTitle}>{p.title}</Text>
            <Text style={s.cardDesc}>{p.desc}</Text>
          </View>
        ))}

        <Text style={s.domain}>snbxpro.com</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 24, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: C.cardBorder,
    backgroundColor: C.bg,
  },
  logoBadge: { width: 34, height: 34 },
  logoBadgeText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  logoText: { fontSize: 19, fontWeight: "800", color: C.green },

  scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 },

  // Hero
  headline: {
    fontSize: 32, lineHeight: 40, fontWeight: "800",
    color: C.ink, marginBottom: 18,
    textAlign: "center",
  },
  headlineGreen: { color: C.green },
  lede: { fontSize: 15, lineHeight: 24, color: C.body, marginBottom: 26, textAlign: "center" },
  ledeBold: { fontWeight: "700", color: C.ink },

  // CTA
  cta: {
    backgroundColor: C.green, borderRadius: 12,
    paddingVertical: 17, alignItems: "center",
  },
  ctaPressed: { backgroundColor: C.greenDark },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  ctaSub: {
    fontSize: 13, color: C.green, textAlign: "center",
    marginTop: 10, marginBottom: 8,
  },

  // Signup
  signupRow: {
    flexDirection: "row", justifyContent: "center",
    marginBottom: 40, marginTop: 4,
  },
  signupText: { fontSize: 14, color: C.muted },
  signupLink: { fontSize: 14, color: C.green, fontWeight: "700" },

  // Section
  sectionTitle: {
    fontSize: 22, lineHeight: 30, fontWeight: "800",
    color: C.ink, textAlign: "center", marginBottom: 8,
  },
  sectionSub: {
    fontSize: 14, color: C.muted, textAlign: "center", marginBottom: 22,
  },

  // Pillar cards
  card: {
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 16, padding: 22, alignItems: "center", marginBottom: 14,
  },
  cardIconCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.greenSoft, alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  cardIcon: { fontSize: 24 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: C.ink, marginBottom: 6 },
  cardDesc: {
    fontSize: 14, lineHeight: 22, color: C.body, textAlign: "center",
  },

  domain: {
    fontSize: 12, color: C.muted, textAlign: "center",
    letterSpacing: 1.2, marginTop: 16,
  },
});