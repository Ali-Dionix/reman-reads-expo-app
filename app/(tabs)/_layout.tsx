// The portal shell's mobile half: the gate, then `.rr-pt-bottom`.
//
// The rooms, their order, their labels and their glyphs all come from
// src/nav/rooms.ts, which is PORTAL_NAV transcribed. Nothing about the set is
// decided here. The bar itself is src/portal/BottomBar.tsx.
//
// FIVE SLOTS, SIX ROOMS. Home, Library, Audiobooks and Profile are tabs;
// Orders and Ask AI are registered with `href: null` — routable at /orders
// and /hermes (from the + sheet's foot, and from the home screen's rows) but
// not in the bar, exactly as appShell.ts's SLOTS and SHEET_KEYS have it.
// Profile is a directory with its own stack (index + settings), so the
// Profile tab stays lit on /profile/settings.
//
// HOW A ROOM CHANGES. Three things decide whether a tab change reads as a
// cut or a blink, and all three are set here:
//
//   sceneStyle   the ground the navigator paints under every room, in the
//                desk's colour. Unset, it is the router theme's light grey —
//                invisible by day, a flash at night in the frame a lazy room
//                takes to mount.
//   animation    a short cross-fade between the outgoing room and the
//                incoming one, native-driven, so a mount that is still
//                laying out is arriving under a fade rather than snapping
//                in. Rooms not involved in a change are left alone.
//   preload      the rooms not yet visited are mounted in the background once
//                the first screen has settled (BottomBar's effect), so the
//                first tap on each tab does not pay its mount — the one place
//                the JS thread could stall a fade.
//
// Rooms are not frozen while blurred: with an animation set the library
// never freezes them (its check compares an animated value to a number), and
// the cross-fade is the part a reader can see. What a blurred room re-renders
// on is kept cheap instead — the torn sheets memoised, the deck's tick only
// where it is read.
//
// THE FADE IS NATIVE ONLY. The same animated activity state means the web
// fallback (react-native-screens' Screen.web) can no longer `display:none` a
// blurred room, which leaves five invisible rooms in the keyboard's tab
// order; and the web build is the parity rig's, which reads screenshots and
// wants a room fully drawn the moment it is asked for. So the web keeps the
// cut it had, and the phone gets the fade.

import { Redirect, Tabs } from "expo-router";
import { Platform } from "react-native";

import { useSession } from "../../src/lib/session";
import { BottomBar } from "../../src/portal/BottomBar";
import { ROOMS, TAB_KEYS } from "../../src/nav/rooms";
import { useTheme } from "../../src/theme/ThemeProvider";

/** File names inside this group, in PORTAL_NAV order. */
const FILE: Record<string, string> = {
  overview: "index",
  orders: "orders",
  library: "library",
  listening: "listening",
  hermes: "hermes",
  profile: "profile",
};

export default function TabsLayout() {
  const { user, booting } = useSession();
  const { colors } = useTheme();

  // Hold rather than flashing the sign-in wall at a reader who is already
  // signed in — the keychain read is fast but it is not free. (The splash is
  // still up while this holds: app/_layout.tsx keeps it until `booting` ends.)
  if (booting) return null;
  if (!user) return <Redirect href="/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        sceneStyle: { backgroundColor: colors.desk },
        animation: Platform.OS === "web" ? "none" : "fade",
      }}
      tabBar={(props) => <BottomBar {...props} />}
    >
      {ROOMS.map((room) => (
        <Tabs.Screen
          key={room.key}
          name={FILE[room.key]}
          options={{
            title: room.label,
            // a room with no slot in the bar is still a route
            href: TAB_KEYS.includes(room.key) ? undefined : null,
          }}
        />
      ))}
    </Tabs>
  );
}
