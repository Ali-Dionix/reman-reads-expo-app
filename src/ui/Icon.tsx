// A 24-box line icon — appShell.ts's `appIcon(key, size)`.
//
// The markup is the site's own (src/ui/icons.ts, generated), stroked in
// currentColor, so `color` here is what `color:` on the row or tab resolves
// to on the web. `size` only ever changes the box, never the strokes.
//
// SvgXml rather than a hand-parsed part list: the site authors these as
// markup, and a transcription into <Path>/<Circle> props is one more place a
// glyph can drift. The parse is memoised per (name, size).

import { useMemo } from "react";
import type { ColorValue } from "react-native";
import { SvgXml } from "react-native-svg";

import { CHEVRON_16, ICON, ROW_CHEVRON_16, type IconName } from "./icons";

export type { IconName };

export function Icon({
  name,
  size = 22,
  color,
}: {
  name: IconName;
  size?: number;
  /** What currentColor resolves to. */
  color: ColorValue;
}) {
  const xml = useMemo(
    () =>
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none">${ICON[name]}</svg>`,
    [name, size],
  );
  return <SvgXml xml={xml} width={size} height={size} color={color} />;
}

/**
 * The chevron. `kind="row"` is `.rr-ap-row-go` (1.6 stroke, 16px);
 * `kind="sheet"` is the + sheet's CHEV (1.7 stroke) at the size the caller
 * gives it — 20px in a row, 11px in the foot.
 */
export function Chevron({
  size = 16,
  color,
  kind = "row",
}: {
  size?: number;
  color: ColorValue;
  kind?: "row" | "sheet";
}) {
  const xml = useMemo(
    () =>
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="none">${
        kind === "row" ? ROW_CHEVRON_16 : CHEVRON_16
      }</svg>`,
    [size, kind],
  );
  return <SvgXml xml={xml} width={size} height={size} color={color} />;
}
