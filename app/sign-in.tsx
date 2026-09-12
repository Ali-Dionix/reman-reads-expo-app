// /login — the reader's entrance. app/data/loginPage.ts at its phone branch.
//
// The site's page at ≤820px, element by element in the builder's order: the
// public torn nav (tornMinimalNavHtml), the hero with its glow, the sun/moon
// in the top-right (.rr-lg-sky), the shell centring the auth column
// (margin:auto), and inside it the doorway window lifted above the form
// (.rr-lg-mobile-window, order:-1) and the panel — kicker, the <h1>, the two
// doors (Sign in / Create an account), the two ways (Email link / Password),
// the ruled fields, the one line of guidance, the ink button, the guest link
// on a rule — with the footer's torn paper cut short at the foot
// (.rr-lg-bottom-paper). The 390×844 numbers are in the comments as the
// builder writes them; the live values come from the window.
//
// The site's two phone HEIGHT tiers are taken too — (max-height:730px) drops
// the doorway and tightens the rhythm, (max-height:670px) tightens it again —
// and (max-width:380px) narrows the shell. `tier` below is those three
// branches read off the live window, exactly where the site's vh sees them.
//
// Behaviour is LoginEnhancer.tsx's: the same flow/mode state (`?flow=signup`
// opens on Create an account), the same copy branches (including the
// supabaseReady split), the same sent panel, the same carrying panel for a
// reader already signed in, the same landing (the audiobooks, or a same-origin
// `?next=`), and the same third door — "Continue as a guest →" mints the guest
// pass and walks into the rooms. A letter's link opens THIS screen
// (romanreads://sign-in) and is read off the URL, as the site reads its hash.
//
// Colour is the page's own oklch palette (src/portal/login/palette.ts), not
// the kit's tokens: loginPage.ts hand-writes its night rule, and so does this.
// Type goes through <Txt>; every ::before/::after is a <View>.

import { Image } from "expo-image";
import { clearInitialURL, useLinkingURL } from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "../src/lib/session";
import {
  consumeAuthLink,
  sendMagicLink,
  signInWithPassword,
  signUpWithPassword,
} from "../src/lib/supabase";
import { openOnSite } from "../src/lib/web";
import { BottomPaper } from "../src/portal/login/BottomPaper";
import { HeroGlow, WindowGlow } from "../src/portal/login/Glows";
import { Sky } from "../src/portal/login/Sky";
import { landing } from "../src/portal/login/landing";
import { loginPalette, type LoginPalette } from "../src/portal/login/palette";
import { PREVIEW, adoptPreviewSession, readPreviewSession } from "../src/portal/login/preview";
import { NAV_H, TornNav } from "../src/portal/TornNav";
import { useInk } from "../src/theme/ink";
import { useTheme } from "../src/theme/ThemeProvider";
import { FONTS } from "../src/theme/type";
import { Txt } from "../src/ui/Type";

/**
 * Whether the desk speaks as a live one. The site's split is supabaseReady;
 * here the PREVIEW (any address accepted, the letter instant, three sentences
 * saying so) exists only on a development desk with no backend — see
 * src/portal/login/preview.ts. A release build always speaks live, and with no
 * desk configured every submit is refused rather than minting a card.
 */
const DESK_LIVE = !PREVIEW;

const WINDOW_LIGHT = require("../assets/login-hermes-window-light-v1.webp");
const WINDOW_DARK = require("../assets/login-hermes-window-dark-v1.webp");
/** The house mark — the same file the site masks into .rr-lg-sent-mark. */
const MARK = require("../assets/mark.png");

type Flow = "signin" | "signup";
type Mode = "letter" | "password";

/** CSS clamp(min, <n>vh, max) against the live window. */
const vh = (h: number, min: number, n: number, max: number) =>
  Math.min(max, Math.max(min, (h * n) / 100));

/**
 * The site's phone tiers, read off the window the way its media queries read
 * the viewport: (max-width:820px) and (max-height:730px) — small phones in
 * portrait, 375×667 and its neighbours — then (max-height:670px), the smallest
 * still in circulation; (max-width:380px) narrows the shell's margins.
 */
