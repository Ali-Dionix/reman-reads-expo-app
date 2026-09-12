// The ledger — appShell.ts's kit, parts 1 and 2: a group of rows, and a row.
//
//   <Group>   .rr-ap-group: a brass label with a dashed rule running off it
//             (.rr-ap-group-h), an optional brick link at the far end, then
//             the rows on a dashed hairline (.rr-ap-rows). No card, no fill:
//             on white paper a filled panel reads as a smudge; the rules are
//             what make a group a group.
//   <Row>     .rr-ap-row: disc · label + note · value · chevron, on a dashed
//             hairline. The disc column collapses when there is no icon
//             (.is-bare) so plain rows and iconed rows still align.
//   <Fold>    a <details> whose <summary> is a row: the controls drop out
//             under it and the rule runs under both.
//
// GRID GAPS ARE REAL EVEN WHEN A COLUMN IS EMPTY. The row is a four-column
// CSS grid (minmax(0,1fr) auto auto, gap 13) and an empty `auto` column still
// costs its gap — so a row with a value and no chevron ends its value 13px
// short of the edge, and a row with nothing on the right still has 26px of
// gaps after the label. AND THE ITEMS FILL FROM THE LEFT: a row with a
// chevron and no value has only two grid items, so the chevron takes the
// middle column and the EMPTY column is the last one — the chevron ends 13px
// in from the edge (site strokes at x 345..349, not 358..362). The flex
// layout here reproduces both with explicit spacers rather than quietly
// tidying them, because a row that is 13px different from the web's is the
// whole reason the old portal read as six pages instead of one.
//
// MIN-HEIGHT IS BORDER-BOX. `.rr-ap-row{min-height:56px}` INCLUDES its 1px
// border-bottom (portalShared sets *{box-sizing:border-box}); the kit draws
// the rule as a separate 1px under the body, so the body is 55 and the row
// pitches at 56, as measured on the site. A <summary> row inside a <details>
// carries no border of its own — <Fold> keeps its body at 56.
//
// `.rr-ap-row-v{max-width:42vw}` is of the VIEWPORT, not the row: 164px at
// 390, not 42% of a 350px row.

