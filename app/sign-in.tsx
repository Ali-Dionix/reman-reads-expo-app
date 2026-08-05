// /login — the reader's entrance.
//
// Transcribed from app/data/loginPage.ts at its ≤820px branch (the aside with
// Hermes-at-the-door is blanked there, and `.rr-lg-mobile-window` — Hermes
// leaning through the reader's window — takes its place), with the torn
// minimal navbar the page ships above it and the torn paper hem below.
//
// The panel is the full form, not a reduction: the flow pair (Sign in / Create
// a card), the method segment (Email letter / Password), the name field that
// appears only while creating a card, the guidance note, the after-line and
// the panel footer. Every string switches exactly as LoginEnhancer.tsx
// switches it — same branches, same words.
//
// The page's palette is authored in oklch(), which React Native cannot parse,
// so LG below is that palette converted to sRGB. Both themes are carried.

import { Image } from "expo-image";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabaseReady } from "../src/lib/config";
import { useSession } from "../src/lib/session";
import { signInWithPassword, signUpWithPassword } from "../src/lib/supabase";
import { Sky } from "../src/portal/Sky";
import { TornNav } from "../src/portal/TornNav";
import { useInk, em } from "../src/theme/ink";
import { useTheme } from "../src/theme/ThemeProvider";
import { FONTS } from "../src/theme/type";
import { TornHem } from "../src/ui/TornEdge";

/** loginPage.ts's --lg-* custom properties, converted from oklch to sRGB. */
const LG = {
  light: {
    bg: "#f8f2e9",
    paper: "#fdfaf4",
    ink: "#211912",
    muted: "#655c53",
    faint: "#9f978e",
    line: "rgba(33,25,18,.16)",
    lineSoft: "rgba(33,25,18,.10)",
    lineStrong: "rgba(33,25,18,.31)",
    accent: "#8e6a3c",
    accentWash: "rgba(142,106,60,.08)",
    button: "#211912",
    buttonInk: "#f1dec4",
    field: "#fefcf9",
    warn: "#8a2f1c",
    warnWash: "rgba(138,47,28,.10)",
  },
  dark: {
    bg: "#070d19",
    paper: "#0f1725",
    ink: "#f0e7d6",
    muted: "#b3a99c",
    faint: "#84786b",
    line: "rgba(240,231,214,.15)",
    lineSoft: "rgba(240,231,214,.09)",
    lineStrong: "rgba(240,231,214,.31)",
    accent: "#cda76b",
    accentWash: "rgba(205,167,107,.08)",
    button: "#d9bc90",
    buttonInk: "#090f1a",
    field: "#0b131f",
    warn: "#d98a70",
    warnWash: "rgba(217,138,112,.10)",
  },
} as const;

const WINDOW_LIGHT = require("../assets/login-hermes-window-light-v1.webp");
const WINDOW_DARK = require("../assets/login-hermes-window-dark-v1.webp");

type Flow = "signin" | "signup";
type Method = "letter" | "password";
type Palette = (typeof LG)[keyof typeof LG];

/**
 * `.rr-lg-f` — a label, its field, and the hint beneath.
 *
 * DECLARED AT MODULE SCOPE, not inside SignIn. A component defined in a render
 * body is a NEW type on every render, so React unmounts and remounts its whole
 * subtree — which dismisses the keyboard on every single keystroke. This is
 * the kind of bug that reads as "the form is broken".
 */
function Field({
  c,
  label,
  hint,
  children,
}: {
  c: Palette;
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: c.ink }]}>{label}</Text>
      {children}
      <Text style={[styles.hint, { color: c.faint }]}>{hint}</Text>
    </View>
  );
}

