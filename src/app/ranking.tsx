// src/app/ranking.tsx
// SNBX Ranking — the SNBX Program level progression
// Place at: snbx-app/src/app/ranking.tsx

import {
  View, Text, StyleSheet, StatusBar, Pressable, ScrollView,
} from "react-native";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import { router } from "expo-router";
import { C } from "../theme";

// The 7 levels of The SNBX Program — from the official Program guide
const LEVELS = [
  {
    level: "Pawn",
    num: 1,
    icon: "♟",
    tagline: "The First Step",
    plan: "Basic Plan",
    price: "₱999/month",
    desc: "Your first step. The grind begins. Access to the SNBX knowledge base and community.",
    quest: "Refer 3 or more active paying subscribers to unlock Level 2.",
  },
  {
    level: "Rook",
    num: 2,
    icon: "♜",
    tagline: "The Referral Reward",
    plan: "Referral-Based",
    price: "₱799/month",
    desc: "You've leveled up through referrals — your base is growing. Enjoy ₱200/month savings.",
    quest: "Become an active AXA insurance policy holder under Jay-ar to unlock Level 3.",
  },
  {
    level: "Knight",
    num: 3,
    icon: "♞",
    tagline: "Protected. Fearless.",
    plan: "Insurance-Based",
    price: "₱599/month",
    desc: "Ready for battle. You're now protected with an active AXA policy under Jay-ar. More savings unlocked.",
    quest: "Become an active AXA Financial Advisor under Team Puhonan to unlock Level 4.",
  },
  {
    level: "Bishop",
    num: 4,
    icon: "♝",
    tagline: "A Professional. Respected.",
    plan: "Financial Advisor",
    price: "₱399/month",
    desc: "Active AXA Financial Advisor under Team Puhonan. Your journey is paying off — lower every level.",
    quest: "Become an AXA Unit Manager under Team Puhonan to unlock Level 5.",
  },
  {
    level: "Queen",
    num: 5,
    icon: "♛",
    tagline: "A Leader of Leaders",
    plan: "Unit Manager",
    price: "₱199/month",
    desc: "Powerful. Influential. Active AXA Unit Manager under Team Puhonan. Almost free.",
    quest: "Become an AXA Branch Manager under Team Puhonan to unlock Level 6.",
  },
  {
    level: "King",
    num: 6,
    icon: "♚",
    tagline: "You Command the Board",
    plan: "Branch Manager",
    price: "₱99/month",
    desc: "The kingdom is yours. Active AXA Branch Manager under Team Puhonan. One step from free.",
    quest: "Define your own SUCCESS & FREEDOM to achieve the final level.",
  },
  {
    level: "The Master",
    num: 7,
    icon: "👑",
    tagline: "Success & Freedom, Defined",
    plan: "Free Plan",
    price: "FREE",
    desc: "You've achieved your own definition of SUCCESS & FREEDOM. You don't just use the system — you have become the system.",
    quest: null,
  },
];

// Paid "Power Upgrades" — a separate track from Levels
const UPGRADES = [
  {
    name: "Standard",
    price: "₱2,499",
    color: C.green,
    desc: "More email capacity + priority support on top of your Basic features.",
    features: ["250 emails/day (5× more than Basic)", "Priority support", "Unlimited users & contacts"],
  },
  {
    name: "Premium",
    price: "₱4,999",
    color: "#8B6FE8",
    desc: "Full power. AI features, priority support. Para sa umuusog na negosyo!",
    features: ["500 emails/day (2× Standard)", "₱2,000/month usage credit — included", "Premium pay-per-use features", "Extra usage beyond ₱2,000 billed next cycle"],
  },
];

