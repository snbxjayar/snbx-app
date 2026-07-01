// src/app/login.tsx
// Place this file at: snbx-app/src/app/login.tsx

import {
  View, Text, TextInput, Pressable, StyleSheet,
  StatusBar, Animated, Easing, KeyboardAvoidingView,
  Platform, ActivityIndicator, Dimensions,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { router } from "expo-router";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

const { width } = Dimensions.get("window");

const C = {
  forestGreen: "#1D9E75",
  darkGreen:   "#1B3A2D",
  midGreen:    "#0F6E56",
  gold:        "#C9A84C",
  navy:        "#0D1B2A",
  navyLight:   "#112236",
  white:       "#FFFFFF",
  offWhite:    "#F0F5F2",
  muted:       "#7A9E8E",
  error:       "#E05A5A",
  inputBg:     "#0F2030",
  border:      "#1A3A2A",
};

export default function LoginScreen() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      // Check status after login
const userDoc = await getDoc(doc(db, "users", cred.user.uid));
const status = userDoc.exists() ? userDoc.data().status : "pending";
if (status === "approved") {
  router.replace("/dashboard" as any);
} else if (status === "rejected") {
  router.replace("/rejected" as any);
} else {
  router.replace("/pending" as any);
}
    } catch (e: any) {
      const msg = e.code === "auth/invalid-credential"
        ? "Invalid email or password."
        : e.code === "auth/user-not-found"
        ? "No account found with this email."
        : e.code === "auth/wrong-password"
        ? "Incorrect password."
        : e.code === "auth/too-many-requests"
        ? "Too many attempts. Try again later."
        : "Login failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <View style={s.bgGlow} />

      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.View style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {/* Back to splash */}
          <Pressable style={s.back} onPress={() => router.back()}>
            <Text style={s.backText}>← Back</Text>
          </Pressable>

          {/* Logo */}
          <View style={s.logoMark}>
            <Text style={s.logoMarkText}>S</Text>
          </View>

          {/* Header */}
          <Text style={s.title}>Welcome back</Text>
          <Text style={s.subtitle}>Sign in to your SNBX Pro account</Text>

          {/* Divider */}
          <View style={s.divider} />

          {/* Email */}
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            placeholder="yourname@email.com"
            placeholderTextColor={C.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />

          {/* Password */}
          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor={C.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {/* Error */}
          {error ? <Text style={s.error}>{error}</Text> : null}

          {/* Login button */}
          <Pressable
            style={({ pressed }) => [s.cta, pressed && s.ctaPressed, loading && s.ctaDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={C.white} />
              : <Text style={s.ctaText}>Sign In</Text>
            }
          </Pressable>

          <Pressable onPress={() => router.push("/signup" as any)}>
  <Text style={{ color: C.muted, fontSize: 13, textAlign: "center", marginTop: -8, marginBottom: 16 }}>
    New here?{" "}
    <Text style={{ color: C.forestGreen, fontWeight: "600" }}>Create Account</Text>
  </Text>
</Pressable>

          {/* Footer note */}
          <Text style={s.footerNote}>
            Don't have an account?{"\n"}
            <Text style={s.footerLink}>Contact your SNBX admin.</Text>
          </Text>

          <Text style={s.domain}>snbxpro.com</Text>

        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.navy },
  bgGlow: {
    position: "absolute", top: "15%", alignSelf: "center",
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: C.darkGreen, opacity: 0.35,
  },
  kav: { flex: 1 },
  content: {
    flex: 1, paddingHorizontal: 28,
    paddingTop: 60, paddingBottom: 32,
  },

  // Back
  back: { marginBottom: 24 },
  backText: { fontSize: 14, color: C.muted, fontWeight: "500" },

  // Logo
  logoMark: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: C.forestGreen,
    alignItems: "center", justifyContent: "center",
    marginBottom: 20, borderWidth: 1, borderColor: C.midGreen,
  },
  logoMarkText: { fontSize: 24, fontWeight: "800", color: C.white },

  // Header
  title: { fontSize: 26, fontWeight: "700", color: C.white, marginBottom: 6 },
  subtitle: { fontSize: 14, color: C.muted, lineHeight: 20 },

  // Divider
  divider: {
    width: 36, height: 2, backgroundColor: C.forestGreen,
    borderRadius: 1, marginVertical: 22, opacity: 0.9,
  },

  // Form
  label: { fontSize: 13, fontWeight: "600", color: C.offWhite, marginBottom: 8, letterSpacing: 0.3 },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 0.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 15,
    color: C.white, marginBottom: 18,
  },

  // Error
  error: {
    fontSize: 13, color: C.error,
    marginBottom: 14, lineHeight: 18,
  },

  // CTA
  cta: {
    backgroundColor: C.forestGreen,
    paddingVertical: 16, borderRadius: 14,
    alignItems: "center", marginBottom: 24,
    borderWidth: 1, borderColor: C.midGreen,
    width: width - 56,
  },
  ctaPressed: { backgroundColor: C.midGreen, transform: [{ scale: 0.97 }] },
  ctaDisabled: { opacity: 0.7 },
  ctaText: { fontSize: 16, fontWeight: "700", color: C.white, letterSpacing: 0.5 },

  // Footer
  footerNote: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  footerLink: { color: C.forestGreen, fontWeight: "600" },
  domain: { fontSize: 12, color: C.muted, textAlign: "center", letterSpacing: 1.2 },
});
