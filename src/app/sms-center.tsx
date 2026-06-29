// src/app/sms-center.tsx
// Place at: snbx-app/src/app/sms-center.tsx

import {
  View, Text, StyleSheet, StatusBar, Pressable,
  ScrollView, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, FlatList,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, where,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { router } from "expo-router";

const C = {
  forestGreen: "#1D9E75",
  darkGreen:   "#1B3A2D",
  midGreen:    "#0F6E56",
  navy:        "#0D1B2A",
  navyCard:    "#0F2030",
  navyDeep:    "#091624",
  white:       "#FFFFFF",
  offWhite:    "#F0F5F2",
  muted:       "#7A9E8E",
  border:      "#1A3A2A",
  error:       "#E05A5A",
  sent:        "#1D9E75",
  received:    "#1A3A4A",
};

type SmsJob = {
  id: string;
  to?: string;
  from?: string;
  body: string;
  status: string;
  createdAt: any;
  source: "gateway" | "outgoing";
};

type Conversation = {
  phone: string;
  lastMessage: string;
  lastTime: any;
  unread: number;
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
    case "sent":      return C.forestGreen;
    case "delivered": return C.forestGreen;
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
function ComposeSheet({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [phone, setPhone]     = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState("");

  const handleSend = async () => {
    if (!phone.trim() || !message.trim()) {
      setError("Please enter a phone number and message.");
      return;
    }
    setSending(true);
    setError("");
    try {
      // Write to sms_jobs — GatewayService picks this up and sends via SIM
      await addDoc(collection(db, "sms_jobs"), {
        to:        phone.trim(),
        body:      message.trim(),
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
          ? <ActivityIndicator color={C.white} size="small" />
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
  const [tab, setTab]             = useState<"inbox" | "sent" | "all">("inbox");
  const [messages, setMessages]   = useState<SmsJob[]>([]);
  const [loading, setLoading]     = useState(true);
  const [composing, setComposing] = useState(false);
  const [refresh, setRefresh]     = useState(0);

  useEffect(() => {
    setLoading(true);
    let q;

    if (tab === "inbox") {
      q = query(
        collection(db, "sms_inbox"),
        orderBy("createdAt", "desc")
      );
    } else if (tab === "sent") {
      q = query(
        collection(db, "sms_jobs"),
        where("userId", "==", auth.currentUser?.uid ?? ""),
        orderBy("createdAt", "desc")
      );
    } else {
      q = query(
        collection(db, "sms_jobs"),
        orderBy("createdAt", "desc")
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      const msgs: SmsJob[] = [];
      snap.forEach((d) => msgs.push({ id: d.id, ...d.data() } as SmsJob));
      setMessages(msgs);
      setLoading(false);
    }, (err) => {
      console.error("SMS listener error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [tab, refresh]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

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
        {(["inbox", "sent", "all"] as const).map((t) => (
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
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.forestGreen} size="large" />
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
              item.source === "gateway" && { borderLeftColor: C.received, borderLeftWidth: 3 },
              item.source === "outgoing" && { borderLeftColor: C.sent, borderLeftWidth: 3 },
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
                  {item.source === "outgoing" && (
                    <Text style={[s.msgStatus, { color: statusColor(item.status) }]}>
                      {statusIcon(item.status)} {item.status}
                    </Text>
                  )}
                  <Text style={s.msgTime}>{formatTime(item.createdAt)}</Text>
                </View>
              </View>
              <Text style={s.msgBody}>{item.body}</Text>
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
  root: { flex: 1, backgroundColor: C.navy },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 20,
    paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  back: { padding: 4 },
  backText: { fontSize: 22, color: C.muted },
  headerTitle: { fontSize: 17, fontWeight: "700", color: C.white },
  composeBtn: {
    backgroundColor: C.forestGreen, paddingHorizontal: 14,
    paddingVertical: 7, borderRadius: 20,
  },
  composeBtnText: { fontSize: 13, fontWeight: "700", color: C.white },

  // Tabs
  tabs: {
    flexDirection: "row", paddingHorizontal: 20,
    paddingVertical: 12, gap: 8,
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 20,
    alignItems: "center", backgroundColor: C.navyCard,
    borderWidth: 0.5, borderColor: C.border,
  },
  tabActive: { backgroundColor: C.forestGreen, borderColor: C.forestGreen },
  tabText: { fontSize: 13, fontWeight: "600", color: C.muted },
  tabTextActive: { color: C.white },

  // List
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 14 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 22 },

  // Message card
  msgCard: {
    backgroundColor: C.navyCard, borderWidth: 0.5,
    borderColor: C.border, borderRadius: 14,
    padding: 14, marginBottom: 10,
  },
  msgHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  msgMeta: { flex: 1 },
  msgDirection: { fontSize: 11, color: C.muted, marginBottom: 2 },
  msgPhone: { fontSize: 14, fontWeight: "600", color: C.white },
  msgRight: { alignItems: "flex-end" },
  msgStatus: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
  msgTime: { fontSize: 11, color: C.muted },
  msgBody: { fontSize: 14, color: C.offWhite, lineHeight: 20 },

  // Overlay
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", zIndex: 100 },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
});

const cs = StyleSheet.create({
  sheet: {
    backgroundColor: C.navyCard, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
    borderWidth: 0.5, borderColor: C.border,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: C.border,
    borderRadius: 2, alignSelf: "center", marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: C.white, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", color: C.offWhite, marginBottom: 8 },
  input: {
    backgroundColor: C.navy, borderWidth: 0.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: C.white, marginBottom: 16,
  },
  messageInput: { height: 100, textAlignVertical: "top" },
  charCount: { fontSize: 11, color: C.muted, textAlign: "right", marginTop: -10, marginBottom: 16 },
  error: { fontSize: 13, color: C.error, marginBottom: 12 },
  sendBtn: {
    backgroundColor: C.forestGreen, paddingVertical: 16,
    borderRadius: 14, alignItems: "center", marginBottom: 10,
  },
  sendBtnPressed: { backgroundColor: C.midGreen },
  sendBtnDisabled: { opacity: 0.7 },
  sendBtnText: { fontSize: 16, fontWeight: "700", color: C.white },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelText: { fontSize: 15, color: C.muted, fontWeight: "500" },
});