export default function SignIn() {
  const { user, booting, setUser, startGuest } = useSession();
  const { mode } = useTheme();
  const { vw, width } = useInk();
  const insets = useSafeAreaInsets();
  const c = LG[mode];

  const [flow, setFlow] = useState<Flow>("signin");
  const [method, setMethod] = useState<Method>("password");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focus, setFocus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (booting) return null;
  if (user) return <Redirect href="/" />;

  const signingUp = flow === "signup";
  const byPassword = method === "password";

  /* ---- the copy, branching exactly as LoginEnhancer.tsx branches it ---- */

  const panelTitle = signingUp ? "Make your reader’s card." : "Welcome back, reader.";

  const panelDesc = signingUp
    ? "Create one card for your shelf, listening place, orders, and Hermes’ notes."
    : "Sign in to restore your shelf, listening place, orders, and notes.";

  const methodCopy = byPassword
    ? signingUp
      ? "Create a password for direct access to your card."
      : "Use the password already attached to your reader’s card."
    : signingUp
      ? "Start with an email letter. You can add a password later."
      : "A sign-in letter is simplest. No password to remember.";

  // The letter branch is honest about not travelling yet — the phone has no
  // deep link registered with Supabase, so a letter would land on the site.
  const guidance = byPassword
    ? signingUp
      ? "Enter your details and choose a password of at least six characters."
      : "Enter the email and password connected to your reader’s card."
    : "Sign-in letters open on the website. Choose Password to continue in the app.";

  const submitCopy = signingUp ? "Create my reader’s card" : "Enter the reading room";

  const afterCopy = signingUp
    ? "Already have a card? Choose Sign in above."
    : byPassword
      ? "Forgot it? Open the site to continue by letter."
      : "No password needed. You can return to this method any time.";

  const canSubmit = byPassword && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const res = signingUp
      ? await signUpWithPassword(email.trim(), password, name.trim())
      : await signInWithPassword(email.trim(), password);
    setBusy(false);

    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.pending || !res.user) {
      // Signup with "Confirm email" on answers with a bare user and no session.
      setSent(true);
      return;
    }
    setUser(res.user);
    router.replace("/");
  };

  const inputStyle = (key: string) => [
    styles.input,
    {
      backgroundColor: focus === key ? c.paper : c.field,
      borderColor: focus === key ? c.accent : c.lineStrong,
      color: c.ink,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* The page's own navbar. It takes THIS page's palette, so its sheet,
              its torn hem and its control ring are cut from the same paper the
              hero is printed on — in both themes. */}
          <TornNav
            palette={{
              sheet: c.paper,
              under: c.field,
              ink: c.ink,
              brass: c.accent,
              line: c.lineStrong,
            }}
          />

          <View style={[styles.hero, { paddingHorizontal: vw(5.5) }]}>
            {/* .rr-lg-sky — the sun by day, the moon at night. First child, so
                everything else paints over it (the CSS gives it z-index:0). */}
            <Sky />

            {/* .rr-lg-kicker — a 28px rule, then the label */}
            <View style={styles.kickerRow}>
              <View style={[styles.kickerRule, { borderTopColor: c.accent }]} />
              <Text style={[styles.kicker, { color: c.accent }]}>
                The reader’s entrance
              </Text>
            </View>

            {/* .rr-lg-h1 — the <em> is display:block, so it takes its own line */}
            <Text style={[styles.h1, { color: c.ink }]}>Pick up where</Text>
            <Text style={[styles.h1, { color: c.accent }]}>the page folded.</Text>

            <Text style={[styles.sub, { color: c.muted }]}>
              Your shelf, listening room, orders, and Hermes’ notes are all waiting
              behind one reader’s card.
            </Text>

            {/* .rr-lg-mobile-window — shown only at this width */}
            <Image
              source={mode === "dark" ? WINDOW_DARK : WINDOW_LIGHT}
              style={styles.window}
              contentFit="contain"
              accessibilityLabel="Hermes leaning through the reader’s window"
            />

            {/* .rr-lg-panel */}
            <View style={[styles.panel, { backgroundColor: c.paper, borderColor: c.line }]}>
              {/* ::before — the inset rule, 7px in */}
              <View style={[styles.panelInset, { borderColor: c.lineSoft }]} pointerEvents="none" />

              {sent ? (
                /* .rr-lg-sent */
                <View style={styles.sent}>
                  <Text style={[styles.sentMark, { color: c.accent, borderColor: c.accent }]}>
                    R
                  </Text>
                  <Text style={[styles.sentH, { color: c.ink }]}>Check your address.</Text>
                  <Text style={[styles.sentP, { color: c.muted }]}>
                    Addressed to{" "}
                    <Text style={{ fontFamily: FONTS.sansBold, color: c.ink }}>
                      {email.trim()}
                    </Text>
                    . Open it and your reader’s card is issued.
                  </Text>
                  <Pressable onPress={() => setSent(false)} hitSlop={6}>
                    <Text style={[styles.smallBtn, { color: c.accent }]}>
                      Not your address? Write it again.
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {/* .rr-lg-panelhead */}
                  <View style={styles.panelHead}>
                    <View style={styles.panelCopy}>
                      <Text style={[styles.panelKick, { color: c.accent }]}>Reader access</Text>
                      <Text style={[styles.panelTitle, { color: c.ink }]}>{panelTitle}</Text>
                      <Text style={[styles.panelDesc, { color: c.muted }]}>{panelDesc}</Text>
                    </View>

                    {/* .rr-lg-site */}
                    <Pressable
                      accessibilityRole="link"
                      style={[styles.site, { borderColor: c.lineStrong }]}
                    >
                      <Text style={[styles.siteText, { color: c.ink }]}>Visit website ↗</Text>
                    </Pressable>
                  </View>

                  {/* .rr-lg-flow */}
                  <View style={[styles.flow, { borderColor: c.line, backgroundColor: c.bg }]}>
                    {(["signin", "signup"] as Flow[]).map((f) => {
                      const on = flow === f;
                      return (
                        <Pressable
                          key={f}
                          onPress={() => setFlow(f)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          style={[styles.flowBtn, on && { backgroundColor: c.button }]}
                        >
                          <Text
                            style={[styles.flowText, { color: on ? c.buttonInk : c.muted }]}
                          >
                            {f === "signin" ? "Sign in" : "Create a card"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* .rr-lg-modehead */}
                  <View style={[styles.modeHead, { borderBottomColor: c.line }]}>
                    <View style={styles.modeCopy}>
                      <Text style={[styles.modeB, { color: c.ink }]}>
                        Choose how to continue
                      </Text>
                      <Text style={[styles.modeSpan, { color: c.muted }]}>{methodCopy}</Text>
                    </View>

                    {/* .rr-lg-seg */}
                    <View style={[styles.seg, { borderColor: c.line, backgroundColor: c.bg }]}>
                      {(["letter", "password"] as Method[]).map((m) => {
                        const on = method === m;
                        return (
                          <Pressable
                            key={m}
                            onPress={() => setMethod(m)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            style={[styles.segBtn, on && { backgroundColor: c.button }]}
                          >
                            <Text
                              style={[styles.segText, { color: on ? c.buttonInk : c.muted }]}
                            >
                              {m === "letter" ? "Email letter" : "Password"}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* .rr-lg-fields */}
                  <View style={styles.fields}>
                    {/* .rr-lg-signup-only */}
                    {signingUp ? (
                      <Field
                        c={c}
                        label="Your name"
                        hint="This is how your name will appear on your reader’s card."
                      >
                        <TextInput
                          value={name}
                          onChangeText={setName}
                          onFocus={() => setFocus("name")}
                          onBlur={() => setFocus(null)}
                          style={inputStyle("name")}
                          placeholder="How should we address you?"
                          placeholderTextColor={c.faint}
                          autoComplete="name"
                          textContentType="name"
                          selectionColor={c.accent}
                        />
                      </Field>
                    ) : null}

                    <Field
                        c={c}
                      label="Email address"
                      hint="Use the address you want connected to your shelf."
                    >
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        onFocus={() => setFocus("email")}
                        onBlur={() => setFocus(null)}
                        style={inputStyle("email")}
                        placeholder="reader@example.com"
                        placeholderTextColor={c.faint}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        textContentType="username"
                        selectionColor={c.accent}
                      />
                    </Field>

                    {/* .rr-lg-pass-only */}
                    {byPassword ? (
                      <Field
                        c={c}
                        label="Password"
                        hint="Choose Email letter above if you have forgotten it."
                      >
                        <TextInput
                          value={password}
                          onChangeText={setPassword}
                          onFocus={() => setFocus("password")}
                          onBlur={() => setFocus(null)}
                          style={inputStyle("password")}
                          placeholder={
                            signingUp ? "Choose a password" : "Enter your password"
                          }
                          placeholderTextColor={c.faint}
                          secureTextEntry
                          autoCapitalize="none"
                          autoComplete={signingUp ? "new-password" : "current-password"}
                          textContentType={signingUp ? "newPassword" : "password"}
                          returnKeyType="go"
                          onSubmitEditing={submit}
                          selectionColor={c.accent}
                        />
                      </Field>
                    ) : null}
                  </View>

                  {/* .rr-lg-guidance — the ::before badge is 'i', or '!' in error */}
                  <View
                    style={[
                      styles.guidance,
                      {
                        backgroundColor: error ? c.warnWash : c.accentWash,
                      },
                    ]}
                  >
                    <View
                      style={[styles.guidanceMark, { borderColor: error ? c.warn : c.accent }]}
                    >
                      <Text style={[styles.guidanceMarkText, { color: error ? c.warn : c.accent }]}>
                        {error ? "!" : "i"}
                      </Text>
                    </View>
                    <Text
                      style={[styles.guidanceText, { color: error ? c.warn : c.muted }]}
                    >
                      {error ?? guidance}
                    </Text>
                  </View>

                  {/* .rr-lg-submit */}
                  <Pressable
                    onPress={submit}
                    disabled={!canSubmit}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.submit,
                      {
                        backgroundColor: c.button,
                        opacity: !canSubmit ? 0.6 : pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    {busy ? (
                      <ActivityIndicator color={c.buttonInk} />
                    ) : (
                      <Text style={[styles.submitText, { color: c.buttonInk }]}>
                        {submitCopy}
                      </Text>
                    )}
                  </Pressable>

                  {/* .rr-lg-after */}
                  <View style={styles.after}>
                    <Text style={[styles.small, { color: c.muted }]}>{afterCopy}</Text>
                    {!supabaseReady ? (
                      <Text style={[styles.demo, { color: c.accent }]}>
                        instant in this preview
                      </Text>
                    ) : null}
                  </View>

                  {/* .rr-lg-panelnav — the copy and the guest pass, both the
                      page's own. Walking in as a guest opens the rooms on
                      sample data with no account behind them; the next real
                      sign-in throws that ledger away rather than merging it. */}
                  <View style={[styles.panelNav, { borderTopColor: c.line }]}>
                    <Text style={[styles.panelNavText, { color: c.muted }]}>
                      No card yet? The catalogue is open to anyone.
                    </Text>
                    <Pressable
                      onPress={() => {
                        startGuest();
                        router.replace("/");
                      }}
                      accessibilityRole="button"
                      hitSlop={6}
                    >
                      <Text style={[styles.panelNavLink, { color: c.accent }]}>
                        Walk in as a guest →
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>

            {/* .rr-lg-quote — Hermes at the threshold */}
            <Text style={[styles.quote, { color: c.muted }]}>
              “Every book is a door.{" "}
              <Text style={{ color: c.accent }}>Come through.</Text>”
            </Text>
            <Text style={[styles.quoteBy, { color: c.faint }]}>
              Hermes · at the threshold
            </Text>
          </View>

          {/* .rr-lg-bottom-paper — the torn hem that closes the page. It tears
              UPWARD, so the same tile is flipped. */}
          <View style={styles.bottomPaper}>
            <TornHem width={width} color={c.paper} style={styles.flip} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 26 },

  kickerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  kickerRule: { width: 28, borderTopWidth: 1 },
  kicker: {
    fontFamily: FONTS.sansBold,
    fontSize: 9,
    letterSpacing: em(9, 0.24),
    textTransform: "uppercase",
  },
  // clamp(48px,5.4vw,76px)/.92 — a phone sits on the 48px floor
  h1: {
    fontFamily: FONTS.serifRegular,
    fontSize: 48,
    lineHeight: 44.2,
    letterSpacing: em(48, -0.035),
    marginTop: 6,
  },
  sub: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    lineHeight: 24.5,
    marginTop: 20,
    maxWidth: 470,
  },
  window: { width: "100%", aspectRatio: 1920 / 819, marginTop: 18 },

  // ≤820px: margin-top 12, padding 22
  panel: { marginTop: 12, padding: 22, borderRadius: 18, borderWidth: 1 },
  panelInset: {
    position: "absolute",
    top: 7,
    left: 7,
    right: 7,
    bottom: 7,
    borderWidth: 1,
    borderRadius: 12,
  },

  panelHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 20 },
  panelCopy: { flex: 1, minWidth: 0 },
  panelKick: {
    fontFamily: FONTS.sansBold,
    fontSize: 8,
    letterSpacing: em(8, 0.2),
    textTransform: "uppercase",
    marginBottom: 5,
  },
  panelTitle: { fontFamily: FONTS.serif, fontSize: 24, lineHeight: 25.2 },
  panelDesc: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
    maxWidth: 370,
  },
  site: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 11,
    borderWidth: 1,
    borderRadius: 999,
  },
  siteText: {
    fontFamily: FONTS.sansBold,
    fontSize: 8.5,
    letterSpacing: em(8.5, 0.08),
    textTransform: "uppercase",
  },

  flow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 20,
    padding: 4,
    borderWidth: 1,
    borderRadius: 12,
  },
  flowBtn: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  flowText: { fontFamily: FONTS.sansBold, fontSize: 10, letterSpacing: em(10, 0.045) },

  modeHead: { marginTop: 20, marginBottom: 18, paddingBottom: 18, borderBottomWidth: 1 },
  modeCopy: { marginBottom: 12 },
  modeB: {
    fontFamily: FONTS.sansBold,
    fontSize: 9,
    letterSpacing: em(9, 0.12),
    textTransform: "uppercase",
  },
  modeSpan: { fontFamily: FONTS.sans, fontSize: 10.5, lineHeight: 15.75, marginTop: 5, maxWidth: 280 },
  seg: { flexDirection: "row", padding: 3, borderWidth: 1, borderRadius: 999 },
  segBtn: {
    flex: 1,
    minHeight: 35,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  segText: { fontFamily: FONTS.sansBold, fontSize: 9, letterSpacing: em(9, 0.035) },

  fields: { gap: 15 },
  field: { gap: 7 },
  fieldLabel: {
    fontFamily: FONTS.sansBold,
    fontSize: 8.5,
    letterSpacing: em(8.5, 0.17),
    textTransform: "uppercase",
  },
  input: {
    minHeight: 51,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderRadius: 10,
    fontFamily: FONTS.sansSemi,
    fontSize: 14,
  },
  hint: { fontFamily: FONTS.sans, fontSize: 9.5, lineHeight: 13.8 },

  guidance: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
  },
  guidanceMark: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  guidanceMarkText: { fontFamily: FONTS.serifItalic, fontSize: 11, lineHeight: 13 },
  guidanceText: { flex: 1, fontFamily: FONTS.sansSemi, fontSize: 10.5, lineHeight: 16.3 },

  submit: {
    width: "100%",
    minHeight: 53,
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  submitText: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    letterSpacing: em(11, 0.12),
    textTransform: "uppercase",
  },

  after: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    marginTop: 14,
  },
  small: { flex: 1, maxWidth: 320, fontFamily: FONTS.sans, fontSize: 11, lineHeight: 17.6 },
  demo: { fontFamily: FONTS.hand, fontSize: 13, transform: [{ rotate: "-2deg" }] },

  panelNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 20,
    paddingTop: 17,
    borderTopWidth: 1,
  },
  panelNavText: { flex: 1, fontFamily: FONTS.sansSemi, fontSize: 10.5, lineHeight: 15.2 },
  panelNavLink: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    textDecorationLine: "underline",
  },

  sent: { paddingHorizontal: 4, paddingTop: 8, paddingBottom: 5, alignItems: "flex-start" },
  sentMark: {
    fontFamily: FONTS.serifItalic,
    fontSize: 22,
    lineHeight: 40,
    width: 42,
    height: 42,
    textAlign: "center",
    borderWidth: 1,
    borderRadius: 21,
    overflow: "hidden",
  },
  sentH: { fontFamily: FONTS.serif, fontSize: 24, lineHeight: 26, marginTop: 14 },
  sentP: { fontFamily: FONTS.sans, fontSize: 11, lineHeight: 17.6, marginTop: 8 },
  smallBtn: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    marginTop: 16,
    textDecorationLine: "underline",
  },

  quote: {
    fontFamily: FONTS.serifItalicLight,
    fontSize: 19,
    lineHeight: 26,
    marginTop: 30,
  },
  quoteBy: {
    fontFamily: FONTS.sansBold,
    fontSize: 8.5,
    letterSpacing: em(8.5, 0.14),
    textTransform: "uppercase",
    marginTop: 8,
  },

  bottomPaper: { marginTop: 34 },
  flip: { transform: [{ scaleY: -1 }] },
});
