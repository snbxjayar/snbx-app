// src/app/signup.tsx
// Place at: snbx-app/src/app/signup.tsx

import {
  View, Text, TextInput, Pressable, StyleSheet,
  StatusBar, Animated, Easing, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { router } from "expo-router";

const C = {
  forestGreen: "#1D9E75",
  darkGreen:   "#1B3A2D",
  midGreen:    "#0F6E56",
  gold:        "#C9A84C",
  navy:        "#0D1B2A",
  navyCard:    "#0F2030",
  white:       "#FFFFFF",
  offWhite:    "#F0F5F2",
  muted:       "#7A9E8E",
  border:      "#1A3A2A",
  error:       "#E05A5A",
  inputBg:     "#0F2030",
};

export default function SignupScreen() {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
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

  const handleSignup = async () => {
    setError("");

    // ── Validation ────────────────────────────────────────────────────────
    if (!name.trim())            return setError("Please enter your full name.");
    if (!email.trim())           return setError("Please enter your email address.");
    if (password.length < 8)     return setError("Password must be at least 8 characters.");
    if (password !== confirm)    return setError("Passwords do not match.");

    setLoading(true);
    try {
      // 1. Create Firebase Auth account
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid  = cred.user.uid;

      // 2. Create user document in Firestore
      // Status is "pending" by default — admin must approve before full access
      await setDoc(doc(db, "users", uid), {
        name:        name.trim(),
        email:       email.trim().toLowerCase(),
        firebaseUID: uid,
        status:      "pending",    // pending | approved | rejected
        isAdmin:     false,
        ghlContactId: "",
        createdAt:   serverTimestamp(),
      });

      // 3. Navigate to pending screen
      router.replace("/pending" as any);

    } catch (e: any) {
      const msg =
        e.code === "auth/email-already-in-use"
          ? "This email is already registered. Try logging in instead."
          : e.code === "auth/invalid-email"
          ? "Please enter a valid email address."
          : e.code === "auth/weak-password"
          ? "Password is too weak. Use at least 8 characters."
          : "Sign up failed. Please try again.";
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
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* Back */}
            <Pressable style={s.back} onPress={() => router.back()}>
              <Text style={s.backText}>← Back</Text>
            </Pressable>

            {/* Logo */}
            <View style={s.logoMark}>
              <Text style={s.logoMarkText}>S</Text>
            </View>

            {/* Header */}
            <Text style={s.title}>Create Account</Text>
            <Text style={s.subtitle}>
              Join SNBX Pro — your request will be reviewed and approved by the admin.
            </Text>

            <View style={s.divider} />

            {/* Form */}
            <Text style={s.label}>Full Name</Text>
            <TextInput
              style={s.input}
              placeholder="Juan dela Cruz"
              placeholderTextColor={C.muted}
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />

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

            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              placeholder="At least 8 characters"
              placeholderTextColor={C.muted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Text style={s.label}>Confirm Password</Text>
            <TextInput
              style={s.input}
              placeholder="Repeat your password"
              placeholderTextColor={C.muted}
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
            />

            {/* Error */}
            {error ? <Text style={s.error}>{error}</Text> : null}

            {/* CTA */}
            <Pressable
              style={({ pressed }) => [s.cta, pressed && s.ctaPressed, loading && s.ctaDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={C.white} />
                : <Text style={s.ctaText}>Create Account</Text>
              }
            </Pressable>

            {/* Already have account */}
            <Pressable onPress={() => router.push("/login" as any)}>
              <Text style={s.loginLink}>
                Already have an account?{" "}
                <Text style={{ color: C.forestGreen, fontWeight: "600" }}>Sign In</Text>
              </Text>
            </Pressable>

            <Text style={s.domain}>snbxpro.com</Text>

          </Animated.View>
        </ScrollView>
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
  scroll: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  content: { flex: 1 },

  back: { marginBottom: 24 },
  backText: { fontSize: 14, color: C.muted, fontWeight: "500" },

  logoMark: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: C.forestGreen, alignItems: "center",
    justifyContent: "center", marginBottom: 20,
    borderWidth: 1, borderColor: C.midGreen,
  },
  logoMarkText: { fontSize: 24, fontWeight: "800", color: C.white },

  title: { fontSize: 26, fontWeight: "700", color: C.white, marginBottom: 6 },
  subtitle: { fontSize: 13, color: C.muted, lineHeight: 20 },

  divider: {
    width: 36, height: 2, backgroundColor: C.forestGreen,
    borderRadius: 1, marginVertical: 22, opacity: 0.9,
  },

  label: { fontSize: 13, fontWeight: "600", color: C.offWhite, marginBottom: 8, letterSpacing: 0.3 },
  input: {
    backgroundColor: C.inputBg, borderWidth: 0.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: C.white, marginBottom: 16,
  },

  error: { fontSize: 13, color: C.error, marginBottom: 14, lineHeight: 18 },

  cta: {
    backgroundColor: C.forestGreen, paddingVertical: 16,
    borderRadius: 14, alignItems: "center", marginBottom: 20,
    borderWidth: 1, borderColor: C.midGreen,
  },
  ctaPressed: { backgroundColor: C.midGreen },
  ctaDisabled: { opacity: 0.7 },
  ctaText: { fontSize: 16, fontWeight: "700", color: C.white, letterSpacing: 0.5 },

  loginLink: { fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 24 },
  domain: { fontSize: 12, color: C.muted, textAlign: "center", letterSpacing: 1.2 },
});