type Tier = { t730: boolean; t670: boolean; narrow: boolean };
const tierOf = (w: number, h: number): Tier => ({ t730: h <= 730, t670: h <= 670, narrow: w <= 380 });
/** The base value, or the ≤730 one, or the ≤670 one — the cascade in order. */
const at = <T,>(tier: Tier, base: T, t730: T, t670: T = t730): T =>
  tier.t670 ? t670 : tier.t730 ? t730 : base;

/* ------------------------------------------------------------ the copy --- */
// LoginEnhancer.syncFormCopy(), branch for branch. Signing in with a password
// is the one state with no instruction: the empty string removes the rule.

function titleCopy(flow: Flow): string {
  return flow === "signup" ? "Create your account." : "Welcome back.";
}

function guidanceCopy(flow: Flow, mode: Mode): string {
  const signingUp = flow === "signup";
  if (mode === "password") {
    if (!signingUp) return "";
    return DESK_LIVE
      ? "Choose a password of at least six characters."
      : "Choose a password, your account is ready immediately in this preview.";
  }
  if (signingUp) {
    return DESK_LIVE
      ? "We’ll email you a link. Opening it creates your account."
      : "Your sign-up link appears right here in this preview.";
  }
  return DESK_LIVE
    ? "We’ll email you a one-time sign-in link, no password needed."
    : "Your sign-in link appears right here in this preview.";
}

function submitCopy(flow: Flow, mode: Mode): string {
  if (flow === "signup") return mode === "password" ? "Create my account" : "Email me a sign-up link";
  if (mode === "password") return "Sign in";
  return DESK_LIVE ? "Email me a sign-in link" : "Show my sign-in link";
}

// The site validates with form.reportValidity(), so what a phone shows there
// is Chrome's own bubble. These are its sentences, not ours: the app has no
// bubble to delegate to, so the desk's guidance line carries them — and, as
// the bubble does, lets go on the next keystroke.
const FILL_IN = "Please fill out this field.";
/** The HTML spec's own valid-email production, as type="email" tests it. */
const EMAIL = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const LOCAL_CHAR = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]/;
const DOMAIN_CHAR = /[a-zA-Z0-9.-]/;
/**
 * Chrome's type="email" mismatch text (EmailInputType::TypeMismatchText),
 * sentence for sentence, for the way THIS value fails: the first '@' splits
 * the address, the local part is read first, then the domain.
 */
function emailMismatch(v: string): string {
  const at = v.indexOf("@");
  if (at < 0) return `Please include an '@' in the email address. '${v}' is missing an '@'.`;
  if (at === 0) return `Please enter a part followed by '@'. '${v}' is incomplete.`;
  if (at === v.length - 1) return `Please enter a part following '@'. '${v}' is incomplete.`;
  const local = v.slice(0, at);
  const domain = v.slice(at + 1);
  const badLocal = [...local].find((c) => !LOCAL_CHAR.test(c));
  if (badLocal) return `A part followed by '@' should not contain the symbol '${badLocal}'.`;
  const badDomain = [...domain].find((c) => !DOMAIN_CHAR.test(c));
  if (badDomain) return `A part following '@' should not contain the symbol '${badDomain}'.`;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes(".."))
    return `'.' is used at a wrong position in '${domain}'.`;
  return "Please enter an email address.";
}

/* ------------------------------------------------------------- the type --- */

/** `.rr-lg-panelkick` / `.rr-lg-f b` — 8.5px Manrope, .24em, uppercase, accent. */
function Label({
  p,
  weight = 700,
  children,
  style,
}: {
  p: LoginPalette;
  weight?: 700 | 800;
  children: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Txt weight={weight} size={8.5} ls={0.24} upper style={[{ color: p.accent }, style]}>
      {children}
    </Txt>
  );
}

/**
 * `.rr-lg-panelnav a` / `.rr-lg-small button` — 700 Manrope, accent,
 * underlined with a 3px offset. Chrome puts that underline one row under the
 * line box; RN cannot offset an underline, so it is drawn as its own 1px View.
 */
