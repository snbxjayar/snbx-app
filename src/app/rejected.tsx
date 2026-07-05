// src/app/rejected.tsx
// Place at: snbx-app/src/app/rejected.tsx

import {
  View, Text, StyleSheet, StatusBar, Pressable, Image,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { router } from "expo-router";
import { C } from "../theme";

export default function RejectedScreen() {
  const handleBackHome = async () => {
    // Ensure signed out (pending.tsx already signs out before routing here,
    // but this makes the screen safe if reached any other way)
    try { await signOut(auth); } catch {}
    router.replace("/");
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={s.content}>
        {/* Logo */}
        <Image
          source={require("../../assets/images/snbx-logo.png")}
          style={s.logoMark}
          resizeMode="contain"
        />

        <Text style={s.icon}>🙁</Text>
        <Text style={s.title}>Account Not Approved</Text>
        <Text style={s.desc}>
          Your SNBX Pro account request was not approved at this time.
          This can happen if we couldn't verify your details, or if your
          subscription hasn't been confirmed yet.
        </Text>

        <View style={s.helpCard}>
          <Text style={s.helpTitle}>What you can do:</Text>
          <Text style={s.helpText}>
            • Message the SNBX team on Messenger or in the community{"\n"}
            • Double-check your subscription payment{"\n"}
            • Ask us to review your request again — we're happy to help!
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [s.homeBtn, pressed && s.homeBtnPressed]}
          onPress={handleBackHome}
        >
          <Text style={s.homeBtnText}>Back to Home</Text>
        </Pressable>

        <Text style={s.domain}>snbxpro.com</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 28,
  },

  logoMark: { width: 52, height: 52, marginBottom: 28 },
  logoMarkText: { fontSize: 26, fontWeight: "800", color: "#FFFFFF" },

  icon: { fontSize: 44, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "800", color: C.ink, marginBottom: 12, textAlign: "center" },
  desc: {
    fontSize: 14, color: C.body, textAlign: "center",
    lineHeight: 22, marginBottom: 24,
  },

  helpCard: {
    backgroundColor: C.greenSoft, borderWidth: 1, borderColor: "#CBEADF",
    borderRadius: 14, padding: 16, marginBottom: 28, width: "100%",
  },
  helpTitle: { fontSize: 13, fontWeight: "700", color: C.ink, marginBottom: 8 },
  helpText: { fontSize: 13, color: C.body, lineHeight: 22 },

  homeBtn: {
    backgroundColor: C.green, paddingVertical: 16,
    borderRadius: 12, alignItems: "center", width: "100%",
    marginBottom: 24,
  },
  homeBtnPressed: { backgroundColor: C.greenDark },
  homeBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },

  domain: { fontSize: 12, color: C.muted, letterSpacing: 1.2 },
});