// src/app/terminologies.tsx
// Terminologies — a plain-language dictionary for GHL, digital marketing, freelancing & business
// Place at: snbx-app/src/app/terminologies.tsx

import {
  View, Text, StyleSheet, StatusBar, Pressable, ScrollView, TextInput,
  LayoutAnimation, Platform, UIManager, Linking,
} from "react-native";
import { useState, useMemo } from "react";
import { router } from "expo-router";
import { C } from "../theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Category = "GHL" | "Marketing" | "Freelancing" | "Business";

type Term = {
  term: string;
  category: Category;
  definition: string;
  analogy?: string;
  example?: string;
  link?: string; // optional community post / video / guide URL
};

// ── Seeded terms (edit / expand freely) ──────────────────────────
const TERMS: Term[] = [
  // GHL
  {
    term: "GHL (GoHighLevel)",
    category: "GHL",
    definition: "Isang all-in-one platform para sa marketing at sales — CRM, funnels, email, SMS, automation, at booking, nasa isang lugar lang.",
    analogy: "Parang Swiss knife ng digital marketing — sa isang tool, kumpleto na ang kailangan mo.",
    example: "Sa halip na ggamit ng hiwalay na email tool, calendar, at CRM, isang GHL na lang lahat.",
  },
  {
    term: "Sub-Account",
    category: "GHL",
    definition: "Ang sariling workspace mo sa loob ng GHL — dito nakalagay ang mga contacts, funnels, at automations ng negosyo mo.",
    analogy: "Parang sariling kwarto mo sa isang malaking building — pribado at sa'yo lang.",
    example: "Bawat SNBX subscriber ay may sariling sub-account para sa business nila.",
  },
  {
    term: "Pipeline",
    category: "GHL",
    definition: "Isang visual na paraan para makita saan na ang bawat lead o customer sa sales process mo.",
    analogy: "Parang jeepney route — may mga sakayan (stages) mula simula hanggang sa destination (closed deal).",
    example: "New Lead → Contacted → Booked → Closed. Makikita mo kung ilan ang nasa bawat stage.",
  },
  {
    term: "Snapshot",
    category: "GHL",
    definition: "Isang ready-made template ng GHL setup (funnels, workflows, pipelines) na pwedeng i-load agad sa sub-account.",
    analogy: "Parang recipe na kumpleto na — kopyahin mo lang, hindi na kailangan mag-simula from scratch.",
    example: "Ang isang real estate snapshot ay may kumpletong funnel at automation para sa mga broker.",
  },
  {
    term: "Workflow / Automation",
    category: "GHL",
    definition: "Mga automatic na aksyon na nangyayari base sa trigger — halimbawa, auto-send ng SMS kapag may bagong lead.",
    analogy: "Parang domino — kapag natumba ang una (trigger), sunod-sunod na ang mangyayari (actions), automatic.",
    example: "Bagong lead → auto-send ng welcome SMS → auto-add ng tag → auto-notify sa'yo.",
  },
  {
    term: "Conversation Provider",
    category: "GHL",
    definition: "Isang service na nag-ha-handle ng pagpapadala at pagtanggap ng messages (SMS) sa loob ng GHL.",
    analogy: "Parang koreo — sila ang nagdadala ng sulat (SMS) papunta at pabalik.",
    example: "Ang SNBX SMS ay isang Conversation Provider — gamit ang sarili mong SIM.",
  },
  // Marketing
  {
    term: "Lead",
    category: "Marketing",
    definition: "Isang taong nagpakita ng interes sa product o service mo — potential customer pa lang.",
    analogy: "Parang manliligaw — interesado na, pero hindi pa kayo.",
    example: "Yung nag-fill up ng contact form mo o nag-message sa page — lead na 'yan.",
  },
  {
    term: "Funnel",
    category: "Marketing",
    definition: "Ang journey ng customer mula sa unang pagkakakilala sa'yo hanggang sa pagbili.",
    analogy: "Parang funnel (embudo) — malawak sa taas (maraming nakakakita), pumipipot pababa (iilan ang bumibili).",
    example: "Ad → Landing page → Sign up → Offer → Purchase. Yan ang funnel.",
  },
  {
    term: "Landing Page",
    category: "Marketing",
    definition: "Isang single web page na may isang layunin — mag-collect ng info o mag-benta ng isang bagay.",
    analogy: "Parang storefront window — isang produkto ang naka-display para pagtuunan ng pansin.",
    example: "Isang page na 'Book a Free Consultation' na may form lang — landing page 'yan.",
  },
  {
    term: "Nurture",
    category: "Marketing",
    definition: "Ang proseso ng pag-build ng tiwala sa lead through consistent na content at follow-ups bago sila bumili.",
    analogy: "Parang pagtatanim — dinidilig mo muna bago mag-ani. Hindi agad-agad.",
    example: "Weekly tips via email o SMS para 'warm' ang lead hanggang handa na silang bumili.",
  },
  {
    term: "CTA (Call to Action)",
    category: "Marketing",
    definition: "Ang direktang utos sa audience kung ano ang susunod na gagawin — 'Book now', 'Message us', 'Sign up'.",
    analogy: "Parang traffic sign — sinasabihan ka kung saan pupunta.",
    example: "Ang button na 'Message SNBX Pro to Start' ay isang CTA.",
  },
  {
    term: "Conversion",
    category: "Marketing",
    definition: "Kapag ginawa ng lead ang gusto mong aksyon — nag-sign up, nag-book, o bumili.",
    analogy: "Parang goal sa basketball — successful ang shot (aksyon).",
    example: "100 nakakita ng ad, 10 nag-sign up = 10% conversion rate.",
  },
  // Freelancing
  {
    term: "Niche",
    category: "Freelancing",
    definition: "Ang specific na larangan o market na pinag-focusan mo — hindi general, kundi espesyalisado.",
    analogy: "Parang doktor — mas malaki kita ng specialist kaysa general practitioner.",
    example: "Sa halip na 'lahat ng business', mag-focus sa 'GHL for real estate agents' — niche 'yan.",
  },
  {
    term: "Retainer",
    category: "Freelancing",
    definition: "Isang fixed monthly na bayad para sa tuloy-tuloy na serbisyo mo — hindi per-project.",
    analogy: "Parang subscription — regular na kita bawat buwan, hindi one-time.",
    example: "₱10,000/month para sa GHL management — retainer 'yan, hindi one-time project.",
  },
  {
    term: "Scope of Work",
    category: "Freelancing",
    definition: "Ang malinaw na listahan ng kung ano ang kasama (at hindi kasama) sa serbisyo mo.",
    analogy: "Parang menu sa restaurant — nakalista kung ano ang pwede mong i-order.",
    example: "'3 funnels + 5 automations/month' — malinaw ang scope, walang gulo.",
  },
  {
    term: "Upsell",
    category: "Freelancing",
    definition: "Ang pag-offer ng mas mataas o dagdag na serbisyo sa existing na client.",
    analogy: "Parang 'gusto mo ba ng fries with that?' — dagdag sa order.",
    example: "Client mo may funnel na? I-offer mo ang SMS automation bilang add-on.",
  },
  // Business
  {
    term: "ROI (Return on Investment)",
    category: "Business",
    definition: "Kung magkano ang kinita mo kumpara sa ginastos mo — para malaman kung sulit.",
    analogy: "Parang pagtatanim — kung magkano ang binhi (gastos) vs. ani (kita).",
    example: "Gumastos ₱1,000 sa ads, kumita ₱5,000 = ₱4,000 ROI o 400%.",
  },
  {
    term: "Churn",
    category: "Business",
    definition: "Ang bilang ng customers na huminto o nag-cancel ng subscription mo sa loob ng isang panahon.",
    analogy: "Parang tumatagas na timba — kailangan mong punan ang lumalabas.",
    example: "Kung 10 subscribers ka at 1 ang nag-cancel this month, 10% churn 'yan.",
  },
  {
    term: "Recurring Revenue",
    category: "Business",
    definition: "Kita na paulit-ulit na pumapasok bawat buwan mula sa subscriptions o retainers.",
    analogy: "Parang puno ng mangga — tuloy-tuloy ang bunga, hindi one-time.",
    example: "50 subscribers × ₱999/month = ₱49,950 recurring revenue kada buwan.",
  },
  {
    term: "MVP (Minimum Viable Product)",
    category: "Business",
    definition: "Ang pinaka-basic na bersyon ng produkto na pwede nang gamitin at ibenta — para makapag-launch agad at matuto.",
    analogy: "Parang skateboard bago ang kotse — nakakarating ka na, kahit simple pa.",
    example: "Ang SNBX SMS + Pay ngayon ay MVP — gumagana na, dadagdagan pa ng features.",
  },
];

