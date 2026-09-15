// The root. Fonts, theme, session — then the stack.
//
// Nothing renders until the faces are loaded: the portal's whole look is
// Cormorant against Manrope, and a first paint in the system sans reads as a
// different product for the half-second it lasts.

// PER-WEIGHT SUBPATHS, never the package root. Importing
// "@expo-google-fonts/manrope" pulls its barrel index, which `require`s all
// seven weights — Metro then bundles every one of them. The three families'
// barrels cost ~1.4MB of TTF the app never draws with. Naming the weight
// directly ships only that file. (The site pays the same discipline in
// unicode-range subsetting; this is its mobile equivalent.)
//
// THE THIRTEEN FACES ARE THE THIRTEEN IN src/theme/type.ts — keep the two
// lists in step. Counted from the portal builders on 12 Sep 2026: Manrope
// 400/500/600/700/800, Cormorant 400/400i/500/500i/600/600i/700, Caveat 500.
// (Caveat 600 was loaded before; the site never sets it — every Caveat rule
// is weight 500.)
import { Caveat_500Medium } from "@expo-google-fonts/caveat/500Medium";
import { CormorantGaramond_400Regular } from "@expo-google-fonts/cormorant-garamond/400Regular";
import { CormorantGaramond_400Regular_Italic } from "@expo-google-fonts/cormorant-garamond/400Regular_Italic";
import { CormorantGaramond_500Medium } from "@expo-google-fonts/cormorant-garamond/500Medium";
import { CormorantGaramond_500Medium_Italic } from "@expo-google-fonts/cormorant-garamond/500Medium_Italic";
import { CormorantGaramond_600SemiBold } from "@expo-google-fonts/cormorant-garamond/600SemiBold";
import { CormorantGaramond_600SemiBold_Italic } from "@expo-google-fonts/cormorant-garamond/600SemiBold_Italic";
import { CormorantGaramond_700Bold } from "@expo-google-fonts/cormorant-garamond/700Bold";
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_500Medium } from "@expo-google-fonts/manrope/500Medium";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import { Manrope_800ExtraBold } from "@expo-google-fonts/manrope/800ExtraBold";
import { isRunningInExpoGo } from "expo";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationTheme } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AudioProvider } from "../src/lib/audioStore";
import { SessionProvider, useSession } from "../src/lib/session";
import { SubscriptionProvider } from "../src/lib/subscription";
import { SpeedFollower } from "../src/portal/reader/console/SpeedFollower";
import { ThemeProvider, useTheme, useThemeLook } from "../src/theme/ThemeProvider";
import { ThemeStage } from "../src/theme/ThemeStage";

// THE SPLASH STAYS UP UNTIL THERE IS SOMETHING TO SHOW. Left to itself it
// hides on the first frame the root draws, which here is nothing: the faces
// are still loading, then the keychain is still being read, then the gate
// decides between the rooms and the sign-in wall. Three blank cuts before
// the first real screen. Held, and then let go with a fade over the finished
// first screen, the boot is one cut: the splash dissolves into the room.
// Called at module scope, as the package insists — from a component it can
// be too late. (No-ops on web, where there is no native splash.)
SplashScreen.preventAutoHideAsync().catch(() => {});
// Expo Go cannot take options and warns if asked; a built app fades.
if (!isRunningInExpoGo()) SplashScreen.setOptions({ fade: true, duration: 260 });

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_600SemiBold_Italic,
    CormorantGaramond_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Caveat_500Medium,
  });

  // A face that fails to load must not hold the splash up forever: the app
  // goes on in the system faces, which is a worse look and a working app.
  if (!fontsLoaded && !fontError) return null;

  return (
    // Gesture handler wants to be OUTSIDE everything, and it must be a real
    // flex:1 host or the tree it wraps collapses. It is here for exactly one
    // reader: the pinch that brings the codex leaf closer.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SessionProvider>
            {/* The entitlement, under the session and over the deck: the deck
                reads it for voiceLocked, and every padlock in the rooms reads
                it too. Asked once per reader and again on every foreground —
                the reader subscribes on the WEBSITE and comes back here. */}
            <SubscriptionProvider>
              {/* The deck lives ABOVE the router, like the site's globalThis
                  audioStore singleton — one player, and navigation never stops it */}
              <AudioProvider>
                {/* The platter's follower, ONCE, under the deck: every book
                    that lands takes its own dial before the recorder's first
                    stamp, and the creep keeps counting with the volume shut —
                    the site's loadBand and runRamp (console/SpeedFollower.tsx) */}
                <SpeedFollower />
                <Chrome />
              </AudioProvider>
            </SubscriptionProvider>
          </SessionProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Inside the providers, so the stack's own background can take the theme —
 *  otherwise a push animation flashes white over the desk. */
function Chrome() {
  const { colors, mode } = useTheme();
  // the status bar is system chrome: it changes with the reveal's edge, not
  // with the flip that happens under the held picture
  const look = useThemeLook();
  const { booting } = useSession();

  // The router paints surfaces of its own — the scene behind every tab, the
  // card a push slides in on, the ground under a transition — and paints
  // them from ITS theme, which is a light grey unless told otherwise. On the
  // night desk that grey showed as a flash between rooms, in the frame a
  // lazy tab took to mount. So the router's theme is the desk's own colours,
  // and there is nothing of another colour anywhere under a transition.
  const navTheme = useMemo(() => {
    const base = mode === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.desk,
        card: colors.white,
        text: colors.ink,
        border: colors.desk,
        primary: colors.brass,
        notification: colors.brick,
      },
    };
  }, [mode, colors]);

  // The first real screen is on the tree once the session is known — the
  // rooms for a reader with a card, the sign-in wall for one without. The
  // splash lets go a frame later, so the fade lands on a painted screen and
  // never on the desk alone.
  useEffect(() => {
    if (booting) return;
    const id = requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
    return () => cancelAnimationFrame(id);
  }, [booting]);

  return (
    <NavigationTheme value={navTheme}>
      <View style={{ flex: 1, backgroundColor: colors.desk }}>
        <StatusBar style={look === "dark" ? "light" : "dark"} />
        {/* The lamp switch's stage: it takes the pictures of every ordinary
            screen and draws the reveal over them. The reader is a native Modal
            and therefore its own window, so it wraps its content in a stage of
            its own — see ThemeStage. */}
        <ThemeStage>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.desk },
              // The platform's own push, not a custom one. A portal that animates
              // like the web feels like a website in a frame.
              animation: "default",
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="sign-in" options={{ animation: "fade" }} />
          </Stack>
        </ThemeStage>
      </View>
    </NavigationTheme>
  );
}
