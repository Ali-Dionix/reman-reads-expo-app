// Where a parcel can go — app/data/countries.ts and the two region.ts maps
// the settings page reads, carried across so the Country picker shows the
// site's own grouped list and the delivery note says what the site says.
//
// RAW is the site's string, copied verbatim (ISO 3166-1 alpha-2, complete on
// purpose — see the site file's header). The three shop countries are hoisted
// first and the rest are alphabetical. Keep it in step with the site's file;
// it is data, not design.

export type Country = { code: string; name: string };

// prettier-ignore
const RAW =
  "AF:Afghanistan|AX:Åland Islands|AL:Albania|DZ:Algeria|AS:American Samoa|AD:Andorra|AO:Angola|AI:Anguilla|AQ:Antarctica|AG:Antigua and Barbuda|AR:Argentina|AM:Armenia|AW:Aruba|AU:Australia|AT:Austria|AZ:Azerbaijan|" +
  "BS:Bahamas|BH:Bahrain|BD:Bangladesh|BB:Barbados|BY:Belarus|BE:Belgium|BZ:Belize|BJ:Benin|BM:Bermuda|BT:Bhutan|BO:Bolivia|BQ:Bonaire|BA:Bosnia and Herzegovina|BW:Botswana|BV:Bouvet Island|BR:Brazil|IO:British Indian Ocean Territory|BN:Brunei|BG:Bulgaria|BF:Burkina Faso|BI:Burundi|" +
  "CV:Cabo Verde|KH:Cambodia|CM:Cameroon|CA:Canada|KY:Cayman Islands|CF:Central African Republic|TD:Chad|CL:Chile|CN:China|CX:Christmas Island|CC:Cocos (Keeling) Islands|CO:Colombia|KM:Comoros|CG:Congo|CD:Congo (DRC)|CK:Cook Islands|CR:Costa Rica|CI:Côte d’Ivoire|HR:Croatia|CU:Cuba|CW:Curaçao|CY:Cyprus|CZ:Czechia|" +
  "DK:Denmark|DJ:Djibouti|DM:Dominica|DO:Dominican Republic|EC:Ecuador|EG:Egypt|SV:El Salvador|GQ:Equatorial Guinea|ER:Eritrea|EE:Estonia|SZ:Eswatini|ET:Ethiopia|" +
  "FK:Falkland Islands|FO:Faroe Islands|FJ:Fiji|FI:Finland|FR:France|GF:French Guiana|PF:French Polynesia|TF:French Southern Territories|" +
  "GA:Gabon|GM:Gambia|GE:Georgia|DE:Germany|GH:Ghana|GI:Gibraltar|GR:Greece|GL:Greenland|GD:Grenada|GP:Guadeloupe|GU:Guam|GT:Guatemala|GG:Guernsey|GN:Guinea|GW:Guinea-Bissau|GY:Guyana|" +
  "HT:Haiti|HM:Heard and McDonald Islands|HN:Honduras|HK:Hong Kong|HU:Hungary|IS:Iceland|IN:India|ID:Indonesia|IR:Iran|IQ:Iraq|IE:Ireland|IM:Isle of Man|IL:Israel|IT:Italy|" +
  "JM:Jamaica|JP:Japan|JE:Jersey|JO:Jordan|KZ:Kazakhstan|KE:Kenya|KI:Kiribati|KW:Kuwait|KG:Kyrgyzstan|LA:Laos|LV:Latvia|LB:Lebanon|LS:Lesotho|LR:Liberia|LY:Libya|LI:Liechtenstein|LT:Lithuania|LU:Luxembourg|" +
  "MO:Macao|MG:Madagascar|MW:Malawi|MY:Malaysia|MV:Maldives|ML:Mali|MT:Malta|MH:Marshall Islands|MQ:Martinique|MR:Mauritania|MU:Mauritius|YT:Mayotte|MX:Mexico|FM:Micronesia|MD:Moldova|MC:Monaco|MN:Mongolia|ME:Montenegro|MS:Montserrat|MA:Morocco|MZ:Mozambique|MM:Myanmar|" +
  "NA:Namibia|NR:Nauru|NP:Nepal|NL:Netherlands|NC:New Caledonia|NZ:New Zealand|NI:Nicaragua|NE:Niger|NG:Nigeria|NU:Niue|NF:Norfolk Island|KP:North Korea|MK:North Macedonia|MP:Northern Mariana Islands|NO:Norway|OM:Oman|" +
  "PW:Palau|PS:Palestine|PA:Panama|PG:Papua New Guinea|PY:Paraguay|PE:Peru|PH:Philippines|PN:Pitcairn|PL:Poland|PT:Portugal|PR:Puerto Rico|QA:Qatar|RE:Réunion|RO:Romania|RU:Russia|RW:Rwanda|" +
  "BL:Saint Barthélemy|SH:Saint Helena|KN:Saint Kitts and Nevis|LC:Saint Lucia|MF:Saint Martin|PM:Saint Pierre and Miquelon|VC:Saint Vincent and the Grenadines|WS:Samoa|SM:San Marino|ST:São Tomé and Príncipe|SA:Saudi Arabia|SN:Senegal|RS:Serbia|SC:Seychelles|SL:Sierra Leone|SG:Singapore|SX:Sint Maarten|SK:Slovakia|SI:Slovenia|SB:Solomon Islands|SO:Somalia|ZA:South Africa|GS:South Georgia|KR:South Korea|SS:South Sudan|ES:Spain|LK:Sri Lanka|SD:Sudan|SR:Suriname|SJ:Svalbard and Jan Mayen|SE:Sweden|CH:Switzerland|SY:Syria|" +
  "TW:Taiwan|TJ:Tajikistan|TZ:Tanzania|TH:Thailand|TL:Timor-Leste|TG:Togo|TK:Tokelau|TO:Tonga|TT:Trinidad and Tobago|TN:Tunisia|TR:Türkiye|TM:Turkmenistan|TC:Turks and Caicos Islands|TV:Tuvalu|" +
  "UG:Uganda|UA:Ukraine|AE:United Arab Emirates|UM:United States Minor Outlying Islands|UY:Uruguay|UZ:Uzbekistan|VU:Vanuatu|VA:Vatican City|VE:Venezuela|VN:Vietnam|VG:Virgin Islands (British)|VI:Virgin Islands (US)|WF:Wallis and Futuna|EH:Western Sahara|YE:Yemen|ZM:Zambia|ZW:Zimbabwe";

