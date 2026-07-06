// src/app/insurance-financial.tsx
// Insurance & Financial — pillar 2 & 3 hub for SNBX subscribers
// Place at: snbx-app/src/app/insurance-financial.tsx

import {
  View, Text, StyleSheet, StatusBar, Pressable, ScrollView, Linking,
} from "react-native";
import { auth } from "../firebase";
import { router } from "expo-router";
import { useSubscriber } from "../hooks/useSubscriber";
import { C } from "../theme";

const BOOKING_URL = "https://jayarermino.com";
const MESSENGER_URL = "https://m.me/snbxpro";

// AXA career path — mirrors the Knight→King ranks
const CAREER_PATH = [
  { role: "Policyholder", icon: "🛡️", desc: "Protected with an active AXA policy" },
  { role: "Advisor",      icon: "📋", desc: "Licensed AXA Financial Advisor" },
  { role: "Unit Manager", icon: "👥", desc: "Leading your own unit" },
  { role: "Branch Manager", icon: "🏛️", desc: "Running a branch" },
];

// Financial wellness tips (Taglish)
const TIPS = [
  {
    icon: "🛟",
    title: "Emergency Fund Muna",
    text: "Bago mag-invest, magkaroon muna ng 3-6 months na gastos na naka-save. Ito ang unang linya ng depensa mo.",
  },
  {
    icon: "☂️",
    title: "Protect What You Build",
    text: "Ang insurance ay hindi gastos — ito ay proteksyon. Kapag may nangyari, hindi masasayang ang pinaghirapan mo.",
  },
  {
    icon: "📊",
    title: "Track Your Cash Flow",
    text: "Alamin kung saan napupunta ang pera mo. Ang hindi mo ma-track, hindi mo ma-improve.",
  },
  {
    icon: "🌱",
    title: "Grow Your Money",
    text: "Ang naka-tabi lang na pera ay nawawalan ng halaga sa inflation. Palaguin mo — pero smart at protektado.",
  },
];

