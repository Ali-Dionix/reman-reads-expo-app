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
//   animation    NONE — a cut. There was a cross-fade here until 16 Sep 2026,
//                and it is what made the whole app drag on a Pixel 8 Pro:
//                with an animation set, a blurred room's activityState is an
//                Animated interpolation, and a preloaded room that has never
//                been visited sits at "transitioning" — ATTACHED to the native
//                view tree, invisible, and prepared by the renderer on every
//                frame. Five rooms' covers, torn edges and icons (~60 MB of
//                bitmaps) were being re-uploaded to the GPU every frame,
//                which is more than the texture cache holds: 200 uploads a
//                frame, 100 ms frames, on every scroll and for as long as the
//                dock's disc turned (measured with gfxinfo + atrace). With no
//                animation a blurred room is inactive at once — detached, not
//                drawn, not prepared — and the frame is the visible room's
//                alone.
//   preload      the rooms not yet visited are mounted in the background once
//                the first screen has settled (BottomBar's effect), so the
//                first tap on each tab does not pay its mount. A detached
//                room's React tree still exists; attaching it is cheap.
//   freezeOnBlur a blurred room does not re-render either. It only works
//                without an animation (the library's check compares an
//                animated value to a number), which is the other reason the
//                fade is gone.
//
// The web keeps the same cut it always had; there is nothing platform-
// specific left here.

import { Redirect, Tabs } from "expo-router";

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
        animation: "none",
        freezeOnBlur: true,
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
