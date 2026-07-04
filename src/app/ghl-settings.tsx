// src/app/ghl-settings.tsx
// Place at: snbx-app/src/app/ghl-settings.tsx

import {
  View, Text, StyleSheet, StatusBar, Pressable,
  ScrollView, TextInput, ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { saveGHLCredentials, loadGHLCredentials, GHLCredentials } from "../hooks/useGHL";
import { C } from "../theme";

export default function GHLSettingsScreen() {
  const [locationId, setLocationId] = useState("");
  const [apiKey, setApiKey]         = useState("");
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(true);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    loadGHLCredentials().then((creds) => {
      if (creds) {
        setLocationId(creds.locationId);
        setApiKey(creds.apiKey);
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!locationId.trim()) return setError("Please enter your GHL Location ID.");
    if (!apiKey.trim())     return setError("Please enter your GHL API Key.");
    setError("");
    setSaving(true);
    try {
      await saveGHLCredentials({
        locationId: locationId.trim(),
        apiKey:     apiKey.trim(),
      });
      setSaved(true);
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (e: any) {
      setError("Failed to save credentials. Please try again.");
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

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>←</Text>
        </Pressable>
        <Text style={s.headerTitle}>GHL Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Info box */}
        <View style={s.infoBox}>
          <Text style={s.infoIcon}>ℹ️</Text>
          <Text style={s.infoText}>
            Your GHL credentials are stored securely in your account and never shared.
            They are used to access your sub-account data inside the app.
          </Text>
        </View>

        {/* Location ID */}
        <Text style={s.label}>GHL Location ID</Text>
        <Text style={s.hint}>Found in GHL → Settings → Business Profile</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. aBcDeF1234567890xyz"
          placeholderTextColor={C.muted}
          autoCapitalize="none"
          autoCorrect={false}
          value={locationId}
          onChangeText={setLocationId}
        />

        {/* API Key */}
        <Text style={s.label}>GHL API Key</Text>
        <Text style={s.hint}>Found in GHL → Settings → API Keys</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          placeholderTextColor={C.muted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          value={apiKey}
          onChangeText={setApiKey}
        />

        {/* How to find */}
        <View style={s.howCard}>
          <Text style={s.howTitle}>How to find your credentials</Text>
          {[
            { step: "1", text: "Login to your GHL sub-account" },
            { step: "2", text: "Go to Settings → Business Profile → scroll down to find Location ID" },
            { step: "3", text: "Go to Settings → API Keys → create or copy existing key" },
            { step: "4", text: "Paste both values above and tap Save" },
          ].map((item) => (
            <View key={item.step} style={s.howRow}>
              <View style={s.howNum}>
                <Text style={s.howNumText}>{item.step}</Text>
              </View>
              <Text style={s.howText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        {saved && (
          <View style={s.successBox}>
            <Text style={s.successText}>✓ Credentials saved successfully!</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [s.saveBtn, pressed && s.saveBtnPressed, saving && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#FFFFFF" size="small" />
            : <Text style={s.saveBtnText}>Save Credentials</Text>
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

  infoBox: {
    flexDirection: "row", gap: 10, backgroundColor: C.greenSoft,
    borderWidth: 1, borderColor: "#CBEADF",
    borderRadius: 12, padding: 14, marginTop: 16, marginBottom: 20,
  },
  infoIcon: { fontSize: 16 },
  infoText: { fontSize: 13, color: C.body, flex: 1, lineHeight: 20 },

  label: { fontSize: 13, fontWeight: "600", color: C.ink, marginBottom: 4 },
  hint: { fontSize: 12, color: C.muted, marginBottom: 8 },
  input: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, color: C.ink, marginBottom: 20,
  },

  howCard: {
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 14, padding: 16, marginBottom: 20,
  },
  howTitle: { fontSize: 13, fontWeight: "700", color: C.ink, marginBottom: 12 },
  howRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  howNum: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: C.greenSoft, alignItems: "center", justifyContent: "center",
  },
  howNumText: { fontSize: 11, fontWeight: "700", color: C.greenDark },
  howText: { fontSize: 13, color: C.body, flex: 1, lineHeight: 20 },

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