/** The three countries the shop posts to on a known schedule and price. */
export const SHIP_TO: readonly Country[] = [
  { code: "PK", name: "Pakistan" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
] as const;

const SHIP_TO_CODES: readonly string[] = SHIP_TO.map((c) => c.code);

export const isDirectShip = (code: string): boolean =>
  SHIP_TO_CODES.includes((code || "").toUpperCase());

let cache: Country[] | null = null;

/** Every destination, the three direct-delivery ones first. */
export function countries(): Country[] {
  if (cache) return cache;
  const rest = RAW.split("|")
    .map((pair) => {
      const at = pair.indexOf(":");
      return { code: pair.slice(0, at), name: pair.slice(at + 1) };
    })
    .filter((c) => !SHIP_TO_CODES.includes(c.code));
  cache = [...SHIP_TO, ...rest];
  return cache;
}

/** The two halves of the country select, labelled as the site labels them. */
export function countryGroups(): { direct: Country[]; quoted: Country[] } {
  const all = countries();
  return {
    direct: all.filter((c) => isDirectShip(c.code)),
    quoted: all.filter((c) => !isDirectShip(c.code)),
  };
}

/** ProfileEnhancer.drawCountries's optgroup labels. */
export const GROUP_LABELS = {
  direct: "Delivered on a schedule",
  quoted: "Sent worldwide, delivery quoted",
} as const;

let names: Map<string, string> | null = null;

export function countryName(code: string): string {
  if (!names) names = new Map(countries().map((c) => [c.code, c.name]));
  return names.get(code.toUpperCase()) ?? code.toUpperCase();
}

/* ------------------------------------------------- region.ts, the slice --- */

export type Region = "PK" | "US" | "UK" | "ROW";
export type CurrencyCode = "PKR" | "USD" | "GBP";

/** region.ts's CURRENCY_OF. */
export const CURRENCY_OF: Record<Region, CurrencyCode> = {
  PK: "PKR",
  US: "USD",
  UK: "GBP",
  ROW: "USD",
};

/** region.ts's CURRENCY_LABEL. */
export const CURRENCY_LABEL: Record<CurrencyCode, string> = {
  PKR: "Pakistani rupees",
  USD: "US dollars",
  GBP: "pounds sterling",
};

/** region.ts's regionFromCountry. GB is the ISO code, UK the informal one. */
export function regionFromCountry(country: string | null | undefined): Region {
  const cc = (country ?? "").trim().toUpperCase();
  if (cc === "PK") return "PK";
  if (cc === "US") return "US";
  if (cc === "GB" || cc === "UK") return "UK";
  return "ROW";
}

/**
 * ProfileEnhancer.paintDelivery — what `[data-rr-pf-ink="delivery"]` says
 * once a country is chosen. The direct sentence carries a bold run (the
 * currency), so it comes back in parts for the caller to voice.
 */
export function deliveryNote(country: string): { before: string; bold?: string; after?: string } | null {
  if (!country) return null;
  const money = CURRENCY_LABEL[CURRENCY_OF[regionFromCountry(country)]];
  const name = countryName(country);
  return isDirectShip(country)
    ? {
        before: `Posted on a schedule to ${name}, and quoted in `,
        bold: money,
        after: ". The country decides the currency, so there is nothing else to choose.",
      }
    : {
        before: `We post to ${name}, but the time and the postage there vary enough that quoting them would be a guess. Orders to this country go through the written flow instead, with a date and a price agreed before anything is charged.`,
      };
}
