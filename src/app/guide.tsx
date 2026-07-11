// src/app/guide.tsx
// How to Use — in-app guide hub for SNBX Pro features
// Place at: snbx-app/src/app/guide.tsx

import {
  View, Text, StyleSheet, StatusBar, Pressable, ScrollView, LayoutAnimation, Platform, UIManager,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { C } from "../theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type GuideItem = {
  icon: string;
  title: string;
  summary: string;
  steps: string[];
  tip?: string;
};

const GUIDES: GuideItem[] = [
  {
    icon: "🚀",
    title: "Getting Started",
    summary: "Ang unang gagawin after ma-approve",
    steps: [
      "Buksan ang Setup Checklist sa dashboard mo.",
      "Sundan ang 4 na hakbang — mag-a-check ang bawat isa kapag tapos na.",
      "I-grant ang SMS permissions kapag hiningi ng app.",
      "I-activate ang gateway mo at kopyahin ang Device ID.",
      "I-message ang SNBX Pro team para i-link ang device mo.",
    ],
    tip: "Ang gateway phone dapat naka-charge, may WiFi, at bukas ang app para 24/7 gumana.",
  },
  {
    icon: "💬",
    title: "Sending SMS",
    summary: "Paano mag-send ng text sa customers",
    steps: [
      "Pumunta sa SMS Center mula sa dashboard.",
      "Tapikin ang '+ New' sa taas.",
      "Ilagay ang number (format: +639XXXXXXXXX) at ang mensahe.",
      "Tapikin ang 'Send via Gateway' — ipapadala ito gamit ang SIM mo.",
    ],
    tip: "Pwede ka ring mag-send mula sa GHL Conversations o Workflows — automatic na dadaan sa gateway mo!",
  },
  {
    icon: "📥",
    title: "Receiving Replies",
    summary: "Saan makikita ang mga sagot ng customers",
    steps: [
      "Ang mga reply ay awtomatikong lalabas sa Inbox tab ng SMS Center.",
      "Makikita rin ito sa GHL Conversations ng sub-account mo.",
      "Walang kailangang gawin — kusa itong dumarating basta bukas ang gateway.",
    ],
    tip: "Kung walang dumarating na replies, i-check kung active pa ang gateway sa SMS Gateway screen.",
  },
  {
    icon: "📱",
    title: "SMS Gateway Setup",
    summary: "Paano i-setup ang SIM gateway mo",
    steps: [
      "Pumunta sa SMS Gateway mula sa dashboard.",
      "I-grant ang lahat ng SMS permissions.",
      "Piliin ang SIM card na gagamitin.",
      "Tapikin ang 'Activate Gateway'.",
      "Kopyahin ang Device ID at i-send sa SNBX team.",
    ],
    tip: "Sa Settings → Apps → SNBX Pro → Battery → set to Unrestricted para hindi ma-sleep ang gateway.",
  },
  {
    icon: "💳",
    title: "Receiving Payments (SNBX Pay)",
    summary: "Paano tumanggap ng GCash / Maya / Card",
    steps: [
      "Sa GHL sub-account mo, gamitin ang SNBX Pay bilang payment provider.",
      "Gumawa ng invoice o payment link.",
      "Kapag nagbayad ang customer (GCash/Maya/Card), automatic itong marka-mark as paid.",
      "Maaari ring mag-trigger ng workflow automation pagkatapos ng bayad.",
    ],
    tip: "Ang SNBX Pay ay para sa mga customer MO na magbabayad sa'yo — hindi para sa subscription mo sa SNBX.",
  },
  {
    icon: "📊",
    title: "GHL Dashboard",
    summary: "Paano i-connect ang GHL sub-account mo",
    steps: [
      "Pumunta sa GHL Dashboard mula sa main menu.",
      "Tapikin ang ⚙️ (settings) sa taas.",
      "Ilagay ang Location ID at API Key mula sa GHL sub-account mo.",
      "I-save — makikita mo na ang Contacts at iba pang modules.",
    ],
    tip: "Makikita ang Location ID sa GHL → Settings → Business Profile.",
  },
  {
    icon: "♟",
    title: "SNBX Ranking & Levels",
    summary: "Paano gumagana ang level system",
    steps: [
      "Buksan ang SNBX Ranking mula sa dashboard.",
      "Makikita mo ang current level mo at ang NEXT QUEST.",
      "Tapusin ang quest (referrals, AXA milestones) para mag-level up.",
      "Mas mataas ang level, mas mababa ang bayad — hanggang maging FREE!",
    ],
    tip: "Ang mga Power Upgrades (Standard/Premium) ay hiwalay na track — para sa dagdag na power.",
  },
  {
    icon: "👤",
    title: "Editing Your Profile",
    summary: "Paano baguhin ang pangalan at avatar",
    steps: [
      "Sa dashboard, tapikin ang profile card mo sa taas.",
      "Baguhin ang pangalan mo o pumili ng avatar color.",
      "Tapikin ang 'Save Changes' — instant na mag-a-update.",
    ],
  },
  {
    icon: "⏳",
    title: "Sending Many SMS (Workflows)",
    summary: "Paano gumagana ang bulk SMS via automation",
    steps: [
      "Kapag maraming SMS na ipapadala (halimbawa via workflow), isa-isa itong ipinapadala ng gateway phone mo.",
      "Tumatagal ito ng ilang minuto o oras depende sa dami — pero tuloy-tuloy, hindi titigil.",
      "Iwasan ang biglaang pagpadala ng daan-daang SMS sa maikling oras.",
      "Mas maganda kung i-spread out ang pagpapadala sa mas mahabang oras kung malaki ang volume.",
    ],
    tip: "Ang layunin nito ay protektahan ang SIM mo laban sa spam-detection ng telco. Ginagawan din namin ito ng paraan sa mga susunod na update!",
  },
];