const CATEGORIES: (Category | "All")[] = ["All", "GHL", "Marketing", "Freelancing", "Business"];

const CAT_COLORS: Record<Category, string> = {
  GHL:         "#1D9E75",
  Marketing:   "#8B6FE8",
  Freelancing: "#B8933A",
  Business:    "#5B7A99",
};

function TermCard({ item }: { item: Term }) {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View style={s.card}>
      <Pressable style={s.cardHeader} onPress={toggle}>
        <View style={{ flex: 1 }}>
          <Text style={s.term}>{item.term}</Text>
          <View style={[s.catPill, { backgroundColor: `${CAT_COLORS[item.category]}18` }]}>
            <Text style={[s.catPillText, { color: CAT_COLORS[item.category] }]}>{item.category}</Text>
          </View>
        </View>
        <Text style={s.chevron}>{open ? "−" : "+"}</Text>
      </Pressable>

      {open && (
        <View style={s.cardBody}>
          <Text style={s.defLabel}>Ano ito?</Text>
          <Text style={s.defText}>{item.definition}</Text>

          {item.analogy && (
            <>
              <Text style={s.defLabel}>Analogy 💡</Text>
              <Text style={s.analogyText}>{item.analogy}</Text>
            </>
          )}

          {item.example && (
            <>
              <Text style={s.defLabel}>Halimbawa</Text>
              <Text style={s.defText}>{item.example}</Text>
            </>
          )}

          {item.link && (
            <Pressable style={s.linkBtn} onPress={() => Linking.openURL(item.link!).catch(() => {})}>
              <Text style={s.linkBtnText}>▶ Learn more (video / guide)</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

export default function TerminologiesScreen() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return TERMS
      .filter((t) => cat === "All" || t.category === cat)
      .filter((t) =>
        !q ||
        t.term.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q)
      )
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [search, cat]);

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
        <Text style={s.headerTitle}>Terminologies</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="Search a term..."
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={s.catScrollContent}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c}
            style={[s.catChip, cat === c && s.catChipActive]}
            onPress={() => setCat(c)}
          >
            <Text style={[s.catChipText, cat === c && s.catChipTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>
          Hindi mo alam ang ibig sabihin ng isang term? Hanapin mo dito — simpleng paliwanag,
          may analogy at halimbawa pa. Para hindi ka na ma-lito sa mga jargon! 📖
        </Text>

        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🔍</Text>
            <Text style={s.emptyText}>Walang nahanap na term para sa "{search}".</Text>
          </View>
        ) : (
          filtered.map((t) => <TermCard key={t.term} item={t} />)
        )}

        <View style={s.helpCard}>
          <Text style={s.helpText}>
            May term na gusto mong idagdag o hindi malinaw? I-message ang SNBX Pro team — dadagdagan namin ito! 💚
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
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.cardBorder,
  },
  back: { padding: 4 },
  backText: { fontSize: 22, color: C.muted },
  headerTitle: { fontSize: 17, fontWeight: "800", color: C.ink },

  searchRow: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  searchInput: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 14, color: C.ink,
  },

  catScroll: { maxHeight: 44, paddingLeft: 20 },
  catScrollContent: { paddingRight: 20, gap: 8, alignItems: "center" },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18,
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
  },
  catChipActive: { backgroundColor: C.green, borderColor: C.green },
  catChipText: { fontSize: 13, fontWeight: "600", color: C.muted },
  catChipTextActive: { color: "#FFFFFF" },

  intro: { fontSize: 13, color: C.body, lineHeight: 20, marginTop: 16, marginBottom: 18 },

  card: {
    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
    borderRadius: 14, marginBottom: 10, overflow: "hidden",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  term: { fontSize: 15, fontWeight: "800", color: C.ink, marginBottom: 6 },
  catPill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catPillText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
  chevron: { fontSize: 22, color: C.muted, fontWeight: "700", width: 20, textAlign: "center" },

  cardBody: { paddingHorizontal: 16, paddingBottom: 16 },
  defLabel: { fontSize: 11, fontWeight: "700", color: C.muted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4, marginTop: 10 },
  defText: { fontSize: 13, color: C.body, lineHeight: 20 },
  analogyText: { fontSize: 13, color: C.greenDark, lineHeight: 20, fontStyle: "italic" },
  linkBtn: {
    backgroundColor: C.greenSoft, borderWidth: 1, borderColor: "#CBEADF",
    borderRadius: 10, paddingVertical: 11, alignItems: "center", marginTop: 14,
  },
  linkBtnText: { fontSize: 13, fontWeight: "700", color: C.greenDark },

  empty: { alignItems: "center", padding: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: "center" },

  helpCard: {
    backgroundColor: C.greenSoft, borderWidth: 1, borderColor: "#CBEADF",
    borderRadius: 14, padding: 16, marginTop: 10, marginBottom: 20,
  },
  helpText: { fontSize: 13, color: C.body, textAlign: "center", lineHeight: 20 },

  domain: { fontSize: 12, color: C.muted, textAlign: "center", letterSpacing: 1.2 },
});