function LinkWord({
  p,
  size,
  onPress,
  children,
}: {
  p: LoginPalette;
  size: number;
  onPress: () => void;
  children: string;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8} style={{ alignSelf: "flex-start" }}>
      <Txt weight={700} size={size} style={{ color: p.accent }}>
        {children}
      </Txt>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 1, backgroundColor: p.accent }} />
    </Pressable>
  );
}

/**
 * `.rr-pt-btn` — portalShared.ts's shared ink button: kit ink on kit paper,
 * 700 11px Manrope at .08em, 14/24 padding, inline-flex (content-width). The
 * one `submit` carries `.rr-lg-submit`'s overrides on top: the page's own
 * --lg-button palette, .12em, full width, and a min-height (50px at ≤560px,
 * 48px at ≤670px tall).
 */
function InkButton({
  p,
  label,
  onPress,
  disabled,
  submit,
  minHeight,
  style,
}: {
  p: LoginPalette;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  submit?: boolean;
  /** `.rr-lg-submit`'s min-height at the current tier. */
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const bg = submit ? p.button : colors.ink;
  const ink = submit ? p.buttonInk : colors.paper;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          paddingVertical: 14,
          paddingHorizontal: 24,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          borderWidth: 1,
          borderColor: bg,
          backgroundColor: bg,
          opacity: disabled ? 0.6 : pressed ? 0.88 : 1,
        },
        submit ? { minHeight: minHeight ?? 50, alignSelf: "stretch" } : { alignSelf: "flex-start" },
        style,
      ]}
    >
      <Txt weight={700} size={11} ls={submit ? 0.12 : 0.08} upper style={{ color: ink }}>
        {label}
      </Txt>
    </Pressable>
  );
}

/**
 * `.rr-lg-f` — a label over a field written on a rule. Module-scoped: a
 * component defined inside the screen is a new type every render, which
 * remounts the input and drops the keyboard on each keystroke.
 */