export default function InsuranceFinancialScreen() {
  const uid = auth.currentUser?.uid;
  const { profile } = useSubscriber(uid);

  const hasPolicy = profile?.hasPolicy === true;
  const axaRole   = profile?.axaRole && profile.axaRole !== "none" ? profile.axaRole : null;
  const rank      = profile?.rankLevel ?? "Unranked";
  const onAxaTrack = ["Knight", "Bishop", "Queen", "King"].includes(rank) || !!axaRole;

  const currentRoleIndex = axaRole
    ? CAREER_PATH.findIndex((c) => c.role === axaRole)
    : hasPolicy ? 0 : -1;

  const openBooking = async () => {
    try { await Linking.openURL(BOOKING_URL); } catch {}
  };
  const openMessenger = async () => {
    try { await Linking.openURL(MESSENGER_URL); }
    catch { try { await Linking.openURL("https://www.facebook.com/snbxpro"); } catch {} }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <Pressable
          onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/dashboard" as any); }}
          style={s.back}
        >
          <Text style={s.backText}>←</Text>
        </Pressable>
        <Text style={s.headerTitle}>Insurance & Financial</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Intro */}
        <View style={s.introCard}>
          <Text style={s.introIcon}>🛡️📈</Text>
          <Text style={s.introTitle}>Protect & Grow</Text>
          <Text style={s.introText}>
            Two of the three SNBX pillars: the protection that keeps everything you build safe,
            and the wisdom to turn what you earn into lasting freedom.
          </Text>
        </View>

        {/* ── SECTION 1: My Protection ── */}
        <Text style={s.sectionLabel}>My Protection</Text>
        {hasPolicy ? (
          <View style={s.policyCard}>
            <View style={s.policyHeader}>
              <Text style={s.policyIcon}>✅</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.policyTitle}>Active Policy</Text>
                <Text style={s.policySub}>You're protected under an AXA policy with Coach JR</Text>
              </View>
            </View>
            <Pressable style={s.policyBtn} onPress={openMessenger}>
              <Text style={s.policyBtnText}>Contact My Advisor</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.noPolicyCard}>
            <Text style={s.noPolicyText}>
              You don't have a policy on record yet. Protecting your income and family is the
              foundation of financial security.
            </Text>
            <Pressable style={s.policyBtn} onPress={openBooking}>
              <Text style={s.policyBtnText}>Get Protected — Book a Chat</Text>
            </Pressable>
          </View>
        )}

        {/* ── SECTION 2: Financial Wellness ── */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>Financial Wellness</Text>

        {/* Placeholder for the upcoming Financial Summary feature */}
        <View style={s.summaryPlaceholder}>
          <Text style={s.summaryIcon}>📊</Text>
          <Text style={s.summaryTitle}>Financial Health Summary</Text>
          <Text style={s.summaryText}>
            Coming soon — track your budget and see if your spending is healthy. Malalaman mo
            kung nasaan ka sa financial journey mo.
          </Text>
          <View style={s.comingSoonPill}>
            <Text style={s.comingSoonText}>COMING SOON</Text>
          </View>
        </View>

        {TIPS.map((tip) => (
          <View key={tip.title} style={s.tipCard}>
            <Text style={s.tipIcon}>{tip.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.tipTitle}>{tip.title}</Text>
              <Text style={s.tipText}>{tip.text}</Text>
            </View>
          </View>
        ))}

        {/* FNA booking CTA */}
        <View style={s.fnaCard}>
          <Text style={s.fnaTitle}>Free Financial Needs Analysis</Text>
          <Text style={s.fnaText}>
            Gusto mo bang malaman ang tamang plano para sa'yo? Book a free FNA session with
            Coach JR — walang bayad, walang pressure.
          </Text>
          <Pressable style={s.fnaBtn} onPress={openBooking}>
            <Text style={s.fnaBtnText}>Book Free FNA Session</Text>
          </Pressable>
        </View>

        {/* ── SECTION 3: AXA Career Path (Knight→King ranks) ── */}
        {onAxaTrack && (
          <>
            <Text style={[s.sectionLabel, { marginTop: 24 }]}>Your AXA Career Path</Text>
            <Text style={s.careerIntro}>
              You're on the AXA journey! Each step also levels up your SNBX Ranking. 🏆
            </Text>

            {CAREER_PATH.map((step, i) => {
              const achieved = i <= currentRoleIndex;
              const isCurrent = i === currentRoleIndex;
              return (
                <View key={step.role} style={[s.careerCard, isCurrent && s.careerCardCurrent, !achieved && s.careerCardLocked]}>
                  <View style={[s.careerIconWrap, achieved && s.careerIconWrapDone]}>
                    <Text style={s.careerIcon}>{achieved ? step.icon : "🔒"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.careerTitleRow}>
                      <Text style={[s.careerRole, !achieved && { color: C.muted }]}>{step.role}</Text>
                      {isCurrent && <View style={s.youBadge}><Text style={s.youBadgeText}>YOU</Text></View>}
                    </View>
                    <Text style={s.careerDesc}>{step.desc}</Text>
                  </View>
                </View>
              );
            })}

            <View style={s.careerCta}>
              <Text style={s.careerCtaText}>
                Ready for the next step? Message Coach JR to grow your AXA career with Team Puhonan.
              </Text>
              <Pressable style={s.fnaBtn} onPress={openMessenger}>
                <Text style={s.fnaBtnText}>Talk to Coach JR</Text>
              </Pressable>
            </View>
          </>
        )}

        <Text style={s.domain}>snbxpro.com</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.cardBorder,
  },
  back: { padding: 4 },
  backText: { fontSize: 22, color: C.muted },
  headerTitle: { fontSize: 17, fontWeight: "800", color: C.ink },

  introCard: {
    backgroundColor: C.greenSoft, borderWidth: 1, borderColor: "#CBEADF",
    borderRadius: 18, padding: 22, alignItems: "center", marginTop: 16, marginBottom: 24,
  },
  introIcon: { fontSize: 34, marginBottom: 10 },
  introTitle: { fontSize: 20, fontWeight: "800", color: C.ink, marginBottom: 8 },
  introText: { fontSize: 13, color: C.body, textAlign: "center", lineHeight: 20 },

  sectionLabel: {
    fontSize: 12, fontWeight: "600", color: C.muted,
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 12,
  },

  // Policy
  policyCard: {
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.green,
    borderRadius: 16, padding: 16, marginBottom: 8,
  },
  policyHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  policyIcon: { fontSize: 26 },
  policyTitle: { fontSize: 15, fontWeight: "800", color: C.ink, marginBottom: 2 },
  policySub: { fontSize: 12, color: C.muted, lineHeight: 17 },
  noPolicyCard: {
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 16, padding: 16, marginBottom: 8,
  },
  noPolicyText: { fontSize: 13, color: C.body, lineHeight: 20, marginBottom: 14 },
  policyBtn: { backgroundColor: C.green, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  policyBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  // Financial summary placeholder
  summaryPlaceholder: {
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderStyle: "dashed", borderRadius: 16, padding: 22, alignItems: "center", marginBottom: 16,
  },
  summaryIcon: { fontSize: 32, marginBottom: 10 },
  summaryTitle: { fontSize: 15, fontWeight: "800", color: C.ink, marginBottom: 6 },
  summaryText: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 19, marginBottom: 12 },
  comingSoonPill: { backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.gold, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  comingSoonText: { fontSize: 10, fontWeight: "800", color: C.gold, letterSpacing: 0.5 },

  // Tips
  tipCard: {
    flexDirection: "row", gap: 12, alignItems: "flex-start",
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 14, padding: 14, marginBottom: 8,
  },
  tipIcon: { fontSize: 20 },
  tipTitle: { fontSize: 14, fontWeight: "700", color: C.ink, marginBottom: 3 },
  tipText: { fontSize: 12, color: C.body, lineHeight: 18 },

  // FNA
  fnaCard: {
    backgroundColor: C.ink, borderRadius: 16, padding: 20, marginTop: 12, marginBottom: 8,
  },
  fnaTitle: { fontSize: 16, fontWeight: "800", color: "#FFFFFF", marginBottom: 8 },
  fnaText: { fontSize: 13, color: "#A9BCC9", lineHeight: 20, marginBottom: 16 },
  fnaBtn: { backgroundColor: C.green, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  fnaBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },

  // Career path
  careerIntro: { fontSize: 13, color: C.body, lineHeight: 19, marginBottom: 14 },
  careerCard: {
    flexDirection: "row", gap: 12, alignItems: "center",
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 14, padding: 14, marginBottom: 8,
  },
  careerCardCurrent: { borderColor: C.green, borderWidth: 2, backgroundColor: C.greenSoft },
  careerCardLocked: { opacity: 0.6 },
  careerIconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.cardBorder,
    alignItems: "center", justifyContent: "center",
  },
  careerIconWrapDone: { backgroundColor: C.greenSoft },
  careerIcon: { fontSize: 20 },
  careerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  careerRole: { fontSize: 15, fontWeight: "700", color: C.ink },
  careerDesc: { fontSize: 12, color: C.muted },
  youBadge: { backgroundColor: C.green, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  youBadgeText: { fontSize: 10, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.5 },
  careerCta: {
    backgroundColor: C.greenSoft, borderWidth: 1, borderColor: "#CBEADF",
    borderRadius: 14, padding: 16, marginTop: 6, marginBottom: 8,
  },
  careerCtaText: { fontSize: 13, color: C.body, lineHeight: 19, marginBottom: 14 },

  domain: { fontSize: 12, color: C.muted, textAlign: "center", letterSpacing: 1.2, marginTop: 16 },
});