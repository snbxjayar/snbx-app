// src/app/gateway-setup.tsx
// Place at: snbx-app/src/app/gateway-setup.tsx

import {
  View, Text, StyleSheet, StatusBar, Pressable,
  ScrollView, Switch, ActivityIndicator, Platform,
} from "react-native";
import { useState, useEffect } from "react";
import { NativeModules, NativeEventEmitter, PermissionsAndroid } from "react-native";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
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
  success:     "#1D9E75",
};

const { SNBXSmsModule } = NativeModules;

type SimSlot = {
  subscriptionId: number;
  simSlotIndex: number;
  displayName: string;
  number: string;
  carrierName: string;
};

type GatewayStatus = {
  isActive: boolean;
  selectedSim: number | null;
  lastActive: any;
  totalSent: number;
  totalReceived: number;
};

export default function GatewaySetupScreen() {
  const [simSlots, setSimSlots]       = useState<SimSlot[]>([]);
  const [selectedSim, setSelectedSim] = useState<number | null>(null);
  const [gatewayOn, setGatewayOn]     = useState(false);
  const [status, setStatus]           = useState<GatewayStatus | null>(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [permGranted, setPermGranted] = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    loadGatewayStatus();
    if (Platform.OS === "android") {
      requestPermissionsAndLoadSims();
    }
  }, []);

  const loadGatewayStatus = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const ref  = doc(db, "gateway_status", uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as GatewayStatus;
        setStatus(data);
        setGatewayOn(data.isActive);
        setSelectedSim(data.selectedSim);
      }
    } catch (e) {
      console.error("Load gateway status error:", e);
    } finally {
      setLoading(false);
    }
  };

  const requestPermissionsAndLoadSims = async () => {
  try {
    // First request basic permissions
    const permissionsToRequest = [
  PermissionsAndroid.PERMISSIONS.SEND_SMS,
  PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
  PermissionsAndroid.PERMISSIONS.READ_SMS,
  PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
];

if (Platform.OS === "android" && Platform.Version >= 33) {
  permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
}

const grants = await PermissionsAndroid.requestMultiple(permissionsToRequest);

    const allGranted = Object.values(grants).every(
      (g) => g === PermissionsAndroid.RESULTS.GRANTED
    );
    setPermGranted(allGranted);

    if (!allGranted) {
      // Guide user to settings manually
      setError(
        "Permissions denied. Please go to:\nSettings → Apps → SNBX → Permissions → Enable all SMS permissions manually."
      );
      return;
    }

    if (SNBXSmsModule) {
      const slots: SimSlot[] = await SNBXSmsModule.getSimSlots();
      setSimSlots(slots);
      if (slots.length === 1) setSelectedSim(slots[0].subscriptionId);
    }
  } catch (e: any) {
    setError("Could not load SIM info: " + e.message);
  }
};

  const handleToggleGateway = async (val: boolean) => {
  setSaving(true);
  setError("");
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Start or stop the native Android service
    console.log("Starting gateway service...");

    if (Platform.OS === "android" && SNBXSmsModule) {
          console.log("SNBXSmsModule found, calling startGatewayService");

      if (val) {
        await SNBXSmsModule.startGatewayService();
          console.log("startGatewayService called successfully");

      } else {
        await SNBXSmsModule.stopGatewayService();
          console.log("SNBXSmsModule NOT found:", SNBXSmsModule);

      }
    }

    await setDoc(doc(db, "gateway_status", uid), {
      isActive:      val,
      selectedSim:   selectedSim,
      updatedAt:     serverTimestamp(),
      totalSent:     status?.totalSent ?? 0,
      totalReceived: status?.totalReceived ?? 0,
    }, { merge: true });

    setGatewayOn(val);
  } catch (e: any) {
    setError("Failed to update gateway. Try again.");
  } finally {
    setSaving(false);
  }
};

  const handleSaveAndActivate = async () => {
    
    if (!selectedSim) {
      setError("Please select a SIM card first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

       if (Platform.OS === "android" && SNBXSmsModule) {
      await SNBXSmsModule.startGatewayService();
      await SNBXSmsModule.requestBatteryOptimization();
    }

      await setDoc(doc(db, "gateway_status", uid), {
        isActive:      true,
        selectedSim:   selectedSim,
        activatedAt:   serverTimestamp(),
        updatedAt:     serverTimestamp(),
        totalSent:     status?.totalSent ?? 0,
        totalReceived: status?.totalReceived ?? 0,
      }, { merge: true });

      setGatewayOn(true);
    } catch (e: any) {
      setError("Activation failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.loadingRoot}>
        <ActivityIndicator color={C.forestGreen} size="large" />
        <Text style={s.loadingText}>Loading gateway status…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>←</Text>
        </Pressable>
        <Text style={s.headerTitle}>SMS Gateway Setup</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Status card */}
        <Text style={{ color: "yellow", fontSize: 12, textAlign: "center", marginBottom: 8 }}>
  Module: {SNBXSmsModule ? "✓ Loaded" : "✗ Not found"}
</Text>
        <View style={[s.statusCard, gatewayOn && s.statusCardActive]}>
          <View style={s.statusLeft}>
            <View style={[s.statusDot, gatewayOn ? s.statusDotActive : s.statusDotInactive]} />
            <View>
              <Text style={s.statusTitle}>{gatewayOn ? "Gateway Active" : "Gateway Inactive"}</Text>
              <Text style={s.statusSub}>
                {gatewayOn
                  ? "Your phone is sending & receiving SMS"
                  : "Activate to start processing SMS jobs"}
              </Text>
            </View>
          </View>
          {saving
            ? <ActivityIndicator color={C.forestGreen} size="small" />
            : <Switch
                value={gatewayOn}
                onValueChange={handleToggleGateway}
                trackColor={{ false: C.border, true: C.forestGreen }}
                thumbColor={C.white}
              />
          }
        </View>

        {/* Stats row */}
        {status && (
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statValue}>{status.totalSent}</Text>
              <Text style={s.statLabel}>SMS Sent</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statValue}>{status.totalReceived}</Text>
              <Text style={s.statLabel}>SMS Received</Text>
            </View>
          </View>
        )}

        {/* Permission status */}
        <Text style={s.sectionLabel}>Permissions</Text>
        <View style={s.permCard}>
          {[
            { label: "Send SMS",          granted: permGranted },
            { label: "Receive SMS",       granted: permGranted },
            { label: "Read Phone State",  granted: permGranted },
          ].map((p) => (
            <View key={p.label} style={s.permRow}>
              <Text style={s.permLabel}>{p.label}</Text>
              <Text style={[s.permStatus, { color: p.granted ? C.success : C.error }]}>
                {p.granted ? "✓ Granted" : "✗ Required"}
              </Text>
            </View>
          ))}
          {!permGranted && (
            <Pressable style={s.grantBtn} onPress={requestPermissionsAndLoadSims}>
              <Text style={s.grantBtnText}>Grant Permissions</Text>
            </Pressable>
          )}
        </View>

        {/* SIM selection */}
        <Text style={s.sectionLabel}>Select SIM Card</Text>
        {simSlots.length === 0 ? (
          <View style={s.simEmpty}>
            <Text style={s.simEmptyText}>
              {Platform.OS !== "android"
                ? "SIM selection is only available on Android."
                : permGranted
                ? "No SIM cards detected. Make sure your SIM is active."
                : "Grant permissions above to detect your SIM cards."}
            </Text>
          </View>
        ) : (
          simSlots.map((sim) => (
            <Pressable
              key={sim.subscriptionId}
              style={[s.simCard, selectedSim === sim.subscriptionId && s.simCardSelected]}
              onPress={() => setSelectedSim(sim.subscriptionId)}
            >
              <View style={s.simLeft}>
                <View style={[s.simSlotBadge, selectedSim === sim.subscriptionId && s.simSlotBadgeSelected]}>
                  <Text style={s.simSlotText}>SIM {sim.simSlotIndex + 1}</Text>
                </View>
                <View>
                  <Text style={s.simName}>{sim.displayName || `SIM ${sim.simSlotIndex + 1}`}</Text>
                  <Text style={s.simCarrier}>{sim.carrierName}</Text>
                  {sim.number ? <Text style={s.simNumber}>{sim.number}</Text> : null}
                </View>
              </View>
              <View style={[s.simRadio, selectedSim === sim.subscriptionId && s.simRadioSelected]}>
                {selectedSim === sim.subscriptionId && <View style={s.simRadioDot} />}
              </View>
            </Pressable>
          ))
        )}

        {/* How it works */}
        <Text style={s.sectionLabel}>How it works</Text>
        <View style={s.howCard}>
          {[
            { icon: "1️⃣", text: "Activate the gateway and select your SIM" },
            { icon: "2️⃣", text: "Keep the app running (or in background)" },
            { icon: "3️⃣", text: "Outgoing SMS jobs are sent through your SIM" },
            { icon: "4️⃣", text: "Incoming replies are saved to your inbox" },
            { icon: "5️⃣", text: "No Textbee subscription needed — use your own load" },
            { icon: "⚡", text: "Go to Settings → Apps → SNBX Pro → Battery → set to Unrestricted (required for 24/7 SMS)" },
          ].map((step) => (
            <View key={step.icon} style={s.howRow}>
              <Text style={s.howIcon}>{step.icon}</Text>
              <Text style={s.howText}>{step.text}</Text>
            </View>
          ))}
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        {/* Activate button */}
        {!gatewayOn && (
          <Pressable
            style={({ pressed }) => [s.activateBtn, pressed && s.activateBtnPressed, saving && s.activateBtnDisabled]}
            onPress={handleSaveAndActivate}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={C.white} />
              : <Text style={s.activateBtnText}>Activate Gateway</Text>
            }
          </Pressable>
        )}

        <Text style={s.domain}>snbxpro.com</Text>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.navy },
  loadingRoot: { flex: 1, backgroundColor: C.navy, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { fontSize: 14, color: C.muted },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  back: { padding: 4 },
  backText: { fontSize: 22, color: C.muted },
  headerTitle: { fontSize: 17, fontWeight: "700", color: C.white },

  // Status card
  statusCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.navyCard, borderWidth: 0.5, borderColor: C.border,
    borderRadius: 16, padding: 16, marginTop: 20, marginBottom: 12,
  },
  statusCardActive: { borderColor: C.forestGreen },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusDotActive: { backgroundColor: C.forestGreen },
  statusDotInactive: { backgroundColor: C.muted },
  statusTitle: { fontSize: 15, fontWeight: "700", color: C.white, marginBottom: 2 },
  statusSub: { fontSize: 12, color: C.muted, lineHeight: 18 },

  // Stats
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: C.navyCard, borderWidth: 0.5,
    borderColor: C.border, borderRadius: 14, padding: 14, alignItems: "center",
  },
  statValue: { fontSize: 24, fontWeight: "700", color: C.white, marginBottom: 4 },
  statLabel: { fontSize: 12, color: C.muted },

  // Section label
  sectionLabel: {
    fontSize: 12, fontWeight: "600", color: C.muted,
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, marginTop: 4,
  },

  // Permissions
  permCard: {
    backgroundColor: C.navyCard, borderWidth: 0.5, borderColor: C.border,
    borderRadius: 14, padding: 16, marginBottom: 20,
  },
  permRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  permLabel: { fontSize: 14, color: C.offWhite },
  permStatus: { fontSize: 13, fontWeight: "600" },
  grantBtn: {
    backgroundColor: C.forestGreen, borderRadius: 12,
    paddingVertical: 12, alignItems: "center", marginTop: 12,
  },
  grantBtnText: { fontSize: 14, fontWeight: "700", color: C.white },

  // SIM cards
  simCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.navyCard, borderWidth: 0.5, borderColor: C.border,
    borderRadius: 14, padding: 16, marginBottom: 10,
  },
  simCardSelected: { borderColor: C.forestGreen },
  simLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  simSlotBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    backgroundColor: C.border,
  },
  simSlotBadgeSelected: { backgroundColor: C.forestGreen },
  simSlotText: { fontSize: 12, fontWeight: "700", color: C.white },
  simName: { fontSize: 14, fontWeight: "600", color: C.white, marginBottom: 2 },
  simCarrier: { fontSize: 12, color: C.muted },
  simNumber: { fontSize: 12, color: C.forestGreen, marginTop: 2 },
  simRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  simRadioSelected: { borderColor: C.forestGreen },
  simRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.forestGreen },
  simEmpty: {
    backgroundColor: C.navyCard, borderWidth: 0.5, borderColor: C.border,
    borderRadius: 14, padding: 20, marginBottom: 20, alignItems: "center",
  },
  simEmptyText: { fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 22 },

  // How it works
  howCard: {
    backgroundColor: C.navyCard, borderWidth: 0.5, borderColor: C.border,
    borderRadius: 14, padding: 16, marginBottom: 20,
  },
  howRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 6 },
  howIcon: { fontSize: 16 },
  howText: { fontSize: 13, color: C.offWhite, flex: 1, lineHeight: 20 },

  // Error
  error: { fontSize: 13, color: C.error, marginBottom: 14, textAlign: "center" },

  // Activate button
  activateBtn: {
    backgroundColor: C.forestGreen, paddingVertical: 17,
    borderRadius: 14, alignItems: "center", marginBottom: 24,
    borderWidth: 1, borderColor: C.midGreen,
  },
  activateBtnPressed: { backgroundColor: C.midGreen },
  activateBtnDisabled: { opacity: 0.7 },
  activateBtnText: { fontSize: 16, fontWeight: "700", color: C.white, letterSpacing: 0.5 },

  domain: { fontSize: 12, color: C.muted, textAlign: "center", letterSpacing: 1.2 },
});