import { useState, type ReactNode } from "react";
import { Pressable, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";

import { useInk } from "../theme/ink";
import { useTheme } from "../theme/ThemeProvider";
import { Chevron, Icon, type IconName } from "./Icon";
import { Disc } from "./Disc";
import { Rule, RuledLabel } from "./Rule";
import { Hand, Micro, Row as RowLabel, Sub, Txt, Value } from "./Type";

const GAP = 13;

/**
 * `.rr-ap-group` — margin-top 28; head with 9px under it; rows on a rule.
 *
 * THE RULE UNDER THE HEAD IS THE LIST'S. `.rr-ap-rows` carries the border-top;
 * a group whose body is not a row list (an action grid — Profile's Support,
 * Home's five cells) has no rule there, and its head-to-grid spacing is a
 * COLLAPSED block margin: max(9, 16) = 16, not 25. Pass `rule={false}` for
 * that body and give the grid its own top margin.
 */
export function Group({
  label,
  link,
  rule = true,
  children,
  style,
}: {
  /** `.rr-ap-group-h b` — the brass ledger label. */
  label: string;
  /** `.rr-ap-group-h a` — brick small print at the far end of the rule. */
  link?: { label: string; onPress: () => void };
  /** The `.rr-ap-rows` top rule and the head's 9px. Off for a grid body. */
  rule?: boolean;
  /** The rows. */
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { brick } = useInk();
  return (
    <View style={[{ marginTop: 28 }, style]}>
      <RuledLabel
        style={rule ? { marginBottom: 9 } : undefined}
        trailing={
          link ? (
            <Pressable onPress={link.onPress} accessibilityRole="link" hitSlop={6}>
              <Txt
                weight={700}
                size={9}
                ls={0.14}
                upper
                color="brick"
                style={{
                  paddingBottom: 2,
                  borderBottomWidth: 1,
                  borderBottomColor: brick(0.4, "border"),
                }}
              >
                {link.label}
              </Txt>
            </Pressable>
          ) : undefined
        }
      >
        <Micro>{label}</Micro>
      </RuledLabel>
      {rule ? <Rule /> : null}
      {children}
    </View>
  );
}

/**
 * `.rr-ap-row`. `value` reports state; `onPress` makes the whole row press
 * (and draws the chevron — the web's `to`); `control` replaces value and
 * chevron entirely (a <Switch>, a chip). `note` under the label is the
 * supporting line; `hand` is the Caveat aside under the whole row. `open`
 * is a fold's expanded state (the chevron turns 90°, the value goes to full
 * ink); `rule={false}` leaves the dashed rule to the caller, for something
 * that sits between the row and it.
 */
export function Row({
  label,
  note,
  noteTone = 0.55,
  value,
  valueTone = 0.55,
  icon,
  control,
  hand,
  onPress,
  open,
  rule = true,
  minHeight = 55,
  disabled = false,
  accessibilityLabel,
  accessibilityState,
  style,
}: {
  label: string;
  note?: string;
  /** The note's ink alpha — .55, or .42 for a dimmed `<em>`. */
  noteTone?: number;
  value?: string;
  /** The value's ink alpha — .55, or .42 for a dimmed one. */
  valueTone?: number;
  icon?: IconName;
  control?: ReactNode;
  hand?: string;
  onPress?: () => void;
  /** A fold's state: chevron at 90°, value in full ink. */
  open?: boolean;
  /** Draw the dashed rule under the row (default). */
  rule?: boolean;
  /** The body's min-height: 55 under the kit's rule (56 border-box), 56 for
   *  a <summary> whose border is the <details>'s. */
  minHeight?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityState?: { expanded?: boolean; disabled?: boolean };
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const { ink, brick } = useInk();
  const { width } = useWindowDimensions();
  const chevron = !!onPress;

  const body = (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          columnGap: GAP,
          minHeight,
          paddingVertical: 11,
          paddingHorizontal: 2,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {icon ? (
        <Disc size={34} ring={brick(0.32, "border")} ringWidth={1} tilt={-4}>
          <Icon name={icon} size={17} color={colors.gold2} />
        </Disc>
      ) : null}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <RowLabel>{label}</RowLabel>
        {note ? <Sub tone={noteTone}>{note}</Sub> : null}
        {hand ? (
          <Hand style={{ marginTop: 2, transform: [{ rotate: "-0.5deg" }] }}>{hand}</Hand>
        ) : null}
      </View>
      {control ?? (
        <>
          {value ? (
            <Value tone={open ? 1 : valueTone} numberOfLines={1} style={{ maxWidth: Math.round(width * 0.42) }}>
              {value}
            </Value>
          ) : null}
          {chevron ? (
            <View style={open !== undefined ? { transform: [{ rotate: open ? "90deg" : "0deg" }] } : undefined}>
              <Chevron size={16} color={ink(0.4)} />
            </View>
          ) : null}
          {/* the empty auto columns, gapped — after whatever is there */}
          {!value ? <View /> : null}
          {!chevron ? <View /> : null}
        </>
      )}
      {control ? <View /> : null}
    </View>
  );

  return (
    <View>
      {onPress ? (
        <Pressable
          onPress={onPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={accessibilityState ?? (open !== undefined ? { expanded: open } : undefined)}
          // rgba(11,10,8,.03) as a BACKGROUND: ink is text/border-scoped, so the
          // web leaves this literal alone at night. Stated, not resolved.
          style={({ pressed }) => ({ backgroundColor: pressed ? "rgba(11,10,8,.03)" : undefined })}
        >
          {body}
        </Pressable>
      ) : (
        body
      )}
      {rule ? <Rule /> : null}
    </View>
  );
}

/**
 * A row with controls behind it — the site's `<details>` with a
 * `<summary class="rr-ap-row is-bare">` (Settings' `.rr-pf-fold`): the row
 * presses open, the children drop out under it, and the dashed rule is the
 * details' own, running under both. Open: the chevron turns 90° and the
 * value goes to full ink. The summary carries no border, so its body is 56.
 */
export function Fold({
  label,
  note,
  noteTone,
  value,
  valueTone,
  icon,
  children,
  initiallyOpen = false,
}: {
  label: string;
  note?: string;
  noteTone?: number;
  value: string;
  valueTone?: number;
  icon?: IconName;
  /** What drops out when open (a well of controls). */
  children: ReactNode;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View>
      <Row
        label={label}
        note={note}
        noteTone={noteTone}
        value={value}
        valueTone={valueTone}
        icon={icon}
        open={open}
        onPress={() => setOpen((o) => !o)}
        rule={false}
        minHeight={56}
      />
      {open ? children : null}
      <Rule />
    </View>
  );
}
