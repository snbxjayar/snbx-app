// src/app/pending.tsx
// Place at: snbx-app/src/app/pending.tsx

import {
  View, Text, StyleSheet, StatusBar, Pressable,
  ScrollView, Animated, Easing, Image,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { router } from "expo-router";

const C = {
  green:      "#1D9E75",
  greenDark:  "#0F6E56",
  greenSoft:  "#E6F5EF",
  gold:       "#B8933A",
  goldSoft:   "#FBF6E9",
  ink:        "#0D1B2A",
  body:       "#3D4F5C",
  muted:      "#7A8B96",
  bg:         "#FFFFFF",
  cardBg:     "#FAFBFC",
  cardBorder: "#E8ECEF",
};

// What subscribers can preview while pending (read-only, no actions)
const PREVIEW_FEATURES = [
  { icon: "📊", title: "Dashboard",       desc: "View your subscriber profile and plan details" },
  { icon: "💬", title: "SMS Center",      desc: "Preview the SMS interface (sending locked)" },
  { icon: "💳", title: "Payments",        desc: "View available plans and pricing" },
  { icon: "🛡️", title: "AXA Insurance",  desc: "Learn about protection plans" },
];

const LOCKED_FEATURES = [
  { icon: "🔒", title: "Send SMS",        desc: "Unlocked after approval" },
  { icon: "🔒", title: "Gateway Setup",   desc: "Unlocked after approval" },
  { icon: "🔒", title: "GHL Integration", desc: "Unlocked after approval" },
];

export default function PendingScreen() {
  const [name, setName]   = useState("");
  const fadeAnim          = useRef(new Animated.Value(0)).current;
  const pulseAnim         = useRef(new Animated.Value(1)).current;
  const unsubDocRef       = useRef<(() => void) | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Pulse the pending badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0,  duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Listen for auth state
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Signed out — detach the doc listener BEFORE anything else
        unsubDocRef.current?.();
        unsubDocRef.current = null;
        router.replace("/");
        return;
      }

      // Real-time listener on the user's Firestore doc
      // If admin approves, this fires and redirects automatically
      const userRef = doc(db, "users", user.uid);
      unsubDocRef.current = onSnapshot(userRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setName(data.name ?? "");

        if (data.status === "approved") {
          unsubDocRef.current?.();
          unsubDocRef.current = null;
          router.replace("/dashboard" as any);
        } else if (data.status === "rejected") {
          unsubDocRef.current?.();
          unsubDocRef.current = null;
          signOut(auth);
          router.replace("/rejected" as any);
        }
      });
    });

    return () => {
      unsubAuth();
      unsubDocRef.current?.();
      unsubDocRef.current = null;
    };
  }, []);

  const handleLogout = async () => {
    // Detach the Firestore listener FIRST, then sign out
    unsubDocRef.current?.();
    unsubDocRef.current = null;
    await signOut(auth);
    router.replace("/");
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Header */}
          <View style={s.header}>
            <View style={s.logoMark}>
  <Text style={s.logoMarkText}>S</Text>
