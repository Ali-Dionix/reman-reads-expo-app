// Profile is a room with a sub-screen: /profile is the room, /profile/settings
// is `/account/profile/settings` — the Profile tab (so the bar stays lit on
// Profile), but not the Profile screen. Its top bar names it Settings with
// the eyebrow "Profile", and its back disc returns to Profile rather than
// skipping two levels to Home (appShellHtml's `title` / `back` options).

import { Stack } from "expo-router";

import { useTheme } from "../../../src/theme/ThemeProvider";

// The room is the stack's anchor. Without it a cold open of /profile/settings
// (a deep link, a restored tab, a typed URL on web) builds the stack with
// settings alone, and the back disc then pops the TABS — to Home — instead of
// to Profile. With it the stack is always [index, settings] and back is back.
export const unstable_settings = { anchor: "index" };

export default function ProfileLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.desk },
        animation: "default",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
