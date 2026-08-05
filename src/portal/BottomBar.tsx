// `.rr-pt-bottom` — the portal's mobile bottom bar, transcribed.
//
// A custom tab bar rather than the default one, because the web bar has a
// detail the stock component cannot express: the active room is marked by a
// 24×2 brass tab hanging off the TOP edge of its cell, not by a tint alone.
// Colours, sizes and the 23px glyphs are portalShared.ts's own.

import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ROOMS } from "../nav/rooms";
import { useInk } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { FONTS } from "../theme/type";
import { RoomIcon } from "../ui/RoomIcon";
import { ListeningDock } from "./ListeningDock";

export function BottomBar({ state, navigation }: BottomTabBarProps) {
  const { ink } = useInk();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View>
      {/* the travelling record rides directly above the bar, in every room */}
      <ListeningDock onOpen={() => navigation.navigate("listening")} />

      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.navpaper,
            borderTopColor: ink(0.14),
            paddingBottom: insets.bottom,
          },
        ]}
      >
      {state.routes.map((route, index) => {
        const room = ROOMS.find((r) => r.key === roomKeyFor(route.name));
        if (!room) return null;

        const on = state.index === index;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={on ? { selected: true } : {}}
            accessibilityLabel={room.label}
            style={styles.link}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (on || event.defaultPrevented) return;
              Haptics.selectionAsync().catch(() => {});
              navigation.navigate(route.name);
            }}
          >
            {/* .rr-pt-bot-link.is-on::before */}
            {on ? <View style={[styles.tab, { backgroundColor: colors.brass }]} /> : null}

            <RoomIcon
              parts={room.icon}
              size={23}
              color={on ? colors.brick : ink(0.5)}
            />
            <Text
              numberOfLines={1}
              style={[styles.label, { color: on ? colors.ink : ink(0.5) }]}
            >
              {room.short}
            </Text>
          </Pressable>
        );
      })}
      </View>
    </View>
  );
}

/** Route file name → PORTAL_NAV key. `index` is the hub. */
function roomKeyFor(routeName: string): string {
  return routeName === "index" ? "overview" : routeName;
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", borderTopWidth: 1 },
  link: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingTop: 10,
    paddingBottom: 7,
    paddingHorizontal: 2,
    minWidth: 0,
  },
  tab: {
    position: "absolute",
    top: 0,
    width: 24,
    height: 2,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  label: {
    fontFamily: FONTS.sansSemi,
    fontSize: 9,
    maxWidth: "100%",
  },
});
