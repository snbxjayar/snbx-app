// src/components/SetupChecklist.tsx
// Live onboarding checklist shown on the dashboard for new subscribers

import {
  View, Text, StyleSheet, Pressable, Platform,
  PermissionsAndroid, Linking,
} from "react-native";
import { useState, useEffect } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { router } from "expo-router";
import * as Application from "expo-application";
import * as Clipboard from "expo-clipboard";
import { C } from "../theme";

const SNBX_MESSENGER_URL = "https://m.me/snbxpro";

type Props = { uid: string };

export default function SetupChecklist({ uid }: Props) {
  const [permsGranted, setPermsGranted]   = useState(false);
  const [gatewayActive, setGatewayActive] = useState(false);
  const [deviceIdSent, setDeviceIdSent]   = useState(false);
  const [dismissed, setDismissed]         = useState(false);
  const [copied, setCopied]               = useState(false);

  // Step 2: check SMS permissions (Android only)
  useEffect(() => {
    if (Platform.OS !== "android") return;
    (async () => {
      try {
        const send = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS);
        const recv = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
        setPermsGranted(send && recv);
      } catch {}
    })();
  }, []);

  // Step 3 + 4 + dismissal: live from Firestore
  useEffect(() => {
    const unsubGateway = onSnapshot(doc(db, "gateway_status", uid), (snap) => {
      setGatewayActive(snap.exists() && snap.data().isActive === true);
    }, () => {});

    const unsubUser = onSnapshot(doc(db, "users", uid), (snap) => {
      if (!snap.exists()) return;
      setDeviceIdSent(snap.data().deviceIdSent === true);
      setDismissed(snap.data().setupDismissed === true);
    }, () => {});

    return () => { unsubGateway(); unsubUser(); };
  }, [uid]);

  const handleSendDeviceId = async () => {
    const deviceId = Platform.OS === "android" ? Application.getAndroidId() : null;
    const messageText = `Hi SNBX Team! Here's my Device ID for SMS setup: ${deviceId ?? "(open Gateway Setup to find it)"}`;

    // Clipboard backup in case Messenger drops the prefill
    await Clipboard.setStringAsync(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);

    try {
      await setDoc(doc(db, "users", uid), { deviceIdSent: true }, { merge: true });
      const url = `https://m.me/snbxpro?text=${encodeURIComponent(messageText)}`;
      await Linking.openURL(url);
    } catch {
      // Messenger not available — clipboard still has the message
    }
  };

  const handleDismiss = async () => {
    try {
      await setDoc(doc(db, "users", uid), { setupDismissed: true }, { merge: true });
    } catch {}
  };

  const steps = [
    { done: true,          label: "Account approved" },
    { done: permsGranted,  label: "SMS permissions granted",   action: () => router.push("/gateway-setup" as any), actionLabel: "Go" },
    { done: gatewayActive, label: "Activate your gateway",     action: () => router.push("/gateway-setup" as any), actionLabel: "Go" },
    { done: deviceIdSent,  label: "Send your Device ID to SNBX", action: handleSendDeviceId, actionLabel: copied ? "✓ Copied!" : "Copy & Message" },
  ];

  const doneCount = steps.filter((st) => st.done).length;
  const allDone   = doneCount === steps.length;

  if (dismissed) return null;

  // All done — collapsed congrats card with dismiss
  if (allDone) {
    return (
      <View style={s.doneCard}>
        <Text style={s.doneText}>✓ Setup complete — you're live! 🎉</Text>
        <Pressable onPress={handleDismiss}>
          <Text style={s.doneDismiss}>Dismiss</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <Text style={s.title}>🚀 Finish Your Setup</Text>
        <Text style={s.progress}>{doneCount} of {steps.length} done</Text>
      </View>

      {/* Progress bar */}
      <View style={s.track}>
        <View style={[s.fill, { width: `${(doneCount / steps.length) * 100}%` as any }]} />
      </View>

      {steps.map((step, i) => (
        <View key={step.label} style={s.stepRow}>
          <View style={[s.check, step.done && s.checkDone]}>
            <Text style={[s.checkText, step.done && s.checkTextDone]}>
              {step.done ? "✓" : i + 1}
            </Text>
          </View>
          <Text style={[s.stepLabel, step.done && s.stepLabelDone]}>
            {step.label}
          </Text>
          {!step.done && step.action && (
            <Pressable style={s.stepBtn} onPress={step.action}>
              <Text style={s.stepBtnText}>{step.actionLabel}</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.greenSoft, borderWidth: 1, borderColor: "#CBEADF",
    borderRadius: 16, padding: 16, marginBottom: 20,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  title: { fontSize: 15, fontWeight: "800", color: C.ink },
  progress: { fontSize: 12, fontWeight: "600", color: C.greenDark },

  track: { height: 5, backgroundColor: "#D5EAE1", borderRadius: 3, marginBottom: 14, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: C.green, borderRadius: 3 },

  stepRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 },
  check: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.muted,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkDone: { backgroundColor: C.green, borderColor: C.green },
  checkText: { fontSize: 12, fontWeight: "700", color: C.muted },
  checkTextDone: { color: "#FFFFFF" },
  stepLabel: { fontSize: 13, color: C.body, flex: 1, fontWeight: "500" },
  stepLabelDone: { color: C.muted, textDecorationLine: "line-through" },
  stepBtn: {
    backgroundColor: C.green, paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 14,
  },
  stepBtnText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },

  doneCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.greenSoft, borderWidth: 1, borderColor: "#CBEADF",
    borderRadius: 14, padding: 14, marginBottom: 20,
  },
  doneText: { fontSize: 14, fontWeight: "700", color: C.greenDark },
  doneDismiss: { fontSize: 12, color: C.muted, fontWeight: "600" },
});