// src/app/edit-profile.tsx
// Place at: snbx-app/src/app/edit-profile.tsx

import {
  View, Text, StyleSheet, StatusBar, Pressable,
  TextInput, ActivityIndicator, ScrollView,
} from "react-native";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { router } from "expo-router";
import { C } from "../theme";

// Preset avatar colors subscribers can choose from
const AVATAR_COLORS = [
  "#1D9E75", // SNBX green
  "#0F6E56", // deep green
  "#B8933A", // gold
  "#5B7A99", // slate blue
  "#8B6FE8", // violet
  "#E07A5A", // terracotta
  "#3D8B7D", // teal
  "#C25B8C", // rose
];

function getInitials(name: string, email: string): string {
  if (name.trim()) {
    return name.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  }
  return (email[0] ?? "S").toUpperCase();
}

export default function EditProfileScreen() {
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }
    getDoc(doc(db, "users", uid))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setName(d.name ?? "");
          setEmail(d.email ?? auth.currentUser?.email ?? "");
          if (d.avatarColor) setAvatarColor(d.avatarColor);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (!name.trim()) { setError("Please enter your name."); return; }

    setError("");
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", uid), {
        name: name.trim(),
        avatarColor,
      });
      setSaved(true);
      setTimeout(() => router.back(), 900);
    } catch (e: any) {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.loadingRoot}>
        <ActivityIndicator color={C.green} size="large" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/dashboard" as any);
          }}
          style={s.back}
        >
          <Text style={s.backText}>←</Text>
        </Pressable>
        <Text style={s.headerTitle}>Edit Profile</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Live avatar preview */}
        <View style={s.previewWrap}>
          <View style={[s.avatar, { backgroundColor: avatarColor }]}>
            <Text style={s.avatarText}>{getInitials(name, email)}</Text>
          </View>
          <Text style={s.previewLabel}>Your Avatar</Text>
        </View>

        {/* Name */}
        <Text style={s.label}>Full Name</Text>
        <TextInput
          style={s.input}
          placeholder="Juan dela Cruz"
          placeholderTextColor={C.muted}
          autoCapitalize="words"
          value={name}
          onChangeText={setName}
        />

        {/* Email (read-only) */}
        <Text style={s.label}>Email</Text>
        <View style={[s.input, s.inputDisabled]}>
          <Text style={s.inputDisabledText}>{email}</Text>
        </View>
        <Text style={s.hint}>Email cannot be changed. Contact SNBX if needed.</Text>

        {/* Avatar color picker */}
        <Text style={[s.label, { marginTop: 8 }]}>Avatar Color</Text>
        <View style={s.colorGrid}>
          {AVATAR_COLORS.map((color) => (
            <Pressable
              key={color}
              style={[
                s.colorDot,
                { backgroundColor: color },
                avatarColor === color && s.colorDotSelected,
              ]}
              onPress={() => setAvatarColor(color)}
            >
              {avatarColor === color && <Text style={s.colorCheck}>✓</Text>}
            </Pressable>
          ))}
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}
        {saved && (
          <View style={s.successBox}>
            <Text style={s.successText}>✓ Profile updated!</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [s.saveBtn, pressed && s.saveBtnPressed, saving && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#FFFFFF" size="small" />
            : <Text style={s.saveBtnText}>Save Changes</Text>
          }
        </Pressable>

        <Text style={s.domain}>snbxpro.com</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadingRoot: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.cardBorder,
  },
  back: { padding: 4 },
  backText: { fontSize: 22, color: C.muted },
  headerTitle: { fontSize: 17, fontWeight: "800", color: C.ink },

  previewWrap: { alignItems: "center", marginTop: 20, marginBottom: 28 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  avatarText: { fontSize: 34, fontWeight: "800", color: "#FFFFFF" },
  previewLabel: { fontSize: 12, color: C.muted },

  label: { fontSize: 13, fontWeight: "600", color: C.ink, marginBottom: 8 },
  hint: { fontSize: 12, color: C.muted, marginTop: -12, marginBottom: 20 },
  input: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: C.ink, marginBottom: 20,
  },
  inputDisabled: { backgroundColor: "#F0F2F4", justifyContent: "center" },
  inputDisabledText: { fontSize: 15, color: C.muted },

  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 24 },
  colorDot: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
  },
  colorDotSelected: { borderWidth: 3, borderColor: C.ink },
  colorCheck: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },

  error: { fontSize: 13, color: C.error, marginBottom: 12 },
  successBox: {
    backgroundColor: C.greenSoft, borderWidth: 1,
    borderColor: "rgba(29,158,117,0.35)", borderRadius: 10,
    padding: 12, marginBottom: 12, alignItems: "center",
  },
  successText: { fontSize: 13, color: C.greenDark, fontWeight: "600" },

  saveBtn: {
    backgroundColor: C.green, paddingVertical: 16,
    borderRadius: 14, alignItems: "center", marginBottom: 20,
  },
  saveBtnPressed: { backgroundColor: C.greenDark },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  domain: { fontSize: 12, color: C.muted, textAlign: "center", letterSpacing: 1.2 },
});