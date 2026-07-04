// src/app/payments.tsx
// Place at: snbx-app/src/app/payments.tsx

import {
  View, Text, StyleSheet, StatusBar, Pressable,
  ScrollView, ActivityIndicator, Linking, Alert,
} from "react-native";
import { useState } from "react";
import { auth } from "../firebase";
import { router } from "expo-router";
import { usePayments, PLAN_PRICES, PLAN_FEATURES, PaymentRecord } from "../hooks/usePayments";
import { C } from "../theme";

const PAYMENT_API_URL = "https://snbx-pay.vercel.app/api/create-checkout";

type Tab = "upgrade" | "load" | "history";

function formatPeso(n: number): string {
  return `₱${n.toLocaleString("en-PH")}`;
}

function formatDate(ts: any): string {
  if (!ts) return "—";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function statusColor(status: string): string {
  switch (status) {
    case "paid":    return C.greenDark;
    case "pending": return C.gold;
    case "failed":  return C.error;
    case "expired": return C.muted;
    default:        return C.muted;
  }
}

// ── Plan Upgrade Card ─────────────────────────────────────────────────────────
function PlanCard({
  plan, currentPlan, onSelect, processing,
}: {
  plan: string; currentPlan: string; onSelect: (plan: string) => void; processing: boolean;
}) {
  const isCurrent = plan === currentPlan;
  const price     = PLAN_PRICES[plan];
  const features  = PLAN_FEATURES[plan] ?? [];

  return (
    <View style={[s.planCard, isCurrent && s.planCardCurrent]}>
      {isCurrent && (
        <View style={s.currentBadge}>
          <Text style={s.currentBadgeText}>CURRENT PLAN</Text>
        </View>
      )}
      <Text style={s.planName}>{plan}</Text>
      <View style={s.priceRow}>
        <Text style={s.priceValue}>{formatPeso(price)}</Text>
        <Text style={s.priceUnit}>/month</Text>
      </View>

      <View style={s.featureList}>
        {features.map((f) => (
          <View key={f} style={s.featureRow}>
            <Text style={s.featureCheck}>✓</Text>
            <Text style={s.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [
          s.planBtn,
          isCurrent && s.planBtnDisabled,
          pressed && !isCurrent && s.planBtnPressed,
        ]}
        onPress={() => !isCurrent && onSelect(plan)}
        disabled={isCurrent || processing}
      >
        <Text style={[s.planBtnText, isCurrent && s.planBtnTextDisabled]}>
          {isCurrent ? "Active" : `Upgrade to ${plan}`}
        </Text>
      </Pressable>
    </View>
  );
}

// ── Payment method selector sheet ─────────────────────────────────────────────
function PaymentMethodSheet({
  amount, description, onClose, onConfirm, processing,
}: {
  amount: number; description: string; onClose: () => void;
  onConfirm: (method: string) => void; processing: boolean;
}) {
  const methods = [
    { id: "gcash", label: "GCash",      icon: "💙" },
    { id: "maya",  label: "Maya",       icon: "💚" },
    { id: "card",  label: "Credit/Debit Card", icon: "💳" },
  ];

  return (
    <View style={ps.sheet}>
      <View style={ps.handle} />
      <Text style={ps.title}>Choose Payment Method</Text>
      <Text style={ps.amount}>{formatPeso(amount)}</Text>
      <Text style={ps.desc}>{description}</Text>

      {methods.map((m) => (
        <Pressable
          key={m.id}
          style={({ pressed }) => [ps.methodRow, pressed && ps.methodPressed]}
          onPress={() => onConfirm(m.id)}
          disabled={processing}
        >
          <Text style={ps.methodIcon}>{m.icon}</Text>
          <Text style={ps.methodLabel}>{m.label}</Text>
          {processing
            ? <ActivityIndicator color={C.green} size="small" />
            : <Text style={ps.methodArrow}>›</Text>
          }
        </Pressable>
      ))}

      <Pressable style={ps.cancel} onPress={onClose} disabled={processing}>
        <Text style={ps.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

// ── Main Payments Screen ──────────────────────────────────────────────────────
export default function PaymentsScreen() {
  const [tab, setTab]               = useState<Tab>("upgrade");
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [sheetConfig, setSheetConfig] = useState<{ amount: number; desc: string; type: string; planTarget?: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  const uid = auth.currentUser?.uid;
  const { payments, loading } = usePayments(uid);

  // TODO Phase 3 integration: replace with real current plan from useSubscriber
  const currentPlan = "Standard";

  const openPaymentSheet = (amount: number, desc: string, type: string, planTarget?: string) => {
    setSheetConfig({ amount, desc, type, planTarget });
    setSheetOpen(true);
  };

  const handleConfirmPayment = async (method: string) => {
    if (!sheetConfig || !uid) return;
    setProcessing(true);
    try {
      const res = await fetch(PAYMENT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId:      uid,
          amount:      sheetConfig.amount,
          method,
          type:        sheetConfig.type,
          description: sheetConfig.desc,
          planTarget:  sheetConfig.planTarget ?? null,
        }),
      });

      const data = await res.json();

      if (data.checkoutUrl) {
        setSheetOpen(false);
        await Linking.openURL(data.checkoutUrl);
      } else {
        Alert.alert("Payment Error", data.error ?? "Could not start checkout. Please try again.");
      }
    } catch (e: any) {
      Alert.alert("Connection Error", "Could not reach payment server. Check your internet connection.");
    } finally {
      setProcessing(false);
    }
  };

  const simLoadOptions = [
    { amount: 100, label: "₱100 Load Credit" },
    { amount: 300, label: "₱300 Load Credit" },
    { amount: 500, label: "₱500 Load Credit" },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>←</Text>
        </Pressable>
        <Text style={s.headerTitle}>Payments</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {([
          { id: "upgrade", label: "Upgrade Plan" },
          { id: "load",    label: "SIM Load" },
          { id: "history", label: "History" },
        ] as const).map((t) => (
          <Pressable
            key={t.id}
            style={[s.tab, tab === t.id && s.tabActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[s.tabText, tab === t.id && s.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Upgrade Plan Tab ── */}
        {tab === "upgrade" && (
          <>
            <Text style={s.sectionIntro}>
              Choose the plan that fits your business. Upgrade anytime — changes apply instantly.
            </Text>
            {Object.keys(PLAN_PRICES).map((plan) => (
              <PlanCard
                key={plan}
                plan={plan}
                currentPlan={currentPlan}
                processing={processing}
                onSelect={(p) => openPaymentSheet(
                  PLAN_PRICES[p],
                  `Upgrade to ${p} Plan`,
                  "plan_upgrade",
                  p
                )}
              />
            ))}
          </>
        )}

        {/* ── SIM Load Tab ── */}
        {tab === "load" && (
          <>
            <View style={s.infoBox}>
              <Text style={s.infoIcon}>📱</Text>
              <Text style={s.infoText}>
                Top up your SMS Gateway SIM card load directly. No Textbee subscription needed —
                you use your own SIM and pay only for the load you need.
              </Text>
            </View>

            <Text style={[s.sectionIntro, { marginTop: 8 }]}>Select an amount</Text>

            {simLoadOptions.map((opt) => (
              <Pressable
                key={opt.amount}
                style={({ pressed }) => [s.loadCard, pressed && s.loadCardPressed]}
                onPress={() => openPaymentSheet(opt.amount, opt.label, "sim_load")}
              >
                <View>
                  <Text style={s.loadAmount}>{formatPeso(opt.amount)}</Text>
                  <Text style={s.loadLabel}>{opt.label}</Text>
                </View>
                <Text style={s.loadArrow}>›</Text>
              </Pressable>
            ))}
          </>
        )}

        {/* ── History Tab ── */}
        {tab === "history" && (
          <>
            {loading ? (
              <View style={s.center}>
                <ActivityIndicator color={C.green} size="large" />
              </View>
            ) : payments.length === 0 ? (
              <View style={s.center}>
                <Text style={s.emptyIcon}>🧾</Text>
                <Text style={s.emptyText}>No payment history yet.</Text>
              </View>
            ) : (
              payments.map((p: PaymentRecord) => (
                <View key={p.id} style={s.historyCard}>
                  <View style={s.historyLeft}>
                    <Text style={s.historyDesc}>{p.description}</Text>
                    <Text style={s.historyDate}>{formatDate(p.createdAt)} · {p.method.toUpperCase()}</Text>
                  </View>
                  <View style={s.historyRight}>
                    <Text style={s.historyAmount}>{formatPeso(p.amount)}</Text>
                    <Text style={[s.historyStatus, { color: statusColor(p.status) }]}>
                      {p.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

      </ScrollView>

      {/* Payment method sheet */}
      {sheetOpen && sheetConfig && (
        <View style={s.overlay}>
          <Pressable style={s.overlayBg} onPress={() => !processing && setSheetOpen(false)} />
          <PaymentMethodSheet
            amount={sheetConfig.amount}
            description={sheetConfig.desc}
            processing={processing}
            onClose={() => setSheetOpen(false)}
            onConfirm={handleConfirmPayment}
          />
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.cardBorder,
  },
  back: { padding: 4 },
  backText: { fontSize: 22, color: C.muted },
  headerTitle: { fontSize: 17, fontWeight: "800", color: C.ink },

  tabs: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: "center",
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
  },
  tabActive: { backgroundColor: C.green, borderColor: C.green },
  tabText: { fontSize: 12, fontWeight: "600", color: C.muted },
  tabTextActive: { color: "#FFFFFF" },

  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  sectionIntro: { fontSize: 13, color: C.body, lineHeight: 20, marginBottom: 18 },

  center: { alignItems: "center", justifyContent: "center", padding: 48 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyText: { fontSize: 14, color: C.muted },

  // Plan card
  planCard: {
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 18, padding: 20, marginBottom: 14, position: "relative",
  },
  planCardCurrent: { borderColor: C.green, borderWidth: 1.5 },
  currentBadge: {
    position: "absolute", top: -10, right: 16,
    backgroundColor: C.green, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 10,
  },
  currentBadgeText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.5 },
  planName: { fontSize: 18, fontWeight: "800", color: C.ink, marginBottom: 6 },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 16 },
  priceValue: { fontSize: 28, fontWeight: "800", color: C.green },
  priceUnit: { fontSize: 13, color: C.muted, marginLeft: 4 },
  featureList: { marginBottom: 18 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  featureCheck: { fontSize: 13, color: C.green, fontWeight: "700" },
  featureText: { fontSize: 13, color: C.body, flex: 1 },
  planBtn: {
    backgroundColor: C.green, paddingVertical: 13,
    borderRadius: 12, alignItems: "center",
  },
  planBtnPressed: { backgroundColor: C.greenDark },
  planBtnDisabled: { backgroundColor: C.cardBorder },
  planBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  planBtnTextDisabled: { color: C.muted },

  // Info box
  infoBox: {
    flexDirection: "row", gap: 12, backgroundColor: C.greenSoft,
    borderWidth: 1, borderColor: "#CBEADF", borderRadius: 14,
    padding: 16, marginBottom: 8,
  },
  infoIcon: { fontSize: 22 },
  infoText: { fontSize: 13, color: C.body, flex: 1, lineHeight: 20 },

  // Load card
  loadCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 14, padding: 18, marginBottom: 10,
  },
  loadCardPressed: { opacity: 0.75 },
  loadAmount: { fontSize: 20, fontWeight: "800", color: C.ink, marginBottom: 2 },
  loadLabel: { fontSize: 12, color: C.muted },
  loadArrow: { fontSize: 22, color: C.muted },

  // History card
  historyCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 14, padding: 16, marginBottom: 10,
  },
  historyLeft: { flex: 1 },
  historyDesc: { fontSize: 14, fontWeight: "700", color: C.ink, marginBottom: 4 },
  historyDate: { fontSize: 12, color: C.muted },
  historyRight: { alignItems: "flex-end" },
  historyAmount: { fontSize: 15, fontWeight: "700", color: C.ink, marginBottom: 4 },
  historyStatus: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },

  // Overlay + sheet
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", zIndex: 100 },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(13,27,42,0.45)" },
});

const ps = StyleSheet.create({
  sheet: {
    backgroundColor: C.bg, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  handle: { width: 40, height: 4, backgroundColor: C.cardBorder, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  title: { fontSize: 17, fontWeight: "800", color: C.ink, textAlign: "center", marginBottom: 6 },
  amount: { fontSize: 32, fontWeight: "800", color: C.green, textAlign: "center", marginBottom: 4 },
  desc: { fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 24 },
  methodRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 14, padding: 16, marginBottom: 10,
  },
  methodPressed: { opacity: 0.7 },
  methodIcon: { fontSize: 22 },
  methodLabel: { fontSize: 15, fontWeight: "600", color: C.ink, flex: 1 },
  methodArrow: { fontSize: 20, color: C.muted },
  cancel: { alignItems: "center", paddingVertical: 12, marginTop: 6 },
  cancelText: { fontSize: 15, color: C.muted, fontWeight: "500" },
});