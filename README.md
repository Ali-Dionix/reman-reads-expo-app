# Roman Reads — the app

The phone half of the Reading Room. **Sign in, and access what you already
own.** Nothing is sold or browsed here — see [`docs/APP.md`][plan] in the
website repo for the plan, and its "Store rules" section for why that scope is
commercial rather than aesthetic.

Expo SDK 54 · React Native 0.81 · expo-router 6 · TypeScript.

> **This repo is the app only.** The site, the catalogue, and the page builders
> every screen is transcribed from live in [`Ali-Dionix/roman-reads`][site].
> That split is why `src/data/` is generated rather than authored — see
> [Where the data comes from](#where-the-data-comes-from).

[plan]: https://github.com/Ali-Dionix/roman-reads/blob/main/docs/APP.md
[site]: https://github.com/Ali-Dionix/roman-reads

> **The SDK is pinned to what Expo Go can run.** Expo Go supports exactly one
> SDK — the one it ships with — and the Play Store serves 54 to this project's
> test device. Do not bump the SDK without checking that the phone's Expo Go
> moved first, or the app will refuse to open with *"Project is incompatible
> with this version of Expo Go"*.

## Run it

```bash
npm install && npx expo start
```

Then install **Expo Go** on your phone and scan the QR. No cable, no Android
Studio, no Xcode — and no Mac at any point, including for iOS.

That is enough to run the app: `src/data/` is committed, so the shelves paint
without the website checkout. You only need the section below when the
catalogue changes.

## Connect it to a backend

`app.json` → `extra` carries the config. Empty values are a *working state*:
the app runs with no backend and the Issue Desk says so, exactly as the web
portal behaves with no Supabase vars set.

```jsonc
"extra": {
  "supabaseUrl": "https://<project>.supabase.co",
  "supabasePublishableKey": "<publishable key>",
  "siteOrigin": "https://romanreads.com",
  "audioBase": "https://audio.romanreads.com"
}
```

The publishable key is the same one the website hands every browser; RLS is
what guards the rows. For real builds these come from EAS, not from a commit.

## Layout

| Path | What lives there |
| --- | --- |
| `app/` | Routes. `(tabs)/` is the six-room bottom bar; `sign-in.tsx` is the Issue Desk |
| `src/theme/` | The Night Scriptorium palette and type, lifted from the site's `app/data/theme.ts` |
| `src/ui/` | Paper, TornEdge, Numeral, Rule, Type — the portal's paper devices, in native form |
| `src/portal/` | The transcribed page furniture — slab, doors, slip, billboard, shelf row, card, nav bars |
| `src/nav/rooms.ts` | `PORTAL_NAV` transcribed. The rooms are decided on the web, never here |
| `src/data/` | **Generated.** Never hand-edit — see [Where the data comes from](#where-the-data-comes-from) |
| `src/lib/` | Storage seam, GoTrue/PostgREST client, session context |

## The screens are conversions, not lookalikes

Every screen is a transcription of its own page builder in `app/data/`, at that
file's **mobile media-query values** — the ≤620px slab overlay percentages, the
≤680px order row, the ≤760px two-column grid, the ≤820px login panel. When a
screen needs changing, change the web page first and transcribe the diff; the
comment at the top of each screen names its source file.

## Where the data comes from

Data crosses the same way the screens do — generated, never retyped.
`scripts/gen-mobile-shelf.mjs` **lives in the website repo**, imports the site's
own `audioLibrary.ts`, `portalShared.ts`, `libraryPage.ts` and `pricing.ts`, and
writes this repo's `src/data/*.json`. The price ladder crosses as **tiers**,
never as formatted strings.

The generator writes to a hard-coded `mobile/src/data/`, so regenerating means
putting the two trees in that relation on disk:

```bash
git clone https://github.com/Ali-Dionix/roman-reads.git
git clone https://github.com/Ali-Dionix/reman-reads-expo-app.git roman-reads/mobile
cd roman-reads && npm install && npm run mobile:shelf
```

`roman-reads/.gitignore` ignores `/mobile/`, so the app checkout stays its own
repo — commit the regenerated JSON here, not there.

**You do not need this to work on the app.** `src/data/` is committed; clone
this repo alone and the shelves paint. Reach for the two-tree setup only when
the catalogue itself has moved.

## Three things that will bite you

**Bumping the SDK can lock you out of Expo Go.** See the note at the top. The
error is explicit when it happens, and the fix is either updating Expo Go on
the phone or moving the project back:

```bash
npm install expo@^54.0.0 && npx expo install --fix
```

**`react-native-worklets` must be installed alongside Reanimated 4.** SDK 54
pins `react-native-reanimated@~4.1.1`, which moved its Babel plugin into a
separate package. Without it, *every* bundle dies at
`Cannot find module 'react-native-worklets/plugin'` while compiling
`expo-router/entry.js` — which reads like an expo-router bug and is not one.

**Import fonts by weight, never from the package root.**

```ts
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular"; // ✅
import { Manrope_400Regular } from "@expo-google-fonts/manrope";            // ❌
```

The barrel index `require`s every weight in the family, and Metro bundles all
of them — about 1.4MB of TTF the app never draws with. `src/theme/type.ts`
declares exactly the faces `app/_layout.tsx` loads; keep those two in step,
because a family named but not loaded falls back to the system face silently.

## Checks

```bash
npm run typecheck
```

### Seeing it without a phone

The project carries a **web target purely as a verification aid** — run
`npx expo start --web` and the whole app renders in a browser, where layout,
colours and playback can be inspected directly. It is not a shipping target:
`app.json` has no web icon story and nothing is tested against it.

**One web-only failure is expected.** `expo-audio`'s web build sets
`crossOrigin` on its media element, and the R2 audio bucket sends no
`Access-Control-Allow-Origin` — so pressed editions fail to load *in the
browser only* with `NotSupportedError`. The specimen recordings, served from
the site (which does send CORS), play fine and exercise the same path. Native
has no CORS, so the phone is unaffected. Adding CORS headers to the bucket
would close the gap.

`npx expo export --platform android` bundles the whole app and is the fastest
way to prove a change actually compiles.
