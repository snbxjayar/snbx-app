// src/app/payments.tsx
// Place at: snbx-app/src/app/payments.tsx

import {
  View, Text, StyleSheet, StatusBar, Pressable,
  ScrollView, ActivityIndicator, Linking, Modal,
} from "react-native";
import { useState } from "react";
import { auth } from "../firebase";
import { router } from "expo-router";
import { usePayments, PaymentRecord } from "../hooks/usePayments";
import { C } from "../theme";

const PAYMENT_API_URL = "https://snbx-pay.vercel.app/api/create-checkout";

type Tab = "upgrade" | "history";

// ── SNBX Pro plans ──────────────────────────────────────────────
const PLANS = [
  {
    id: "monthly",
    name: "Monthly",
    price: 999,
    period: "/month",
    effective: "₱999/month",
    highlight: null as string | null,
    features: [
      "Your own GHL sub-account",
      "SNBX SMS (your own SIM, ₱0 per text)",
      "SNBX Pay (GCash · Maya · Card)",
      "Team Paangat community + support",
    ],
  },
  {
    id: "6months",
    name: "6 Months",
    price: 4999,
    period: "/6 months",
    effective: "₱833/month",
    highlight: "1 MONTH FREE",
    features: [
      "Everything in Monthly",
      "Save ₱995 vs monthly",
      "Locked-in price for 6 months",
      "Priority onboarding",
    ],
  },
  {
    id: "annual",
    name: "1 Year",
    price: 7999,
    period: "/year",
    effective: "₱667/month",
    highlight: "BEST DEAL · 4 MONTHS FREE",
    features: [
      "Everything in 6 Months",
      "Save ₱3,989 vs monthly",
      "Best price per month",
      "1-on-1 onboarding session",
    ],
  },
];

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

