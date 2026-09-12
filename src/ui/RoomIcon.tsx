// A room's line glyph — the icon appShell.ts's SLOTS name for it, drawn by
// <Icon>. Kept as its own name because the tab bar and the home rows both
// ask for "the icon of this room" rather than for a key.

import type { ColorValue } from "react-native";

import { roomByKey, type RoomKey } from "../nav/rooms";
import { Icon } from "./Icon";

export function RoomIcon({
  room,
  color,
  size = 22,
}: {
  room: RoomKey;
  /** ColorValue, not string — react-navigation hands the tab bar an opaque
   *  platform colour, which never survives a String() round-trip. */
  color: ColorValue;
  size?: number;
}) {
  return <Icon name={roomByKey(room).icon} color={color} size={size} />;
}
