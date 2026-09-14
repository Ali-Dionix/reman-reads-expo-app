// `.rr-pt-bottom` / `.rr-ap-nav` — the portal's tab bar, appShell.ts's own.
//
// FIVE SLOTS, NOT SIX: Home, Library, [+], Audiobooks, Profile (SLOTS in
// src/nav/rooms.ts). Orders and Ask AI never fitted a 360px bar and sit at
// the foot of the sheet the centre disc opens. A room with no tab lights no
// tab — on /orders nothing in the bar is on, as on the web.
//
// The bar is a sheet of paper rising from the foot of the screen, torn along
// its TOP edge and drop-shadowed in ink (.rr-ap-nav-paper, HTEAR_TOP). It is
// position:fixed on the web and absolutely positioned here, so content passes
// beneath it and each page pads itself clear (useContentInsets).
//
//   .rr-pt-bottom  padding 0 6px env(safe-area-inset-bottom)
//   .rr-ap-slots   flex; align-items:flex-end; min-height 64
//   .rr-ap-tab     flex:1; column; justify:flex-end; gap 4; padding 9px 2px;
//                  ink .5 — ink and 700 when on
//   svg 22px; b 600 9.5px Manrope .01em, padding-bottom 5 — and when on, the
//   pen-stroke SQUIGGLE in that 5px: no pill, no filled block.
//   .rr-ap-fab     52px ink disc, 1px ink ring, cream +, 3px brass offset,
//                  an inner brass ring inset 4, margin 0 6px, raised 9px.
//
// Haptics stay: a selection tick on a tab, a light impact on the disc.

import type { BottomTabBarProps } from "expo-router/tabs";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { InteractionManager, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { roomByKey, roomKeyForRoute, SLOTS, type RoomKey } from "../nav/rooms";
import { useInk } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { Disc } from "../ui/Disc";
import { Icon } from "../ui/Icon";
import { Squiggle } from "../ui/Squiggle";
import { TornSheet } from "../ui/TornEdge";
import { Txt } from "../ui/Type";
import { AddSheet } from "./AddSheet";
import { ListeningDock } from "./ListeningDock";
import { TAB_H } from "./PortalPage";

export function BottomBar({ state, navigation }: BottomTabBarProps) {
  const { colors, chrome } = useTheme();
  const { ink, width } = useInk();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState(false);

  const height = TAB_H + insets.bottom;
  const activeKey = roomKeyForRoute(state.routes[state.index]?.name ?? "");

  // THE OTHER ROOMS ARE MOUNTED BEHIND THIS ONE, once it has settled. A lazy
  // tab pays its whole mount — the module, its JSON, a grid of covers — on
  // the first tap, on the JS thread, in the same frames the cross-fade wants;
  // on a mid-range phone that is the "blink". Preloaded, the tap only has to
  // attach a tree that already exists. One room at a time, a beat apart, in
  // the bar's own order and the sheet's two rooms last, so nothing here
  // competes with the first screen's own first seconds. `preload` is the
  // navigator's: a room it has already loaded is a no-op.
  useEffect(() => {
    const names = state.routes.map((r) => r.name);
    const order = ["index", "library", "listening", "profile", "orders", "hermes"].filter((n) =>
      names.includes(n),
    );
    const timers: ReturnType<typeof setTimeout>[] = [];
    const task = InteractionManager.runAfterInteractions(() => {
      order.forEach((name, i) => {
        timers.push(
          setTimeout(() => {
            try {
              navigation.preload(name);
            } catch {
              /* a route the navigator does not know is nothing to preload */
            }
          }, 400 + i * 250),
        );
      });
    });
    return () => {
      task.cancel();
      timers.forEach(clearTimeout);
    };
    // once: the set of rooms is fixed (src/nav/rooms.ts), and the effect
    // must not re-run on every tab change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (key: RoomKey) => {
    const routeName = key === "overview" ? "index" : key;
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return;
    const on = activeKey === key;
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (on || event.defaultPrevented) return;
    Haptics.selectionAsync().catch(() => {});
    navigation.navigate(route.name);
  };

  return (
    <>
      <AddSheet open={sheet} onClose={() => setSheet(false)} />
      <View
        style={{ pointerEvents: "box-none", position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 50 }}
      >
        {/* the travelling record rides directly above the bar, in every room */}
        <ListeningDock onOpen={() => navigation.navigate("listening")} />

        <View style={{ height, paddingHorizontal: 6, paddingBottom: insets.bottom }}>
          <TornSheet
            edge="top"
            width={width}
            height={height}
            paper={colors.white}
            line={chrome.tearLine}
            haze={chrome.tearHaze}
            wash={chrome.tearWash}
          />
          <View style={{ flexDirection: "row", alignItems: "flex-end", minHeight: TAB_H }}>
            {SLOTS.map((slot) => {
              if ("action" in slot) {
                return (
                  <View key="fab" style={{ marginHorizontal: 6, transform: [{ translateY: -9 }] }}>
                    <Disc
                      size={52}
                      fill={colors.ink}
                      ring={colors.ink}
                      ringWidth={1}
                      shadow={{ x: 3, y: 3, color: chrome.fabShadow }}
                      inner={chrome.fabRing}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setSheet(true);
                      }}
                      accessibilityLabel="Add your own book"
                      accessibilityState={{ expanded: sheet }}
                    >
                      {/* #FAF7EF in text scope: paper, which is navy at night against the cream disc */}
                      <Icon name="plus" size={24} color={colors.paper} />
                    </Disc>
                  </View>
                );
              }
              const room = roomByKey(slot.key);
              const on = activeKey === slot.key;
              const tint = on ? colors.ink : ink(0.5);
              return (
                <Pressable
                  key={room.key}
                  accessibilityRole="button"
                  accessibilityState={on ? { selected: true } : {}}
                  accessibilityLabel={room.label}
                  onPress={() => go(room.key)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: TAB_H,
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 4,
                    paddingVertical: 9,
                    paddingHorizontal: 2,
                  }}
                >
                  <Icon name={room.icon} size={22} color={tint} />
                  <TabLabel label={slot.short} on={on} color={tint} />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </>
  );
}

/** `.rr-ap-tab b` — the label with 5px under it for the pen-stroke. */
function TabLabel({ label, on, color }: { label: string; on: boolean; color: string }) {
  const [w, setW] = useState(0);
  return (
    <View
      style={{ paddingBottom: 5, maxWidth: "100%" }}
      onLayout={(e) => {
        const width = e.nativeEvent.layout.width;
        setW((prev) => (prev === width ? prev : width));
      }}
    >
      <Txt weight={on ? 700 : 600} size={9.5} ls={0.01} numberOfLines={1} style={{ color }}>
        {label}
      </Txt>
      {on && w > 0 ? (
        <Squiggle width={w} style={{ position: "absolute", left: 0, bottom: 0 }} />
      ) : null}
    </View>
  );
}
