// "Download my data" — ProfileEnhancer's doExport, on a phone.
//
// The site assembles the dossier from what is already hydrated (no fetch,
// nothing that can fail halfway) and hands the browser a JSON file. A phone
// has no download: the same JSON goes out through the OS share sheet
// (react-native's own Share — Files, Mail, AirDrop, whatever the reader
// picks). The shape is the site's, field for field, so a record exported here
// and one exported there read the same.

import { Share } from "react-native";

import { readLedger, type SettingsState } from "./state";

export type Dossier = Record<string, unknown>;

/** The file the site names: `roman-reads-record-YYYY-MM-DD.json`. */
export const dossierName = (): string => `roman-reads-record-${new Date().toISOString().slice(0, 10)}.json`;

export async function buildDossier(
  state: SettingsState,
  card: { name: string; email: string; issued: string } | null,
): Promise<Dossier> {
  const raw = (await readLedger()) ?? {};
  return {
    exported: new Date().toISOString(),
    card: card ? { name: card.name, email: card.email, issued: card.issued, no: state.cardNo } : null,
    particulars: {
      address: state.address,
      courierNote: state.shipNote,
      binding: state.binding,
      bookplate: state.bookplate,
      noPricesOnSlip: state.giftNoPrices,
      readingLanguages: raw.langs ?? [],
      deskLanguage: raw.hermesLang ?? "",
      spoilerGuard: raw.spoilerGuard ?? false,
    },
    letters: {
      weekly: state.weekly,
      pressings: state.lettersPressed,
      digest: state.lettersDigest,
      orders: "always on",
    },
    deck: {
      speed: state.audioSpeed,
      voice: (raw.audioVoice as string) || "house narrator",
      autoplay: state.audioAutoplay,
      rewindOnResume: state.audioRewind,
      skipBy: state.audioSkip,
      sleepAfter: state.audioSleep,
      readAlong: state.readAlong,
    },
    shelf: raw.shelf ?? [],
    waitlist: raw.waitlist ?? [],
    purchases: raw.purchases ?? [],
    listening: raw.listening ?? {},
    reading: raw.companion ?? {},
    correspondence: raw.hermesLog ?? [],
  };
}

/**
 * Hand the dossier to the share sheet. Resolves true when the reader sent it
 * somewhere, false when the sheet was dismissed; throws when the platform
 * refused to open one (the site's "the browser refused the download.").
 */
export async function shareDossier(dossier: Dossier): Promise<boolean> {
  const title = dossierName();
  const r = await Share.share({ title, message: JSON.stringify(dossier, null, 2) }, { dialogTitle: title, subject: title });
  return r.action === Share.sharedAction;
}