</View>
            <Text style={s.brand}>SNBX PRO</Text>
          </View>

          {/* Pending badge */}
          <Animated.View style={[s.pendingCard, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={s.pendingIcon}>⏳</Text>
            <Text style={s.pendingTitle}>Pending Approval</Text>
            <Text style={s.pendingDesc}>
              Hi {name ? name.split(" ")[0] : "there"}! Your account is under review.
              You'll get full access as soon as the admin approves your request.
            </Text>
            <View style={s.pendingBadge}>
              <View style={s.pendingDot} />
              <Text style={s.pendingBadgeText}>This page updates automatically when approved</Text>
            </View>
          </Animated.View>

          {/* While you wait tip */}
          <View style={s.tipCard}>
            <Text style={s.tipIcon}>💡</Text>
            <Text style={s.tipText}>
              <Text style={s.tipBold}>While you wait:</Text> prepare your SMS gateway
              phone — insert your SIM, connect it to WiFi, and plug in the charger.
              You'll be ready to activate the moment you're approved! 🚀
            </Text>
          </View>

          {/* Preview features */}
          <Text style={s.sectionLabel}>Available Now (Preview)</Text>
          {PREVIEW_FEATURES.map((f) => (
            <View key={f.title} style={s.featureCard}>
              <Text style={s.featureIcon}>{f.icon}</Text>
              <View style={s.featureBody}>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </View>
              <Text style={s.featureArrow}>›</Text>
            </View>
          ))}

          {/* Locked features */}
          <Text style={s.sectionLabel}>Unlocked After Approval</Text>
          {LOCKED_FEATURES.map((f) => (
            <View key={f.title} style={[s.featureCard, s.featureCardLocked]}>
              <Text style={s.featureIcon}>{f.icon}</Text>
              <View style={s.featureBody}>
                <Text style={[s.featureTitle, s.featureTitleLocked]}>{f.title}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}

          {/* What happens next */}
          <View style={s.nextCard}>
            <Text style={s.nextTitle}>What happens next?</Text>
            {[
              "Admin reviews your account details",
              "You receive a notification once approved",
              "Full access to SMS, Payments & GHL integration",
            ].map((step, i) => (
              <View key={i} style={s.nextRow}>
                <View style={s.nextNum}><Text style={s.nextNumText}>{i + 1}</Text></View>
                <Text style={s.nextText}>{step}</Text>
              </View>
            ))}
          </View>

          {/* Logout */}
          <Pressable
            style={({ pressed }) => [s.logout, pressed && s.logoutPressed]}
            onPress={handleLogout}
          >
            <Text style={s.logoutText}>Sign Out</Text>
          </Pressable>

          <Text style={s.domain}>snbxpro.com</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 48 },

  header: { alignItems: "center", marginBottom: 24 },
  logoMark: { width: 36, height: 36 },
  logoMarkText: { fontSize: 26, fontWeight: "800", color: "#FFFFFF" },
  brand: { fontSize: 13, fontWeight: "700", color: C.gold, letterSpacing: 6 },

  // Pending card
  pendingCard: {
    backgroundColor: C.goldSoft, borderWidth: 1,
    borderColor: C.gold, borderRadius: 18,
    padding: 24, marginBottom: 14, alignItems: "center",
  },
  pendingIcon: { fontSize: 40, marginBottom: 14 },
  pendingTitle: { fontSize: 20, fontWeight: "800", color: C.ink, marginBottom: 10 },
  pendingDesc: { fontSize: 13, color: C.body, textAlign: "center", lineHeight: 22, marginBottom: 16 },
  pendingBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.greenSoft, borderWidth: 1,
    borderColor: C.green, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  pendingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  pendingBadgeText: { fontSize: 11, color: C.greenDark, fontWeight: "600" },

  // Tip card
  tipCard: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    backgroundColor: C.greenSoft, borderWidth: 1, borderColor: "#CBEADF",
    borderRadius: 14, padding: 14, marginBottom: 24,
  },
  tipIcon: { fontSize: 18 },
  tipText: { flex: 1, fontSize: 13, color: C.body, lineHeight: 20 },
  tipBold: { fontWeight: "700", color: C.ink },

  // Section label
  sectionLabel: {
    fontSize: 12, fontWeight: "600", color: C.muted,
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 10,
  },

  // Feature cards
  featureCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.cardBg, borderWidth: 1,
    borderColor: C.cardBorder, borderRadius: 14,
    padding: 14, marginBottom: 8,
  },
  featureCardLocked: { opacity: 0.55 },
  featureIcon: { fontSize: 20 },
  featureBody: { flex: 1 },
  featureTitle: { fontSize: 14, fontWeight: "700", color: C.ink, marginBottom: 2 },
  featureTitleLocked: { color: C.muted },
  featureDesc: { fontSize: 12, color: C.muted },
  featureArrow: { fontSize: 20, color: C.muted },

  // Next steps
  nextCard: {
    backgroundColor: C.cardBg, borderWidth: 1,
    borderColor: C.cardBorder, borderRadius: 14,
    padding: 16, marginTop: 8, marginBottom: 20,
  },
  nextTitle: { fontSize: 13, fontWeight: "700", color: C.ink, marginBottom: 14 },
  nextRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  nextNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.greenSoft,
    alignItems: "center", justifyContent: "center",
  },
  nextNumText: { fontSize: 11, fontWeight: "700", color: C.greenDark },
  nextText: { fontSize: 13, color: C.body, flex: 1, lineHeight: 20 },

  logout: {
    borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14,
    paddingVertical: 14, alignItems: "center", marginBottom: 20,
  },
  logoutPressed: { opacity: 0.6 },
  logoutText: { fontSize: 15, fontWeight: "600", color: C.muted },
  domain: { fontSize: 12, color: C.muted, textAlign: "center", letterSpacing: 1.2 },
});