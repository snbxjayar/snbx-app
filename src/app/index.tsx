import { router } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  Animated,
  Easing,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { useEffect, useRef } from "react";

const { width } = Dimensions.get("window");

const C = {
  forestGreen: "#1D9E75",
  darkGreen:   "#1B3A2D",
  midGreen:    "#0F6E56",
  gold:        "#C9A84C",
  navy:        "#0D1B2A",
  white:       "#FFFFFF",
  offWhite:    "#F0F5F2",
  muted:       "#7A9E8E",
};

export default function HomeScreen() {
  const orbScale   = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.7)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orbScale,   { toValue: 1.14, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(orbOpacity, { toValue: 1.0,  duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(orbScale,   { toValue: 1.0,  duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(orbOpacity, { toValue: 0.7,  duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* Background glow layer */}
      <View style={s.bgGlow} />

      {/* Breathing orb — outer ring */}
      <Animated.View style={[s.orbOuter, { transform: [{ scale: orbScale }], opacity: orbOpacity }]} />
      {/* Orb — inner core */}
      <View style={s.orbInner} />

      <SafeAreaView style={s.safe}>
        <Animated.View style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {/* Logo mark */}
          <View style={s.logoMark}>
            <Text style={s.logoMarkText}>S</Text>
          </View>

          {/* Brand */}
          <Text style={s.brand}>SNBX</Text>
          <Text style={s.brandPro}>PRO</Text>

          {/* Divider */}
          <View style={s.divider} />

          {/* Tagline */}
          <Text style={s.tagline}>The Sandbox for{"\n"}Filipino Digital Pros</Text>

          {/* Three pillars */}
          <View style={s.pillars}>
            {["Software", "Insurance", "Financial"].map((p) => (
              <View key={p} style={s.pill}>
                <Text style={s.pillText}>{p}</Text>
              </View>
            ))}
          </View>

          {/* CTA button */}
          <Pressable
            style={({ pressed }) => [s.cta, pressed && s.ctaPressed]}
            onPress={() => router.push("/login")}
          >
            <Text style={s.ctaText}>Enter SNBX</Text>
          </Pressable>

          {/* Website */}
          <Text style={s.footer}>snbxpro.com</Text>

        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  bgGlow: {
    position: "absolute",
    top: "22%",
    alignSelf: "center",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: C.darkGreen,
    opacity: 0.4,
  },

  // Orb
  orbOuter: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: C.forestGreen,
    opacity: 0.16,
    top: "21%",
    alignSelf: "center",
  },
  orbInner: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.forestGreen,
    opacity: 0.55,
    top: "21%",
    marginTop: 38,
    alignSelf: "center",
  },

  // Layout
  safe: { flex: 1, width: "100%" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },

  // Logo mark
  logoMark: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: C.forestGreen,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    borderWidth: 1,
    borderColor: C.midGreen,
  },
  logoMarkText: {
    fontSize: 30,
    fontWeight: "800",
    color: C.white,
    letterSpacing: -1,
  },

  // Brand name
  brand: {
    fontSize: 54,
    fontWeight: "800",
    color: C.white,
    letterSpacing: 12,
  },
  brandPro: {
    fontSize: 13,
    fontWeight: "700",
    color: C.gold,
    letterSpacing: 9,
    marginTop: -2,
    marginBottom: 4,
  },

  // Divider
  divider: {
    width: 44,
    height: 2,
    backgroundColor: C.forestGreen,
    borderRadius: 1,
    marginVertical: 22,
    opacity: 0.9,
  },

  // Tagline
  tagline: {
    fontSize: 16,
    color: C.offWhite,
    textAlign: "center",
    lineHeight: 27,
    letterSpacing: 0.2,
    opacity: 0.85,
    marginBottom: 30,
  },

  // Pillars
  pillars: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 44,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: C.forestGreen,
    backgroundColor: "rgba(29,158,117,0.09)",
  },
  pillText: {
    fontSize: 12,
    color: C.forestGreen,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  // CTA
  cta: {
    backgroundColor: C.forestGreen,
    paddingVertical: 17,
    borderRadius: 14,
    width: width - 64,
    alignItems: "center",
    marginBottom: 28,
    borderWidth: 1,
    borderColor: C.midGreen,
  },
  ctaPressed: {
    backgroundColor: C.midGreen,
    transform: [{ scale: 0.97 }],
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    color: C.white,
    letterSpacing: 0.6,
  },

  // Footer
  footer: {
    fontSize: 12,
    color: C.muted,
    letterSpacing: 1.2,
  },
});