function GuideCard({ item }: { item: GuideItem }) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View style={s.card}>
      <Pressable style={s.cardHeader} onPress={toggle}>
        <Text style={s.cardIcon}>{item.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{item.title}</Text>
          <Text style={s.cardSummary}>{item.summary}</Text>
        </View>
        <Text style={s.chevron}>{open ? "−" : "+"}</Text>
      </Pressable>

      {open && (
        <View style={s.cardBody}>
          {item.steps.map((step, i) => (
            <View key={i} style={s.stepRow}>
              <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}
          {item.tip && (
            <View style={s.tipBox}>
              <Text style={s.tipText}>💡 {item.tip}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function GuideScreen() {
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <Pressable
          onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/dashboard" as any); }}
          style={s.back}
        >
          <Text style={s.backText}>←</Text>
        </Pressable>
        <Text style={s.headerTitle}>How to Use</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>
          Bagong-bago ka pa lang sa SNBX Pro? Tapikin lang ang kahit anong topic sa baba para
          matutunan kung paano gamitin ang bawat feature. Nandito kami para tulungan ka! 💚
        </Text>

        {GUIDES.map((g) => (
          <GuideCard key={g.title} item={g} />
        ))}

        <View style={s.helpCard}>
          <Text style={s.helpTitle}>May tanong pa?</Text>
          <Text style={s.helpText}>
            I-message lang ang SNBX Pro team o ang Team Paangat community — lagi kaming handang tumulong!
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

  intro: { fontSize: 13, color: C.body, lineHeight: 21, marginTop: 16, marginBottom: 20 },

  card: {
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 16, marginBottom: 10, overflow: "hidden",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  cardIcon: { fontSize: 24 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: C.ink, marginBottom: 2 },
  cardSummary: { fontSize: 12, color: C.muted },
  chevron: { fontSize: 22, color: C.muted, fontWeight: "700", width: 20, textAlign: "center" },

  cardBody: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 2 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  stepNum: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: C.greenSoft,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  stepNumText: { fontSize: 11, fontWeight: "700", color: C.greenDark },
  stepText: { fontSize: 13, color: C.body, flex: 1, lineHeight: 20 },

  tipBox: {
    backgroundColor: C.goldSoft, borderRadius: 10, padding: 12, marginTop: 4,
  },
  tipText: { fontSize: 12, color: C.ink, lineHeight: 18 },

  helpCard: {
    backgroundColor: C.greenSoft, borderWidth: 1, borderColor: "#CBEADF",
    borderRadius: 14, padding: 18, marginTop: 10, marginBottom: 20, alignItems: "center",
  },
  helpTitle: { fontSize: 15, fontWeight: "800", color: C.ink, marginBottom: 6 },
  helpText: { fontSize: 13, color: C.body, textAlign: "center", lineHeight: 20 },

  domain: { fontSize: 12, color: C.muted, textAlign: "center", letterSpacing: 1.2 },
});