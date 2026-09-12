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

import { Redirect, Tabs } from "expo-router";

import { useSession } from "../../src/lib/session";
import { BottomBar } from "../../src/portal/BottomBar";
import { ROOMS, TAB_KEYS } from "../../src/nav/rooms";

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

  // Hold rather than flashing the sign-in wall at a reader who is already
  // signed in — the keychain read is fast but it is not free.
  if (booting) return null;
  if (!user) return <Redirect href="/sign-in" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false, lazy: true }}
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
