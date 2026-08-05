// The portal shell's mobile half: the gate, then `.rr-pt-bottom`.
//
// The rooms, their order, their short labels and their glyphs all come from
// src/nav/rooms.ts, which is PORTAL_NAV transcribed. Nothing about the set is
// decided here. The bar itself is src/portal/BottomBar.tsx.

import { Redirect, Tabs } from "expo-router";

import { useSession } from "../../src/lib/session";
import { BottomBar } from "../../src/portal/BottomBar";
import { ROOMS } from "../../src/nav/rooms";

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

  // Hold rather than flashing the Issue Desk at a reader who is already signed
  // in — the keychain read is fast but it is not free.
  if (booting) return null;
  if (!user) return <Redirect href="/sign-in" />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BottomBar {...props} />}>
      {ROOMS.map((room) => (
        <Tabs.Screen key={room.key} name={FILE[room.key]} options={{ title: room.short }} />
      ))}
    </Tabs>
  );
}
