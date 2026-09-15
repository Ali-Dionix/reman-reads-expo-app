// Library is a room with a sub-screen: /library is the room, /library/<slug>
// is the book's page — the site's /books/<slug> — on the Library tab (so the
// bar stays lit on Library), but not the Library screen. Its top bar names
// the book with the eyebrow "Library", and its back disc returns to the
// shelf rather than skipping to Home (the same arrangement as Profile and
// its Settings).

import { Stack } from "expo-router";

import { useTheme } from "../../../src/theme/ThemeProvider";

// The room is the stack's anchor. Without it a cold open of /library/<slug>
// (a deep link, a restored tab, a typed URL on web) builds the stack with
// the page alone, and the back disc then pops the TABS — to Home — instead
// of to the shelf. With it the stack is always [index, page] and back is back.
export const unstable_settings = { anchor: "index" };

export default function LibraryLayout() {
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
      <Stack.Screen name="[slug]" />
      {/* the order screen, behind the book: back returns to the page */}
      <Stack.Screen name="checkout" />
    </Stack>
  );
}
