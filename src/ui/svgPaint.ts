// SVG paints are handed over OPAQUE, with the alpha on a separate opacity prop.
//
// Measured on the test phone (Android, Expo Go, react-native-svg 15): a Path
// filled `rgba(43,30,16,.1)` with fillOpacity .28 painted at .28 of SOLID
// brown, not .028 — the colour's own alpha was dropped. The tear's haze is six
// such copies stacked, so a 3% wash on the web renderer came out as a ~65%
// dark band on the phone. fillOpacity / strokeOpacity / stopOpacity are
// honoured on every platform, so every SVG paint in the kit goes through
// here: an opaque colour, and the alpha the caller meant, to multiply into
// whatever ramp the drawing already applies.
//
// Handles what the theme layer emits: rgba()/rgb(), #rgb/#rgba/#rrggbb/#rrggbbaa.
// Anything else (a named colour, "none", a url(#…)) passes through untouched.

export type SvgPaint = { color: string; alpha: number };

const HEX = /^#([0-9a-f]{3,8})$/i;
const FUNC = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+%?)\s*)?\)$/i;

export function svgPaint(color: string | undefined): SvgPaint {
  if (!color) return { color: "none", alpha: 1 };
  const f = FUNC.exec(color.trim());
  if (f) {
    const a = f[4] == null ? 1 : f[4].endsWith("%") ? parseFloat(f[4]) / 100 : parseFloat(f[4]);
    return { color: `rgb(${f[1]},${f[2]},${f[3]})`, alpha: clamp(a) };
  }
  const h = HEX.exec(color.trim());
  if (h) {
    let hex = h[1];
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map((c) => c + c).join("");
    if (hex.length === 8) {
      return { color: `#${hex.slice(0, 6)}`, alpha: clamp(parseInt(hex.slice(6, 8), 16) / 255) };
    }
    return { color: `#${hex}`, alpha: 1 };
  }
  return { color, alpha: 1 };
}

const clamp = (a: number): number => (Number.isFinite(a) ? Math.min(1, Math.max(0, a)) : 1);

/** `fill` + `fillOpacity` for a JSX spread: `<Path {...fillProps(color, ramp)} />`. */
export const fillProps = (color: string | undefined, opacity = 1) => {
  const p = svgPaint(color);
  return { fill: p.color, fillOpacity: p.alpha * opacity };
};
export const strokeProps = (color: string | undefined, opacity = 1) => {
  const p = svgPaint(color);
  return { stroke: p.color, strokeOpacity: p.alpha * opacity };
};
export const stopProps = (color: string | undefined, opacity = 1) => {
  const p = svgPaint(color);
  return { stopColor: p.color, stopOpacity: p.alpha * opacity };
};
