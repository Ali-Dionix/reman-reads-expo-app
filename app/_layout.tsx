// The root. Fonts, theme, session — then the stack.
//
// Nothing renders until the three faces are loaded: the portal's whole look is
// Cormorant against Manrope, and a first paint in the system sans reads as a
// different product for the half-second it lasts.

// PER-WEIGHT SUBPATHS, never the package root. Importing
// "@expo-google-fonts/manrope" pulls its barrel index, which `require`s all
// seven weights — Metro then bundles every one of them. The three families'
// barrels cost ~1.4MB of TTF the app never draws with. Naming the weight
// directly ships only that file. (The site pays the same discipline in
// unicode-range subsetting; this is its mobile equivalent.)
import { Caveat_600SemiBold } from "@expo-google-fonts/caveat/600SemiBold";
import { CormorantGaramond_400Regular } from "@expo-google-fonts/cormorant-garamond/400Regular";
import { CormorantGaramond_400Regular_Italic } from "@expo-google-fonts/cormorant-garamond/400Regular_Italic";
import { CormorantGaramond_500Medium } from "@expo-google-fonts/cormorant-garamond/500Medium";
import { CormorantGaramond_600SemiBold } from "@expo-google-fonts/cormorant-garamond/600SemiBold";
import { CormorantGaramond_600SemiBold_Italic } from "@expo-google-fonts/cormorant-garamond/600SemiBold_Italic";
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AudioProvider } from "../src/lib/audioStore";
import { SessionProvider } from "../src/lib/session";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_600SemiBold_Italic,
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Caveat_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SessionProvider>
          {/* The deck lives ABOVE the router, like the site's globalThis
              audioStore singleton — one player, and navigation never stops it */}
          <AudioProvider>
            <Chrome />
          </AudioProvider>
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** Inside the providers, so the stack's own background can take the theme —
 *  otherwise a push animation flashes white over the parchment. */
function Chrome() {
  const { colors, mode } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
          // The platform's own push, not a custom one. A portal that animates
          // like the web feels like a website in a frame.
          animation: "default",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sign-in" options={{ animation: "fade" }} />
      </Stack>
    </View>
  );
}