function Field({
  p,
  label,
  value,
  onChange,
  placeholder,
  hint,
  secure,
  email,
  autoComplete,
  tier,
  inputRef,
}: {
  p: LoginPalette;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint?: string;
  secure?: boolean;
  email?: boolean;
  autoComplete?: "name" | "email" | "current-password" | "new-password";
  tier: Tier;
  /** The input itself, for the desk to focus — as the site's input().focus(). */
  inputRef?: RefObject<TextInput | null>;
}) {
  const [focus, setFocus] = useState(false);
  // .rr-lg-in — 43px/10px; ≤730 tall 39px/8px; ≤670 tall 37px/7px
  const inH = at(tier, 43, 39, 37);
  const inPad = at(tier, 10, 8, 7);
  return (
    <View style={{ gap: 3 }}>
      <Label p={p}>{label}</Label>
      <View>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={p.faint}
          secureTextEntry={secure}
          keyboardType={email ? "email-address" : "default"}
          autoCapitalize={email || secure ? "none" : "words"}
          autoCorrect={false}
          autoComplete={autoComplete}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            minHeight: inH,
            paddingVertical: inPad,
            paddingHorizontal: 2,
            borderBottomWidth: 1,
            borderBottomColor: focus ? p.accent : p.rule,
            color: p.ink,
            fontFamily: FONTS.sansMedium,
            fontSize: 15,
          }}
        />
        {/* :focus — box-shadow 0 1px 0 accent: the rule doubles, nothing moves */}
        {focus ? (
          <View style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 1, backgroundColor: p.accent }} />
        ) : null}
      </View>
      {hint ? (
        /* .rr-lg-fieldhint — margin-top 5px; 3px at ≤670 tall */
        <Txt size={9.5} line={1.45} style={{ color: p.faint, marginTop: tier.t670 ? 3 : 5 }}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

/* ----------------------------------------------------------- the screen --- */

export default function SignIn() {
  const { user, booting, guest, setUser, startGuest, signOut } = useSession();
  const { mode } = useTheme();
  const { width, clamp } = useInk();
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const dark = mode === "dark";
  const p = loginPalette(mode);
  const tier = tierOf(winW, winH);

  // `?flow=signup` OPENS ON THE CREATE-ACCOUNT PANEL — the listening room's
  // shop door says "sign up to listen", and it would be a poor door that
  // opened on the wrong panel. `?next=` is where to go once in.
  const { flow: wanted, next } = useLocalSearchParams<{ flow?: string; next?: string }>();
  const [flow, setFlow] = useState<Flow>(wanted === "signup" ? "signup" : "signin");
  const [way, setWay] = useState<Mode>("letter");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The sent panel: who the letter went to, and which letter. */
  const [sent, setSent] = useState<{ email: string; kind: "letter" | "confirm" } | null>(null);
  const [heroH, setHeroH] = useState(0);

  const signingUp = flow === "signup";
  const byPassword = way === "password";

  // LoginEnhancer focuses the name input on "Create an account", the email
  // input on "Sign in" and on "Enter it again." — on a phone that raises the
  // keyboard on the first field. The name field mounts on the render after
  // the door is chosen, so the focus is asked for and paid once it exists.
  const nameRef = useRef<TextInput | null>(null);
  const emailRef = useRef<TextInput | null>(null);
  const wantFocus = useRef<"name" | "email" | null>(null);
  useEffect(() => {
    const which = wantFocus.current;
    if (!which) return;
    wantFocus.current = null;
    (which === "name" ? nameRef : emailRef).current?.focus();
  }, [flow, sent]);

  const chooseFlow = (next: Flow) => {
    // The door already open: nothing re-renders, so the focus is paid now.
    if (next === flow) return void (next === "signup" ? nameRef : emailRef).current?.focus();
    wantFocus.current = next === "signup" ? "name" : "email";
    setFlow(next);
    setError(null);
  };
  const chooseWay = (next: Mode) => {
    setWay(next);
    setError(null);
  };
  /** The bubble goes on the next keystroke; so does the refusal here. */
  const edit = (set: (v: string) => void) => (v: string) => {
    set(v);
    setError(null);
  };

  /** Carry the card in: adopt the session and go to the rooms. */
  const enter = useCallback(
    (u: { id: string; email: string; name: string }) => {
      setUser(u);
      router.replace(landing(next));
    },
    [setUser, next],
  );

  /**
   * The preview's enter: the card is adopted, then the working model's record
   * goes down under the guest pass's key and is read back — see
   * adoptPreviewSession — so a relaunch finds the reader again below.
   */
  const enterPreview = useCallback(
    async (e: string, n: string) => {
      await adoptPreviewSession(enter, e, n);
    },
    [enter],
  );

  // A relaunch on a development desk: session.tsx hydrates the guest pass
  // only, so a preview record it walked past is adopted here, and the reader
  // stays in — as the site's localStorage session keeps them in.
  useEffect(() => {
    if (!PREVIEW || booting || user) return;
    let alive = true;
    void readPreviewSession().then((s) => {
      if (alive && s) enter({ id: "", email: s.email, name: s.name });
    });
    return () => {
      alive = false;
    };
  }, [booting, user, enter]);

  // A reader returning from a letter arrives carrying tokens on the URL —
  // romanreads://sign-in#access_token=… — the site's consumeAuthRedirect().
  // The site scrubs its hash the moment it is read (clean()); expo-linking
  // keeps the launch URL until a new link arrives, so once the letter has
  // been read — well or badly — the cached URL is cleared, and
  // consumeAuthLink itself refuses a URL it has already spent.
  const url = useLinkingURL();
  useEffect(() => {
    if (!url || !DESK_LIVE) return;
    let alive = true;
    void consumeAuthLink(url)
      .then((landed) => {
        if (landed) clearInitialURL();
        if (!alive || !landed) return;
        if (landed.error) return setError(landed.error);
        if (landed.user) enter(landed.user);
      })
      .catch(() => {
        clearInitialURL();
        if (alive) setError("We couldn’t reach our server. Check your connection and try again.");
      });
    return () => {
      alive = false;
    };
  }, [url, enter]);

  const submit = async () => {
    if (busy) return;
    const e = email.trim();
    // form.checkValidity() on the site: the browser's own bubble, its own
    // words, and the FIRST invalid field in document order — name, email,
    // password. `required` and type="email" are the only constraints there.
    if (signingUp && !name.trim()) return setError(FILL_IN);
    if (!e) return setError(FILL_IN);
    if (!EMAIL.test(e)) return setError(emailMismatch(e));
    if (byPassword && !password) return setError(FILL_IN);
    setError(null);

    // Preview mode: anything is accepted, the letter arrives instantly.
    if (!DESK_LIVE) {
      if (byPassword) return void enterPreview(e, name);
      setSent({ email: e, kind: "letter" });
      return;
    }

    setBusy(true);
    try {
      if (byPassword) {
        const result = signingUp
          ? await signUpWithPassword(e, password, name.trim())
          : await signInWithPassword(e, password);
        if (result.error) return setError(result.error);
        // No session back means the project asks for email confirmation.
        if (!result.user) return setSent({ email: e, kind: "confirm" });
        return enter({ ...result.user, name: result.user.name || name.trim() });
      }
      const result = await sendMagicLink(e, name.trim(), signingUp);
      if (result.error) return setError(result.error);
      setSent({ email: e, kind: "letter" });
    } catch {
      setError("We couldn’t reach our server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (booting) return null;

  // A guest pass is not a card: the desk still offers one. A real session is.
  const carrying = !!user && !guest;
  const guidance = error ?? guidanceCopy(flow, way);
  // --lg-paper-h: clamp(34px,4.6vh,46px); ≤730 tall clamp(26px,4vh,38px)
  const paperH = (tier.t730 ? vh(winH, 26, 4, 38) : vh(winH, 34, 4.6, 46)) + insets.bottom;
  const windowH = signingUp && byPassword ? vh(winH, 56, 8, 80) : vh(winH, 84, 13, 128);
  const windowGap = vh(winH, 12, 1.8, 18);
  const shellX = tier.narrow ? 16 : 20;
  const windowW = width - 2 * shellX + 24;
  const heroMin = winH - insets.top - NAV_H;
  const submitH = at(tier, 50, 50, 48);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, backgroundColor: p.bg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* tornMinimalNavHtml — the mark is the way home, as on the site */}
          <TornNav onBrand={() => openOnSite("/")} />

          {/* .rr-lg-hero — min-height:calc(100svh - 70px); overflow:clip */}
          <View
            style={{ flexGrow: 1, minHeight: heroMin, overflow: "hidden", backgroundColor: p.bg }}
            onLayout={(ev) => {
              const h = ev.nativeEvent.layout.height;
              setHeroH((prev) => (prev === h ? prev : h));
            }}
          >
            {heroH > 0 ? (
              <HeroGlow width={width} height={heroH} color={p.glow[0]} alpha={p.glow[1]} id={`lg-hero-${mode}`} />
            ) : null}
            <Sky p={p} />

            {/* .rr-lg-shell — padding:26px 20px calc(paper-h + 20px), the top
                20px at ≤730 tall and 16px at ≤670, the sides 16px at ≤380 wide;
                the auth column takes margin:auto, which is centring that gives
                way when the form outgrows the screen */}
            <View
              style={{
                flexGrow: 1,
                paddingTop: at(tier, 26, 20, 16),
                paddingHorizontal: shellX,
                paddingBottom: paperH + 20,
                justifyContent: "center",
                zIndex: 1,
              }}
            >
              <View style={{ width: "100%", maxWidth: 620, alignSelf: "center" }}>
                {/* .rr-lg-mobile-window — order:-1; width:calc(100% + 24px);
                    height:clamp(84px,13vh,128px); margin:0 -12px clamp(12px,1.8vh,18px).
                    display:none at ≤730 tall: the one thing here that carries
                    no information goes when the screen cannot hold both */}
                {tier.t730 ? null : (
                  <View
                    accessibilityRole="image"
                    accessibilityLabel="A classical figure leaning through a window"
                    style={{
                      height: windowH,
                      marginHorizontal: -12,
                      marginBottom: windowGap,
                    }}
                  >
                    <WindowGlow
                      width={windowW}
                      height={windowH}
                      color={p.glow[0]}
                      alpha={p.glow[1]}
                      id={`lg-window-${mode}`}
                    />
                    <Image
                      source={dark ? WINDOW_DARK : WINDOW_LIGHT}
                      contentFit="contain"
                      style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
                    />
                  </View>
                )}

                {carrying ? (
                  /* .rr-lg-carrying — the reader is already signed in */
                  <View>
                    <Txt
                      family="Cormorant Garamond"
                      weight={500}
                      size={29}
                      line={1.02}
                      ls={-0.028}
                      style={{ color: p.ink }}
                    >
                      You’re already signed in.
                    </Txt>
                    <Txt size={12.5} line={1.7} style={{ color: p.muted, marginTop: 10 }}>
                      Signed in as{" "}
                      <Txt weight={700} size={12.5} line={1.7} style={{ color: p.ink }}>
                        {user?.name || user?.email || "you"}
                      </Txt>
                      . Your books, orders, and listening progress are saved.
                    </Txt>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 20 }}>
                      {/* href="/account" — the overview, as the site's link says */}
                      <InkButton p={p} label="Go to your account" onPress={() => router.replace("/")} />
                      {/* .rr-pt-btn--ghost, with .rr-lg-carry-row's --lg-ink /
                          --lg-line-strong override */}
                      <Pressable
                        onPress={() => void signOut()}
                        accessibilityRole="button"
                        style={{
                          paddingVertical: 14,
                          paddingHorizontal: 24,
                          justifyContent: "center",
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: p.lineStrong,
                        }}
                      >
                        <Txt weight={700} size={11} ls={0.08} upper style={{ color: p.ink }}>
                          Switch account
                        </Txt>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  /* .rr-lg-panel */
                  <View>
                    {sent ? (
                      /* .rr-lg-sent */
                      <View style={{ paddingTop: 2 }}>
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            borderWidth: 1,
                            borderColor: p.accent,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Image source={MARK} contentFit="contain" tintColor={p.accent} style={{ width: 22, height: 22 }} />
                        </View>
                        <Txt
                          family="Cormorant Garamond"
                          weight={500}
                          size={29}
                          line={1.02}
                          ls={-0.028}
                          style={{ color: p.ink, marginTop: 16 }}
                        >
                          {DESK_LIVE
                            ? sent.kind === "confirm"
                              ? "Confirm your email address."
                              : "Your sign-in link is on its way."
                            : "Your sign-in link is ready."}
                        </Txt>
                        <Txt size={12.5} line={1.7} style={{ color: p.muted, marginTop: 10 }}>
                          Sent to{" "}
                          <Txt weight={700} size={12.5} line={1.7} style={{ color: p.ink }}>
                            {sent.email}
                          </Txt>
                          .{" "}
                          {DESK_LIVE
                            ? sent.kind === "confirm"
                              ? "Open the email we sent and your account is created."
                              : "Open it from your inbox and you will land back here, signed in."
                            : "Open the link and you’re signed in to your account."}
                        </Txt>
                        {DESK_LIVE ? null : (
                          /* .rr-lg-sent .rr-pt-btn — preview only */
                          <InkButton
                            p={p}
                            label="Open the sign-in link"
                            onPress={() => void enterPreview(sent.email, name)}
                            style={{ marginTop: 20 }}
                          />
                        )}
                        <View style={{ maxWidth: 320, marginTop: 14, flexDirection: "row", flexWrap: "wrap", alignItems: "baseline" }}>
                          <Txt size={11} line={1.6} style={{ color: p.muted }}>
                            Not your address?{" "}
                          </Txt>
                          <LinkWord
                            p={p}
                            size={11}
                            onPress={() => {
                              wantFocus.current = "email";
                              setSent(null);
                            }}
                          >
                            Enter it again.
                          </LinkWord>
                        </View>
                      </View>
                    ) : (
                      /* .rr-lg-form */
                      <View>
                        {/* .rr-lg-panelkick — a 24px rule, 11px, then the words;
                            margin-bottom 12px, 8px at ≤730 tall, 6px at ≤670 */}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 11, marginBottom: at(tier, 12, 8, 6) }}>
                          <View style={{ width: 24, height: 1, backgroundColor: p.accent }} />
                          <Label p={p} weight={800}>
                            Your account
                          </Label>
                        </View>
                        {/* .rr-lg-paneltitle — 500 clamp(31px,8.6vw,38px)/.97 Cormorant,
                            -.032em; clamp(27px,7.4vw,33px) at ≤730 tall */}
                        <Txt
                          family="Cormorant Garamond"
                          weight={500}
                          size={tier.t730 ? clamp(27, 7.4, 33) : clamp(31, 8.6, 38)}
                          line={0.97}
                          ls={-0.032}
                          accessibilityRole="header"
                          style={{ color: p.ink }}
                        >
                          {titleCopy(flow)}
                        </Txt>

                        {/* .rr-lg-flow — serif words on a shared rule; 2px ink under
                            the live one. margin-top 20px, 18px at ≤730 tall; the
                            words 18px over 12px, 16px over 10px at ≤670 */}
                        <View
                          accessibilityRole="tablist"
                          style={{
                            flexDirection: "row",
                            gap: 24,
                            marginTop: tier.t730 ? 18 : 20,
                            borderBottomWidth: 1,
                            borderBottomColor: p.line,
                          }}
                        >
                          {(
                            [
                              ["signin", "Sign in"],
                              ["signup", "Create an account"],
                            ] as const
                          ).map(([key, label]) => {
                            const on = flow === key;
                            return (
                              <Pressable
                                key={key}
                                onPress={() => chooseFlow(key)}
                                accessibilityRole="tab"
                                accessibilityState={{ selected: on }}
                                style={{ paddingBottom: tier.t670 ? 10 : 12 }}
                              >
                                <Txt
                                  family="Cormorant Garamond"
                                  weight={600}
                                  size={tier.t670 ? 16 : 18}
                                  line={tier.t670 ? 16 : 18}
                                  style={{ color: on ? p.ink : p.faint }}
                                >
                                  {label}
                                </Txt>
                                {on ? (
                                  <View style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, backgroundColor: p.ink }} />
                                ) : null}
                              </Pressable>
                            );
                          })}
                        </View>

                        {/* .rr-lg-seg — two outlined chips, the live one inked;
                            margin 16/20, 14/16 at ≤730 tall, 12/13 at ≤670 */}
                        <View
                          accessibilityRole="radiogroup"
                          style={{
                            flexDirection: "row",
                            gap: 7,
                            marginTop: at(tier, 16, 14, 12),
                            marginBottom: at(tier, 20, 16, 13),
                          }}
                        >
                          {(
                            [
                              ["letter", "Email link"],
                              ["password", "Password"],
                            ] as const
                          ).map(([key, label]) => {
                            const on = way === key;
                            return (
                              <Pressable
                                key={key}
                                onPress={() => chooseWay(key)}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: on }}
                                style={{
                                  minHeight: 33,
                                  paddingHorizontal: 14,
                                  justifyContent: "center",
                                  borderRadius: 999,
                                  borderWidth: 1,
                                  borderColor: on ? p.button : p.lineStrong,
                                  backgroundColor: on ? p.button : "transparent",
                                }}
                              >
                                <Txt weight={700} size={9} ls={0.035} style={{ color: on ? p.buttonInk : p.muted }}>
                                  {label}
                                </Txt>
                              </Pressable>
                            );
                          })}
                        </View>

                        {/* .rr-lg-fields — gap:17px at ≤560px; 13px at ≤730 tall, 11px at ≤670 */}
                        <View style={{ gap: at(tier, 17, 13, 11) }}>
                          {signingUp ? (
                            <Field
                              p={p}
                              label="Your name"
                              value={name}
                              onChange={edit(setName)}
                              placeholder="How should we address you?"
                              autoComplete="name"
                              tier={tier}
                              inputRef={nameRef}
                            />
                          ) : null}
                          <Field
                            p={p}
                            label="Email address"
                            value={email}
                            onChange={edit(setEmail)}
                            placeholder="reader@example.com"
                            email
                            autoComplete="email"
                            tier={tier}
                            inputRef={emailRef}
                          />
                          {byPassword ? (
                            <Field
                              p={p}
                              label="Password"
                              value={password}
                              onChange={edit(setPassword)}
                              placeholder="Enter your password"
                              secure
                              autoComplete={signingUp ? "new-password" : "current-password"}
                              hint="Forgot it? Use Email link instead."
                              tier={tier}
                            />
                          ) : null}
                        </View>

                        {/* .rr-lg-guidance — a margin note against a brass rule;
                            :empty takes it away. .is-error carries a ringed "!".
                            margin-top 19px, 15px at ≤730 tall, 12px at ≤670 */}
                        {guidance ? (
                          <View
                            accessibilityLiveRegion="polite"
                            style={{
                              flexDirection: "row",
                              alignItems: "flex-start",
                              gap: 8,
                              marginTop: at(tier, 19, 15, 12),
                              paddingVertical: 1,
                              paddingLeft: 13,
                              borderLeftWidth: 2,
                              borderLeftColor: error ? p.warn : p.accentSoft,
                            }}
                          >
                            {error ? (
                              <View
                                style={{
                                  width: 17,
                                  height: 17,
                                  borderRadius: 8.5,
                                  borderWidth: 1,
                                  borderColor: p.warn,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {/* .rr-lg-guidance.is-error::before — 700 11px Cormorant */}
                                <Txt family="Cormorant Garamond" weight={700} size={11} line={11} style={{ color: p.warn }}>
                                  !
                                </Txt>
                              </View>
                            ) : null}
                            <Txt weight={500} size={10.5} line={1.6} style={{ color: error ? p.warn : p.muted, flex: 1 }}>
                              {guidance}
                            </Txt>
                          </View>
                        ) : null}

                        {/* .rr-lg-submit — margin-top:18px; min-height:50px at ≤560px;
                            16px at ≤730 tall; 48px over 13px at ≤670 */}
                        <InkButton
                          p={p}
                          submit
                          minHeight={submitH}
                          label={submitCopy(flow, way)}
                          onPress={() => void submit()}
                          disabled={busy}
                          style={{ marginTop: at(tier, 18, 16, 13) }}
                        />

                        {/* .rr-lg-demo — preview only; [hidden] once a real desk answers */}
                        {DESK_LIVE ? null : (
                          <Txt
                            family="Caveat"
                            weight={500}
                            size={13}
                            line={1.2}
                            style={{
                              color: p.accent,
                              marginTop: 12,
                              alignSelf: "flex-end",
                              transform: [{ rotate: "-2deg" }],
                            }}
                          >
                            instant in this preview
                          </Txt>
                        )}
                      </View>
                    )}

                    {/* .rr-lg-panelnav — the third door, on a rule; 16/14,
                        14/13 at ≤730 tall, 12/11 at ≤670 */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 16,
                        marginTop: at(tier, 16, 14, 12),
                        paddingTop: at(tier, 14, 13, 11),
                        borderTopWidth: 1,
                        borderTopColor: p.line,
                      }}
                    >
                      <LinkWord
                        p={p}
                        size={10}
                        onPress={() => {
                          // No account, no letter, no server — the rooms on sample data.
                          startGuest();
                          router.replace(landing(next));
                        }}
                      >
                        Continue as a guest →
                      </LinkWord>
                    </View>
                  </View>
                )}
              </View>
            </View>

            <BottomPaper width={width} height={paperH} p={p} dark={dark} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
