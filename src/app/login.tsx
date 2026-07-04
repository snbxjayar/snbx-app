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
  green:      "#1D9E75",
  greenDark:  "#0F6E56",
  greenSoft:  "#E6F5EF",
  ink:        "#0D1B2A",
  body:       "#3D4F5C",
  muted:      "#7A8B96",
  bg:         "#FFFFFF",
  inputBg:    "#FAFBFC",
  cardBorder: "#E8ECEF",
  error:      "#D64545",
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
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

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
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={s.ctaText}>Sign In</Text>
            }
          </Pressable>

          <Pressable onPress={() => router.push("/signup" as any)}>
            <Text style={{ color: C.muted, fontSize: 13, textAlign: "center", marginTop: -8, marginBottom: 16 }}>
              New here?{" "}
              <Text style={{ color: C.green, fontWeight: "600" }}>Create Account</Text>
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
  root: { flex: 1, backgroundColor: C.bg },
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
    backgroundColor: C.green,
    alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  logoMarkText: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },

  // Header
  title: { fontSize: 26, fontWeight: "800", color: C.ink, marginBottom: 6 },
  subtitle: { fontSize: 14, color: C.muted, lineHeight: 20 },

  // Divider
  divider: {
    width: 36, height: 3, backgroundColor: C.green,
    borderRadius: 2, marginVertical: 22,
  },

  // Form
  label: { fontSize: 13, fontWeight: "600", color: C.ink, marginBottom: 8, letterSpacing: 0.3 },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 15,
    color: C.ink, marginBottom: 18,
  },

  // Error
  error: {
    fontSize: 13, color: C.error,
    marginBottom: 14, lineHeight: 18,
  },

  // CTA
  cta: {
    backgroundColor: C.green,
    paddingVertical: 16, borderRadius: 12,
    alignItems: "center", marginBottom: 24,
    width: width - 56,
  },
  ctaPressed: { backgroundColor: C.greenDark, transform: [{ scale: 0.97 }] },
  ctaDisabled: { opacity: 0.7 },
  ctaText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.5 },

  // Footer
  footerNote: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  footerLink: { color: C.green, fontWeight: "600" },
  domain: { fontSize: 12, color: C.muted, textAlign: "center", letterSpacing: 1.2 },
});