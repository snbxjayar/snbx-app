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
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

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
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={s.ctaText}>Create Account</Text>
              }
            </Pressable>

            {/* Already have account */}
            <Pressable onPress={() => router.push("/login" as any)}>
              <Text style={s.loginLink}>
                Already have an account?{" "}
                <Text style={{ color: C.green, fontWeight: "600" }}>Sign In</Text>
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
  root: { flex: 1, backgroundColor: C.bg },
  kav: { flex: 1 },
  scroll: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  content: { flex: 1 },

  back: { marginBottom: 24 },
  backText: { fontSize: 14, color: C.muted, fontWeight: "500" },

  logoMark: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: C.green, alignItems: "center",
    justifyContent: "center", marginBottom: 20,
  },
  logoMarkText: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },

  title: { fontSize: 26, fontWeight: "800", color: C.ink, marginBottom: 6 },
  subtitle: { fontSize: 13, color: C.muted, lineHeight: 20 },

  divider: {
    width: 36, height: 3, backgroundColor: C.green,
    borderRadius: 2, marginVertical: 22,
  },

  label: { fontSize: 13, fontWeight: "600", color: C.ink, marginBottom: 8, letterSpacing: 0.3 },
  input: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: C.ink, marginBottom: 16,
  },

  error: { fontSize: 13, color: C.error, marginBottom: 14, lineHeight: 18 },

  cta: {
    backgroundColor: C.green, paddingVertical: 16,
    borderRadius: 12, alignItems: "center", marginBottom: 20,
  },
  ctaPressed: { backgroundColor: C.greenDark },
  ctaDisabled: { opacity: 0.7 },
  ctaText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.5 },

  loginLink: { fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 24 },
  domain: { fontSize: 12, color: C.muted, textAlign: "center", letterSpacing: 1.2 },
});