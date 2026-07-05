// src/app/welcome.tsx
// One-time welcome carousel shown after first approved login

import {
  View, Text, StyleSheet, StatusBar, Pressable,
  FlatList, Dimensions, Image,
} from "react-native";
import { useState, useRef } from "react";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { router } from "expo-router";
import { C } from "../theme";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    icon: "🎉",
    title: "Welcome to SNBX Pro!",
    desc: "Congrats — your account is approved! You now have your own GHL sub-account with SMS and payments built in. Let's get you set up.",
  },
  {
    icon: "📱",
    title: "Your phone = your SMS machine",
    desc: "This phone will send and receive SMS for your business using your own SIM. Keep it charged, on WiFi, and the app running — parang tindera na laging nasa puwesto! 😄",
  },
  {
    icon: "✅",
    title: "Just 4 easy steps",
    desc: "Follow the setup checklist on your dashboard. Each step checks itself when done. Stuck? Message the SNBX team anytime — we're with you!",
  },
];

export default function WelcomeScreen() {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const isLast = index === SLIDES.length - 1;

  const finish = async () => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, "users", uid), { welcomeSeen: true }, { merge: true });
      } catch {}
    }
    router.replace("/dashboard" as any);
  };

  const next = () => {
    if (isLast) { finish(); return; }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <Pressable style={s.skip} onPress={finish}>
        <Text style={s.skipText}>Skip</Text>
      </Pressable>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item }) => (
          <View style={[s.slide, { width }]}>
            <Text style={s.icon}>{item.icon}</Text>
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.desc}>{item.desc}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={s.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[s.dot, i === index && s.dotActive]} />
        ))}
      </View>

      {/* CTA */}
      <Pressable
        style={({ pressed }) => [s.cta, pressed && s.ctaPressed]}
        onPress={next}
      >
        <Text style={s.ctaText}>{isLast ? "Start Setup →" : "Next"}</Text>
      </Pressable>

      <Text style={s.domain}>snbxpro.com</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: 56, paddingBottom: 40 },
  skip: { position: "absolute", top: 60, right: 24, zIndex: 10, padding: 8 },
  skipText: { fontSize: 14, color: C.muted, fontWeight: "600" },

  slide: { alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  icon: { fontSize: 72, marginBottom: 28 },
  title: { fontSize: 26, fontWeight: "800", color: C.ink, textAlign: "center", marginBottom: 16 },
  desc: { fontSize: 15, color: C.body, textAlign: "center", lineHeight: 24 },

  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.cardBorder },
  dotActive: { backgroundColor: C.green, width: 24 },

  cta: {
    backgroundColor: C.green, marginHorizontal: 28,
    paddingVertical: 16, borderRadius: 14, alignItems: "center", marginBottom: 16,
  },
  ctaPressed: { backgroundColor: C.greenDark },
  ctaText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  domain: { fontSize: 12, color: C.muted, textAlign: "center", letterSpacing: 1.2 },
});