export default function RankingScreen() {
  const [currentLevel, setCurrentLevel] = useState<string>("Pawn");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }
    (async () => {
      try {
        const subSnap = await getDocs(
          query(collection(db, "subscriptions"), where("userId", "==", uid))
        );
        let level = "Pawn";
        subSnap.forEach((d) => {
          const l = d.data().chessLevel;
          if (l) level = l;
        });
        setCurrentLevel(level);
      } catch (e) {
        console.log("Ranking load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currentIndex = LEVELS.findIndex((r) => r.level === currentLevel);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  const progress = Math.round(((safeIndex + 1) / LEVELS.length) * 100);
  const current = LEVELS[safeIndex];

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
        <Text style={s.headerTitle}>SNBX Ranking</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Current rank hero — light card, readable */}
        {!loading && (
          <View style={s.heroCard}>
            <View style={s.heroIconWrap}>
              <Text style={s.heroIcon}>{current.icon}</Text>
            </View>
            <Text style={s.heroLabel}>YOUR CURRENT LEVEL</Text>
            <Text style={s.heroLevel}>Level {current.num} · {current.level}</Text>
            <Text style={s.heroTagline}>{current.tagline}</Text>

            <View style={s.heroProgressTrack}>
              <View style={[s.heroProgressFill, { width: `${progress}%` as any }]} />
            </View>
            <Text style={s.heroProgressText}>
              {progress}% of the journey · {LEVELS.length - safeIndex - 1} level(s) to Master
            </Text>

            {current.quest && (
              <View style={s.questBox}>
                <Text style={s.questLabel}>🎯 NEXT QUEST</Text>
                <Text style={s.questText}>{current.quest}</Text>
              </View>
            )}
          </View>
        )}

        {/* Intro */}
        <Text style={s.intro}>
          Ang SNBX Program ay isang <Text style={s.introBold}>gamified career and business-growth
          journey</Text>. From Pawn to The Master, bawat level ay may kahulugan at may quest.
          Nasaan ka na sa board? ♟️→👑
        </Text>
        <Text style={s.motto}>"It's not just a platform. It's your arena."</Text>

        {/* Full ladder */}
        <Text style={s.sectionLabel}>The 7 Levels</Text>

        {LEVELS.map((rank, i) => {
          const isCurrent  = i === safeIndex;
          const isAchieved = i <= safeIndex;
          const isNext     = i === safeIndex + 1;

          return (
            <View
              key={rank.level}
              style={[
                s.rankCard,
                isCurrent && s.rankCardCurrent,
                !isAchieved && s.rankCardLocked,
              ]}
            >
              <View style={[s.rankIconWrap, isAchieved && s.rankIconWrapAchieved]}>
                <Text style={[s.rankIcon, !isAchieved && s.rankIconLocked]}>
                  {isAchieved ? rank.icon : "🔒"}
                </Text>
              </View>

              <View style={s.rankBody}>
                <View style={s.rankTitleRow}>
                  <Text style={[s.rankLevel, !isAchieved && s.rankLevelLocked]}>
                    Lvl {rank.num} · {rank.level}
                  </Text>
                  {isCurrent && (
                    <View style={s.youBadge}><Text style={s.youBadgeText}>YOU</Text></View>
                  )}
                  {isNext && (
                    <View style={s.nextBadge}><Text style={s.nextBadgeText}>NEXT</Text></View>
                  )}
                </View>

                <View style={s.planRow}>
                  <Text style={s.rankTagline}>{rank.tagline}</Text>
                  <Text style={s.rankPrice}>{rank.price}</Text>
                </View>

                <Text style={s.rankDesc}>{rank.desc}</Text>

                {rank.quest && (
                  <View style={s.miniQuest}>
                    <Text style={s.miniQuestIcon}>🎯</Text>
                    <Text style={s.miniQuestText}>{rank.quest}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* Power Upgrades — separate track */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>Power Upgrades</Text>
        <Text style={s.upgradeIntro}>
          Upgrades are a <Text style={s.introBold}>separate track</Text> — hindi nila pinapalitan
          ang level mo, pinapalakas lang. Available anytime, sa kahit anong level ka.
        </Text>

        {UPGRADES.map((up) => (
          <View key={up.name} style={[s.upgradeCard, { borderLeftColor: up.color, borderLeftWidth: 3 }]}>
            <View style={s.upgradeHeader}>
              <Text style={s.upgradeName}>⚡ {up.name}</Text>
              <Text style={[s.upgradePrice, { color: up.color }]}>{up.price}</Text>
            </View>
            <Text style={s.upgradeDesc}>{up.desc}</Text>
            {up.features.map((f) => (
              <View key={f} style={s.upFeatureRow}>
                <Text style={s.upFeatureCheck}>✓</Text>
                <Text style={s.upFeatureText}>{f}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Two tracks explainer */}
        <View style={s.tracksCard}>
          <Text style={s.tracksTitle}>Levels vs. Upgrades — 2 Separate Tracks</Text>
          <Text style={s.tracksText}>
            <Text style={s.introBold}>Levels</Text> (Pawn → Master) = your journey, your milestones,
            your rewards. Mas mataas ang level, mas MABABA ang bayad mo.{"\n\n"}
            <Text style={s.introBold}>Upgrades</Text> (Standard / Premium) = more power kapag
            kailangan mo — available anytime, sa kahit anong level.
          </Text>
        </View>

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

  // Hero — light green card (readable, on-brand)
  heroCard: {
    backgroundColor: C.greenSoft, borderWidth: 1.5, borderColor: C.green,
    borderRadius: 20, padding: 24, alignItems: "center",
    marginTop: 16, marginBottom: 20,
  },
  heroIconWrap: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: "#FFFFFF",
    borderWidth: 2, borderColor: C.green,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  heroIcon: { fontSize: 40 },
  heroLabel: { fontSize: 11, fontWeight: "700", color: C.greenDark, letterSpacing: 2, marginBottom: 6 },
  heroLevel: { fontSize: 24, fontWeight: "800", color: C.ink, marginBottom: 2 },
  heroTagline: { fontSize: 14, color: C.greenDark, marginBottom: 18, fontWeight: "500" },
  heroProgressTrack: {
    width: "100%", height: 6, backgroundColor: "#D5EAE1",
    borderRadius: 3, overflow: "hidden", marginBottom: 8,
  },
  heroProgressFill: { height: "100%", backgroundColor: C.green, borderRadius: 3 },
  heroProgressText: { fontSize: 12, color: C.body, marginBottom: 4 },

  questBox: {
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: C.gold,
    borderRadius: 12, padding: 14, marginTop: 14, width: "100%",
  },
  questLabel: { fontSize: 11, fontWeight: "800", color: C.gold, letterSpacing: 1, marginBottom: 4 },
  questText: { fontSize: 13, color: C.ink, lineHeight: 19, fontWeight: "500" },

  intro: { fontSize: 13, color: C.body, lineHeight: 21, marginBottom: 12 },
  introBold: { fontWeight: "800", color: C.ink },
  motto: {
    fontSize: 14, color: C.green, fontWeight: "700", fontStyle: "italic",
    textAlign: "center", marginBottom: 24,
  },

  sectionLabel: {
    fontSize: 12, fontWeight: "600", color: C.muted,
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 14,
  },

  // Level cards
  rankCard: {
    flexDirection: "row", gap: 14,
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 16, padding: 16, marginBottom: 10,
  },
  rankCardCurrent: { borderColor: C.green, borderWidth: 2, backgroundColor: C.greenSoft },
  rankCardLocked: { opacity: 0.6 },
  rankIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.cardBorder, alignItems: "center", justifyContent: "center",
  },
  rankIconWrapAchieved: { backgroundColor: C.greenSoft },
  rankIcon: { fontSize: 26 },
  rankIconLocked: { fontSize: 20 },

  rankBody: { flex: 1 },
  rankTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  rankLevel: { fontSize: 15, fontWeight: "800", color: C.ink },
  rankLevelLocked: { color: C.muted },
  youBadge: { backgroundColor: C.green, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  youBadgeText: { fontSize: 10, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.5 },
  nextBadge: { backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.gold, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  nextBadgeText: { fontSize: 10, fontWeight: "800", color: C.gold, letterSpacing: 0.5 },

  planRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  rankTagline: { fontSize: 12, color: C.green, fontWeight: "600", flex: 1 },
  rankPrice: { fontSize: 13, fontWeight: "800", color: C.ink },

  rankDesc: { fontSize: 13, color: C.body, lineHeight: 19, marginBottom: 10 },

  miniQuest: {
    flexDirection: "row", gap: 6, alignItems: "flex-start",
    backgroundColor: C.goldSoft, borderRadius: 10, padding: 10,
  },
  miniQuestIcon: { fontSize: 12 },
  miniQuestText: { fontSize: 12, color: C.ink, flex: 1, lineHeight: 17, fontWeight: "500" },

  // Upgrades
  upgradeIntro: { fontSize: 13, color: C.body, lineHeight: 20, marginBottom: 14 },
  upgradeCard: {
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 16, padding: 18, marginBottom: 12,
  },
  upgradeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  upgradeName: { fontSize: 17, fontWeight: "800", color: C.ink },
  upgradePrice: { fontSize: 20, fontWeight: "800" },
  upgradeDesc: { fontSize: 13, color: C.body, lineHeight: 19, marginBottom: 12 },
  upFeatureRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  upFeatureCheck: { fontSize: 13, color: C.green, fontWeight: "700" },
  upFeatureText: { fontSize: 13, color: C.body, flex: 1, lineHeight: 18 },

  // Tracks explainer
  tracksCard: {
    backgroundColor: C.greenSoft, borderWidth: 1, borderColor: "#CBEADF",
    borderRadius: 14, padding: 16, marginTop: 8, marginBottom: 20,
  },
  tracksTitle: { fontSize: 14, fontWeight: "800", color: C.ink, marginBottom: 10 },
  tracksText: { fontSize: 13, color: C.body, lineHeight: 20 },

  domain: { fontSize: 12, color: C.muted, textAlign: "center", letterSpacing: 1.2 },
});