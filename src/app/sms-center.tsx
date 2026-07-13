// src/app/sms-center.tsx
// Place at: snbx-app/src/app/sms-center.tsx

import {
  View, Text, StyleSheet, StatusBar, Pressable,
  TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, FlatList, Alert,
} from "react-native";
import { useState, useEffect } from "react";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, where, doc, getDoc, deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { router } from "expo-router";
import { C } from "../theme";

const EXTRA = {
  sent:     "#1D9E75",
  received: "#5B7A99",
};

type SmsJob = {
  id: string;
  to?: string;
  from?: string;
  body: string;
  status: string;
  createdAt: any;
  source: "gateway" | "outgoing" | "ghl";
};

function formatTime(ts: any): string {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const now   = new Date();
  const diff  = now.getTime() - date.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function statusColor(status: string): string {
  switch (status) {
    case "sent":      return C.greenDark;
    case "delivered": return C.greenDark;
    case "failed":    return C.error;
    case "queued":    return C.muted;
    default:          return C.muted;
  }
}

function statusIcon(status: string): string {
  switch (status) {
    case "sent":       return "✓";
    case "delivered":  return "✓✓";
    case "failed":     return "✗";
    case "queued":     return "⏳";
    case "processing": return "⏳";
    default:           return "·";
  }
}

// ── Compose Modal ─────────────────────────────────────────────────────────────
function ComposeSheet({
  deviceId, onClose, onSent,
}: { deviceId: string | null; onClose: () => void; onSent: () => void }) {
  const [phone, setPhone]     = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState("");

  const handleSend = async () => {
    if (!phone.trim() || !message.trim()) {
      setError("Please enter a phone number and message.");
      return;
    }
    if (!deviceId) {
      setError("No gateway device linked yet. Activate your gateway first.");
      return;
    }
    setSending(true);
    setError("");
    try {
      // Write to sms_jobs — the gateway with this deviceId picks it up
      await addDoc(collection(db, "sms_jobs"), {
        to:        phone.trim(),
        body:      message.trim(),
        deviceId,
        status:    "queued",
        createdAt: serverTimestamp(),
        userId:    auth.currentUser?.uid ?? "",
        source:    "outgoing",
      });
      onSent();
      onClose();
    } catch (e: any) {
      setError("Failed to queue message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const remaining = 160 - message.length;

  return (
    <View style={cs.sheet}>
      <View style={cs.sheetHandle} />
      <Text style={cs.sheetTitle}>New Message</Text>

      <Text style={cs.label}>To</Text>
      <TextInput
        style={cs.input}
        placeholder="+639XXXXXXXXX"
        placeholderTextColor={C.muted}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <Text style={cs.label}>Message</Text>
      <TextInput
        style={[cs.input, cs.messageInput]}
        placeholder="Type your message…"
        placeholderTextColor={C.muted}
        multiline
        maxLength={320}
        value={message}
        onChangeText={setMessage}
      />
      <Text style={cs.charCount}>{remaining < 0 ? `+${Math.abs(remaining)} (2 SMS)` : `${remaining} chars`}</Text>

      {error ? <Text style={cs.error}>{error}</Text> : null}

      <Pressable
        style={({ pressed }) => [cs.sendBtn, pressed && cs.sendBtnPressed, sending && cs.sendBtnDisabled]}
        onPress={handleSend}
        disabled={sending}
      >
        {sending
          ? <ActivityIndicator color="#FFFFFF" size="small" />
          : <Text style={cs.sendBtnText}>Send via Gateway</Text>
        }
      </Pressable>

      <Pressable style={cs.cancelBtn} onPress={onClose}>
        <Text style={cs.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

// ── Main SMS Center ───────────────────────────────────────────────────────────
export default function SmsCenterScreen() {
  const [tab, setTab]             = useState<"inbox" | "sent">("inbox");
  const [messages, setMessages]   = useState<SmsJob[]>([]);
  const [loading, setLoading]     = useState(true);
  const [composing, setComposing] = useState(false);
  const [refresh, setRefresh]     = useState(0);
  const [deviceId, setDeviceId]   = useState<string | null>(null);
  const [deviceLoading, setDeviceLoading] = useState(true);

  const handleDelete = (id: string, collectionName: "sms_jobs" | "sms_inbox") => {
    const doDelete = async () => {
      try {
        await deleteDoc(doc(db, collectionName, id));
      } catch (e: any) {
        console.error("Delete error:", e);
        // Show the real error on-screen since we can't see console on phone
        Alert.alert("Delete Failed", `${e?.code ?? "unknown"}: ${e?.message ?? "Unknown error"}`);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Delete this message? Hindi na ito maibabalik.")) {
        doDelete();
      }
    } else {
      Alert.alert(
        "Delete Message?",
        "Hindi na ito maibabalik. Sigurado ka bang gusto mong burahin ang message na ito?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: doDelete },
        ]
      );
    }
  };

  // Resolve this user's gateway deviceId from their gateway_status doc.
  // This works even when browsing from a different phone than the gateway.
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setDeviceLoading(false); return; }
    getDoc(doc(db, "gateway_status", uid))
      .then((snap) => {
        setDeviceId(snap.exists() ? (snap.data().deviceId ?? null) : null);
      })
      .catch(() => {})
      .finally(() => setDeviceLoading(false));
  }, []);

  useEffect(() => {
    if (deviceLoading) return;

    // No linked device yet → nothing to show, skip querying
    if (!deviceId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let q;

    if (tab === "inbox") {
      // Only messages received by THIS user's gateway device
      q = query(
        collection(db, "sms_inbox"),
        where("deviceId", "==", deviceId),
        orderBy("createdAt", "desc")
      );
    } else {
      // Only jobs sent through THIS user's gateway device
      // (covers both app-composed and GHL-originated sends)
      q = query(
        collection(db, "sms_jobs"),
        where("deviceId", "==", deviceId),
        orderBy("createdAt", "desc")
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      const msgs: SmsJob[] = [];
      snap.forEach((d) => msgs.push({ id: d.id, ...d.data() } as SmsJob));
      setMessages(msgs);
      setLoading(false);
    }, (err) => {
      if (err.code === "permission-denied" && !auth.currentUser) {
        console.log("SMS listener ended by sign-out (ignored)");
        return;
      }
      console.error("SMS listener error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [tab, refresh, deviceId, deviceLoading]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>←</Text>
        </Pressable>
        <Text style={s.headerTitle}>SMS Center</Text>
        <Pressable style={s.composeBtn} onPress={() => setComposing(true)}>
          <Text style={s.composeBtnText}>+ New</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(["inbox", "sent"] as const).map((t) => (
          <Pressable
            key={t}
            style={[s.tab, tab === t && s.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Messages */}
      {loading || deviceLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.green} size="large" />
        </View>
      ) : !deviceId ? (
        <View style={s.center}>
          <Text style={s.emptyIcon}>📱</Text>
          <Text style={s.emptyText}>
            No gateway linked yet.{"\n"}Activate your SMS Gateway first to start
            sending and receiving.
          </Text>
          <Pressable
            style={s.gatewayBtn}
            onPress={() => router.push("/gateway-setup" as any)}
          >
            <Text style={s.gatewayBtnText}>Go to Gateway Setup</Text>
          </Pressable>
        </View>
      ) : messages.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyIcon}>💬</Text>
          <Text style={s.emptyText}>
            {tab === "inbox"
              ? "No incoming messages yet.\nMessages received via your SIM will appear here."
              : "No sent messages yet.\nTap '+ New' to send your first SMS."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[
              s.msgCard,
              item.source === "gateway" && { borderLeftColor: EXTRA.received, borderLeftWidth: 3 },
              item.source !== "gateway" && { borderLeftColor: EXTRA.sent, borderLeftWidth: 3 },
            ]}>
              <View style={s.msgHeader}>
                <View style={s.msgMeta}>
                  <Text style={s.msgDirection}>
                    {item.source === "gateway" ? "📥 From" : "📤 To"}
                  </Text>
                  <Text style={s.msgPhone}>
                    {item.source === "gateway" ? item.from : item.to}
                  </Text>
                </View>
                <View style={s.msgRight}>
                  {item.source !== "gateway" && (
                    <Text style={[s.msgStatus, { color: statusColor(item.status) }]}>
                      {statusIcon(item.status)} {item.status}
                    </Text>
                  )}
                  <Text style={s.msgTime}>{formatTime(item.createdAt)}</Text>
                </View>
              </View>
              <Text style={s.msgBody}>{item.body}</Text>
              <Pressable
                style={s.deleteBtn}
                onPress={() => handleDelete(item.id, tab === "inbox" ? "sms_inbox" : "sms_jobs")}
              >
                <Text style={s.deleteBtnText}>🗑 Delete</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      {/* Compose overlay */}
      {composing && (
        <KeyboardAvoidingView
          style={s.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={s.overlayBg} onPress={() => setComposing(false)} />
          <ComposeSheet
            deviceId={deviceId}
            onClose={() => setComposing(false)}
            onSent={() => { setTab("sent"); setRefresh((r) => r + 1); }}
          />
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 20,
    paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.cardBorder,
  },
  back: { padding: 4 },
  backText: { fontSize: 22, color: C.muted },
  headerTitle: { fontSize: 17, fontWeight: "800", color: C.ink },
  composeBtn: {
    backgroundColor: C.green, paddingHorizontal: 14,
    paddingVertical: 7, borderRadius: 20,
  },
  composeBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },

  // Tabs
  tabs: {
    flexDirection: "row", paddingHorizontal: 20,
    paddingVertical: 12, gap: 8,
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 20,
    alignItems: "center", backgroundColor: C.cardBg,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  tabActive: { backgroundColor: C.green, borderColor: C.green },
  tabText: { fontSize: 13, fontWeight: "600", color: C.muted },
  tabTextActive: { color: "#FFFFFF" },

  // List
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 14 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 22 },
  gatewayBtn: {
    backgroundColor: C.green, paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 12, marginTop: 18,
  },
  gatewayBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  // Message card
  msgCard: {
    backgroundColor: C.cardBg, borderWidth: 1,
    borderColor: C.cardBorder, borderRadius: 14,
    padding: 14, marginBottom: 10,
  },
  msgHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  msgMeta: { flex: 1 },
  msgDirection: { fontSize: 11, color: C.muted, marginBottom: 2 },
  msgPhone: { fontSize: 14, fontWeight: "700", color: C.ink },
  msgRight: { alignItems: "flex-end" },
  msgStatus: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
  msgTime: { fontSize: 11, color: C.muted },
  msgBody: { fontSize: 14, color: C.body, lineHeight: 20 },

  // Overlay
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", zIndex: 100 },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(13,27,42,0.45)" },
});

const cs = StyleSheet.create({
  sheet: {
    backgroundColor: C.bg, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: C.cardBorder,
    borderRadius: 2, alignSelf: "center", marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: C.ink, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", color: C.ink, marginBottom: 8 },
  input: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: C.ink, marginBottom: 16,
  },
  messageInput: { height: 100, textAlignVertical: "top" },
  charCount: { fontSize: 11, color: C.muted, textAlign: "right", marginTop: -10, marginBottom: 16 },
  error: { fontSize: 13, color: C.error, marginBottom: 12 },
  sendBtn: {
    backgroundColor: C.green, paddingVertical: 16,
    borderRadius: 14, alignItems: "center", marginBottom: 10,
  },
  sendBtnPressed: { backgroundColor: C.greenDark },
  sendBtnDisabled: { opacity: 0.7 },
  sendBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelText: { fontSize: 15, color: C.muted, fontWeight: "500" },

  deleteBtn: { alignSelf: "flex-end", marginTop: 8, paddingVertical: 4, paddingHorizontal: 8 },
  deleteBtnText: { fontSize: 12, color: C.error, fontWeight: "600" },
});