// ── Plan Card ────────────────────────────────────────────────────
function PlanCard({
  plan, onSelect, processing,
}: {
  plan: typeof PLANS[number];
  onSelect: (plan: typeof PLANS[number]) => void;
  processing: boolean;
}) {
  const isBest = plan.id === "annual";

  return (
    <View style={[s.planCard, isBest && s.planCardBest]}>
      {plan.highlight && (
        <View style={[s.ribbon, isBest && s.ribbonBest]}>
          <Text style={s.ribbonText}>{plan.highlight}</Text>
        </View>
      )}

      <Text style={s.planName}>{plan.name}</Text>
      <View style={s.priceRow}>
        <Text style={s.priceValue}>{formatPeso(plan.price)}</Text>
        <Text style={s.priceUnit}>{plan.period}</Text>
      </View>
      <Text style={s.effective}>≈ {plan.effective}</Text>

      <View style={s.featureList}>
        {plan.features.map((f) => (
          <View key={f} style={s.featureRow}>
            <Text style={s.featureCheck}>✓</Text>
            <Text style={s.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [s.planBtn, isBest && s.planBtnBest, pressed && s.planBtnPressed]}
        onPress={() => onSelect(plan)}
        disabled={processing}
      >
        <Text style={s.planBtnText}>Upgrade — {formatPeso(plan.price)}</Text>
      </Pressable>
    </View>
  );
}

// ── Main Payments Screen ─────────────────────────────────────────
export default function PaymentsScreen() {
  const [tab, setTab]               = useState<Tab>("upgrade");
  const [processing, setProcessing] = useState(false);

  const uid = auth.currentUser?.uid;
  const { payments, loading } = usePayments(uid);

  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[number] | null>(null);

  const handleUpgrade = (plan: typeof PLANS[number]) => {
    setSelectedPlan(plan);
  };

  const handleMessageSNBX = async () => {
    const planName = selectedPlan?.name ?? "";
    const price = selectedPlan ? `₱${selectedPlan.price.toLocaleString("en-PH")}` : "";
    const url = `https://m.me/snbxpro`;
    const fbUrl = `https://www.facebook.com/snbxpro`;
    try {
      await Linking.openURL(url);
    } catch {
      try { await Linking.openURL(fbUrl); } catch {}
    }
    setSelectedPlan(null);
  };

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
        <Text style={s.headerTitle}>Upgrade Plan</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {([
          { id: "upgrade", label: "Upgrade Plan" },
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

        {/* ── Upgrade Tab ── */}
        {tab === "upgrade" && (
          <>
            <Text style={s.sectionIntro}>
              Choose the plan that fits your business. Longer commitment = bigger savings.
              All plans include SMS, Payments, and your GHL sub-account.
            </Text>
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                processing={processing}
                onSelect={handleUpgrade}
              />
            ))}
            <Text style={s.note}>
              💡 SMS uses your own SIM load (₱0 per text). Payment processing fees may apply on
              payments you receive via SNBX Pay.
            </Text>
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
                    <Text style={s.historyDate}>
                      {formatDate(p.createdAt)}{p.method ? ` · ${p.method.toUpperCase()}` : ""}
                    </Text>
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
      {/* Upgrade info modal */}
      <Modal
        visible={!!selectedPlan}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPlan(null)}
      >
        <View style={s.modalOverlay}>
          <Pressable style={s.modalBg} onPress={() => setSelectedPlan(null)} />
          <View style={s.modalCard}>
            <Text style={s.modalIcon}>🚀</Text>
            <Text style={s.modalTitle}>Let's Get You Upgraded!</Text>

            {selectedPlan && (
              <View style={s.modalPlanBox}>
                <Text style={s.modalPlanName}>{selectedPlan.name} Plan</Text>
                <Text style={s.modalPlanPrice}>
                  ₱{selectedPlan.price.toLocaleString("en-PH")}{selectedPlan.period}
                </Text>
              </View>
            )}

            <Text style={s.modalDesc}>
              To upgrade, message the <Text style={s.modalBold}>SNBX Pro</Text> Facebook Page.
              Our team will:
            </Text>

            <View style={s.modalSteps}>
              {[
                "Confirm your plan and payment details",
                "Guide you through payment (GCash / Maya)",
                "Schedule your onboarding session",
                "Set up your SMS + Payments — together!",
              ].map((step, i) => (
                <View key={i} style={s.modalStepRow}>
                  <View style={s.modalStepNum}>
                    <Text style={s.modalStepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={s.modalStepText}>{step}</Text>
                </View>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [s.modalBtn, pressed && s.modalBtnPressed]}
              onPress={handleMessageSNBX}
            >
              <Text style={s.modalBtnText}>Message SNBX Pro Page</Text>
            </Pressable>

            <Pressable style={s.modalCancel} onPress={() => setSelectedPlan(null)}>
              <Text style={s.modalCancelText}>Maybe later</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────
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
  note: {
    fontSize: 12, color: C.muted, lineHeight: 18, marginTop: 4,
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 12, padding: 14,
  },

  center: { alignItems: "center", justifyContent: "center", padding: 48 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyText: { fontSize: 14, color: C.muted },

  // Plan card
  planCard: {
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 18, padding: 20, marginBottom: 14, position: "relative",
  },
  planCardBest: { borderColor: C.green, borderWidth: 2 },
  ribbon: {
    position: "absolute", top: -10, right: 16,
    backgroundColor: C.gold, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 10,
  },
  ribbonBest: { backgroundColor: C.green },
  ribbonText: { fontSize: 10, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.5 },
  planName: { fontSize: 18, fontWeight: "800", color: C.ink, marginBottom: 6 },
  priceRow: { flexDirection: "row", alignItems: "baseline" },
  priceValue: { fontSize: 28, fontWeight: "800", color: C.green },
  priceUnit: { fontSize: 13, color: C.muted, marginLeft: 4 },
  effective: { fontSize: 12, color: C.muted, marginBottom: 16, marginTop: 2 },
  featureList: { marginBottom: 18 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  featureCheck: { fontSize: 13, color: C.green, fontWeight: "700" },
  featureText: { fontSize: 13, color: C.body, flex: 1, lineHeight: 19 },
  planBtn: {
    backgroundColor: C.green, paddingVertical: 13,
    borderRadius: 12, alignItems: "center",
  },
  planBtnBest: { backgroundColor: C.green },
  planBtnPressed: { backgroundColor: C.greenDark },
  planBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

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

  // Upgrade modal
  modalOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", padding: 24 },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(13,27,42,0.5)" },
  modalCard: {
    backgroundColor: C.bg, borderRadius: 24, padding: 26,
    width: "100%", maxWidth: 400, alignItems: "center",
  },
  modalIcon: { fontSize: 44, marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: C.ink, marginBottom: 16, textAlign: "center" },
  modalPlanBox: {
    backgroundColor: C.greenSoft, borderWidth: 1, borderColor: "#CBEADF",
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20,
    alignItems: "center", marginBottom: 18, width: "100%",
  },
  modalPlanName: { fontSize: 13, fontWeight: "700", color: C.greenDark, marginBottom: 2 },
  modalPlanPrice: { fontSize: 22, fontWeight: "800", color: C.green },
  modalDesc: { fontSize: 14, color: C.body, textAlign: "center", lineHeight: 21, marginBottom: 16 },
  modalBold: { fontWeight: "800", color: C.ink },
  modalSteps: { width: "100%", marginBottom: 22 },
  modalStepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  modalStepNum: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: C.greenSoft,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  modalStepNumText: { fontSize: 11, fontWeight: "700", color: C.greenDark },
  modalStepText: { fontSize: 13, color: C.body, flex: 1, lineHeight: 20 },
  modalBtn: {
    backgroundColor: C.green, paddingVertical: 15, borderRadius: 14,
    alignItems: "center", width: "100%", marginBottom: 10,
  },
  modalBtnPressed: { backgroundColor: C.greenDark },
  modalBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  modalCancel: { paddingVertical: 8 },
  modalCancelText: { fontSize: 14, color: C.muted, fontWeight: "500" },
});