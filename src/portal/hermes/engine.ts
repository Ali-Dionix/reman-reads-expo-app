// The Ask AI page's brain, and its memory — app/components/hermesEngine.ts
// and the two fields of portalClient.ts's state it keeps, on a phone.
//
// askHermes() first tries POST /api/hermes on the SITE (the real Claude
// wire, live the moment ANTHROPIC_API_KEY is in the site's env). On a
// non-ok answer, any failure, or a 20s timeout it falls back to
// localAnswer(): the site's own intent engine, ported branch for branch —
// orders, the shelf, a recommendation off the shelf, the spoiler-gated
// companion, a book by name, the house, the pleasantries and the three
// honest fallbacks, all in the site's words. Same question, same state, same
// answer on either surface.
//
// THE LEDGER IS PASSED IN, never imported: the site's engine carries a note
// that it once read PORTAL_ORDERS, the specimen data, and told an account
// that had never ordered anything that it had three orders. AskContext takes
// the reader's own rows (src/portal/hermes/reader.ts) for the same reason.
//
// THE MEMORY is portalClient.ts's `rr-account-state`, the same key and the
// same two fields (`hermesLog`, `companion`) so a reader who signs in to the
// web later finds the shape they left here — plus an `owner` stamp, which
// portalClient keeps in a key of its own (see readStored). Phase 4 seam:
// when the portal's state moves to the server, `readLog`/`writeLog` are the
// two calls to repoint.

import { SITE_ORIGIN } from "../../lib/config";
import { readState, writeState, type Owner } from "../../lib/portalState";
import hermes from "../../data/hermes.json";
import type { Order } from "../orders/data";

/* ------------------------------------------------------------- types --- */

export type HermesRole = "reader" | "hermes";
export type HermesTurn = { role: HermesRole; text: string; at: number };
export type HermesAnswer = { text: string; source: "api" | "local" };

export type Companion = (typeof hermes.companions)[number];
type Recommendation = (typeof hermes.recommendations)[number];
/** The eight fields matchBook() reads. Typed, not inferred: TypeScript widens
 *  the generated array into a union of every literal shape, and `search`
 *  (titleSearch on the site) is absent from most rows. */
type BookRef = { slug: string; title: string; author: string; year: string; category: string; search?: string };
const BOOKS = hermes.books as BookRef[];

/** HermesAskOptions on the site — the reader's own state, passed in. */
export type AskContext = {
  name: string;
  /** Book slugs the reader saved. */
  shelf: string[];
  /** Book slugs the reader is following. */
  waitlist: string[];
  /** The reader's OWN orders. [] for a guest. */
  orders: Order[];
  companion: { slug: string; unit: number } | null;
  /** The last ~8 turns, oldest first, the question NOT included. */
  history: HermesTurn[];
};

/* ------------------------------------------------------------ memory --- */

/** RENDERED_CAP on the web: the thread keeps its last forty turns. */
export const LOG_CAP = 40;

/**
 * Whose memory this is — src/lib/portalState.ts's owner stamp: a guest is
 * "guest", as on the site; a real reader is their id. Reader A's conversation
 * and bookmarks never surface for reader B on the same phone, and a guest's
 * go when a real account signs in.
 */
export type { Owner } from "../../lib/portalState";
export { ownerOf } from "../../lib/portalState";

type Stored = { hermesLog?: HermesTurn[]; companion?: Record<string, number> };

const readStored = (owner: Owner): Promise<Stored> => readState(owner) as Promise<Stored>;
const writeStored = (owner: Owner, patch: Partial<Stored>): Promise<unknown> => writeState(owner, patch);

export async function readLog(owner: Owner): Promise<HermesTurn[]> {
  const s = await readStored(owner);
  return Array.isArray(s.hermesLog) ? s.hermesLog.slice(-LOG_CAP) : [];
}

export async function writeLog(owner: Owner, log: HermesTurn[]): Promise<void> {
  await writeStored(owner, { hermesLog: log.slice(-LOG_CAP) });
}

export async function readBookmarks(owner: Owner): Promise<Record<string, number>> {
  const s = await readStored(owner);
  return s.companion && typeof s.companion === "object" ? s.companion : {};
}

export async function writeBookmark(owner: Owner, slug: string, unit: number): Promise<void> {
  const cur = await readBookmarks(owner);
  await writeStored(owner, { companion: { ...cur, [slug]: unit } });
}

/* ----------------------------------------------------------- helpers --- */

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasWord = (q: string, phrase: string) => new RegExp(`\\b${escapeRe(phrase)}\\b`).test(q);

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const countWord = (n: number) => COUNT_WORDS[n] ?? String(n);
const ucFirst = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
const lcFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/** The site's BOOK_REFS: longest title first, so "the idiot" beats "idiot". */
const BOOK_REFS = BOOKS
  .map((b) => {
    const titleNorm = normalize(b.search ?? b.title);
    const alias = titleNorm.startsWith("the ") ? titleNorm.slice(4) : null;
    return { ...b, titleNorm, alias: alias && alias.length >= 5 ? alias : null };
  })
  .sort((a, b) => b.titleNorm.length - a.titleNorm.length);

const TITLE_BY_SLUG = new Map(BOOKS.map((b) => [b.slug, b.title]));

const titleOf = (slug: string) =>
  TITLE_BY_SLUG.get(slug) ?? companionFor(slug)?.title ?? slug.replace(/-/g, " ");

/* --------------------------------------------------------- companion --- */

export const companionFor = (slug: string): Companion | undefined =>
  hermes.companions.find((b) => b.slug === slug);

/* ---------------------------------------------------- recommendations --- */

// readerIntel.ts's HOUSE_ORDER: what we'd hand a stranger at the door.
const HOUSE_ORDER = [
  "crime-and-punishment",
  "meditations",
  "white-nights",
  "the-little-prince",
  "1984",
  "atomic-habits",
  "sapiens",
  "the-trial",
  "the-idiot",
  "the-stranger",
  "deep-work",
  "demons",
  "the-gambler",
  "humiliated-and-insulted",
  "the-double",
  "a-brief-history-of-time",
];
const HOUSE_RANK = new Map(HOUSE_ORDER.map((slug, i) => [slug, i]));
const rankOf = (r: Recommendation) => HOUSE_RANK.get(r.slug) ?? HOUSE_ORDER.length;

/** readerIntel.ts's recommendFor: never a slug already owned, most trigger
 *  overlap first, ties on the house order, topped up with house picks. */
export function recommendFor(owned: string[], count = 3): Recommendation[] {
  const shelf = new Set(owned);
  const open = hermes.recommendations.filter((r) => !shelf.has(r.slug));
  const triggered = open
    .map((r) => ({ r, hits: r.triggers.reduce((n, t) => n + (shelf.has(t) ? 1 : 0), 0) }))
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits || rankOf(a.r) - rankOf(b.r))
    .map((s) => s.r);
  const picks = triggered.slice(0, count);
  if (picks.length < count) {
    const chosen = new Set(picks.map((p) => p.slug));
    const house = [...open].sort((a, b) => rankOf(a) - rankOf(b));
    for (const r of house) {
      if (picks.length >= count) break;
      if (!chosen.has(r.slug)) {
        picks.push(r);
        chosen.add(r.slug);
      }
    }
  }
  return picks;
}

/* --------------------------------------------------------- askHermes --- */

const orderTitles = (o: Order) => o.items.map((i) => i.title).join(" + ");

/** ordersDigest on the site: one line per order for the wire context. */
function ordersDigest(orders: Order[]): string[] {
  return orders.map((o) => {
    const bits = [`${o.id}, ${orderTitles(o)}`, ...o.items.map((i) => i.detail), `placed ${o.placed}`, o.amount, o.statusLine];
    if (o.tracking) bits.push(`tracking ${o.tracking}`);
    return bits.join(" · ");
  });
}

export async function askHermes(question: string, ctx: AskContext): Promise<HermesAnswer> {
  const book = ctx.companion ? companionFor(ctx.companion.slug) : undefined;
  const context = {
    name: ctx.name,
    shelf: ctx.shelf.map(titleOf),
    waitlist: ctx.waitlist.map(titleOf),
    orders: ordersDigest(ctx.orders),
    companion:
      book && ctx.companion
        ? { title: book.title, unitLabel: book.unitLabel, unit: clamp(ctx.companion.unit, 1, book.units), units: book.units }
        : null,
  };
  // AbortSignal.timeout is not in every Hermes build; a controller and a timer are.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 20_000);
  try {
    const res = await fetch(`${SITE_ORIGIN}/api/hermes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        history: ctx.history.slice(-8).map((t) => ({ role: t.role, text: t.text })),
        context,
      }),
      signal: abort.signal,
    });
    if (res.ok) {
      const data = (await res.json()) as { text?: unknown };
      if (typeof data.text === "string" && data.text.trim()) {
        return { text: data.text.trim(), source: "api" };
      }
    }
  } catch {
    // no key, no network, or no patience — the ledger answers
  } finally {
    clearTimeout(timer);
  }
  return { text: localAnswer(question, ctx), source: "local" };
}

/* ------------------------------------------------------ local engine --- */

// Handwritten one-line pitches for the books worth having an opinion about.
const PITCHES: Record<string, string> = {
  "crime-and-punishment":
    "A student, a theory, one axe, and six parts of consequences. The crime takes a chapter; the punishment takes the book.",
  meditations: "A Roman emperor’s private notebook, never meant for you, which is exactly why it works.",
  "the-brothers-karamazov":
    "Three brothers, one unbearable father, and the question of what’s permitted. His last word on everything.",
  "1984": "The surveillance state with a filing system. Mind the appendix’s tense when you get there.",
  "notes-from-underground": "Forty pages of a man arguing with a wall, then the week that proves his point.",
  "white-nights": "Four nights on a Petersburg embankment and one morning after. The gentle Dostoevsky.",
  "the-little-prince":
    "A downed pilot, a visiting prince, one rose worth the trouble. Reads in an evening, stays for decades.",
  "the-idiot": "A genuinely good man walks into Petersburg. That’s the whole tragedy, set up like a joke.",
  "the-trial": "Arrested on page one, charged never. The paperwork is the villain.",
  "the-stranger": "A man who won’t explain himself, and a court that notices.",
  "atomic-habits": "One percent a day, compounded. The least romantic book we stock; it works.",
  sapiens: "Seventy thousand years in one sitting, gossip included.",
  "deep-work": "The working case for a shut door.",
  "a-brief-history-of-time": "Thirteen billion years, one equation. Hawking cut the rest so you’d stay.",
  "the-gambler": "Dictated in twenty-six days to clear his own roulette debts. The research was primary.",
  demons: "Orwell wrote the state; this is the reading group that builds it.",
  "the-double": "A clerk meets his own exact copy; the copy is better at his job. Kafka took notes.",
};

const FALLBACKS = [
  "I don’t have an answer for that yet. I’m a guide, not an oracle. Orders, your shelf, the editions, what to read next, or any book you name: those I can do.",
  "That one’s outside what I know. Try me on your orders, your shelf, or a recommendation, or open a book with the About-a-book chip and we’ll talk to your bookmark.",
  "I checked twice; I have nothing on that. What I do have: your orders, your shelf, and a decent opinion on what you should read next.",
];

/** orderLine on the site, less the quote branch: an app order is never approvable. */
function orderLine(o: Order): string {
  const t = orderTitles(o);
  if (o.done >= o.steps.length) {
    const track = o.tracking ? ` Tracking number ${o.tracking}.` : "";
    return `${o.id}, ${t}. ${o.statusLine}, signed for at the door.${track}`;
  }
  const now = o.steps[o.done];
  return `${o.id}, ${t}. ${o.statusLine}. ${now?.note ?? ""}`;
}

const shortStatus = (o: Order) => `${o.id}, ${orderTitles(o)}, ${lcFirst(o.statusLine)}.`;

function matchCharacter(q: string, book: Companion) {
  for (const c of book.characters) {
    const tokens = normalize(c.name)
      .split(" ")
      .filter((t) => t.length >= 4 && t !== "little");
    if (tokens.some((t) => hasWord(q, t))) return c;
  }
  return null;
}

function matchBook(q: string): BookRef | null {
  for (const ref of BOOK_REFS) {
    if (hasWord(q, ref.titleNorm)) return ref;
  }
  for (const ref of BOOK_REFS) {
    if (ref.alias && hasWord(q, ref.alias)) return ref;
  }
  return null;
}

export function localAnswer(question: string, ctx: AskContext): string {
  const q = normalize(question);
  const firstName = ucFirst(ctx.name.trim().split(/\s+/)[0] || "reader");

  /* 1 — orders / tracking */
  const idMatch = q.match(/\brr[\s-]?0*(\d{1,4})\b/);
  const ordersIntent =
    /\b(orders?|tracking|track|delivery|delivered|deliver|quote|quoted|approve|approval|approved|ship|shipped|shipping|parcel|package|bindery)\b/.test(
      q,
    );
  if (idMatch || ordersIntent) {
    if (idMatch) {
      const id = `RR-${idMatch[1].padStart(4, "0")}`;
      const o = ctx.orders.find((x) => x.id === id);
      return o
        ? orderLine(o)
        : `I have no order ${id}.${ctx.orders.length ? " Ask about your orders and I’ll read out the ones you have." : " You have not ordered anything yet."}`;
    }
    if (/\b(track|tracking)\b/.test(q)) {
      const tracked = ctx.orders.find((o) => o.tracking);
      const bench = ctx.orders.find((o) => !o.tracking && o.done < o.steps.length);
      const first = tracked
        ? `One parcel carries a number: ${tracked.id}, ${orderTitles(tracked)}, ${tracked.tracking}, ${lcFirst(tracked.statusLine)}.`
        : "None of your orders has a tracking number yet.";
      const second = bench
        ? `${orderTitles(bench)} hasn’t shipped, ${lcFirst(bench.statusLine)}; the number appears when the wrapping does.`
        : "";
      return first + second;
    }
    if (!ctx.orders.length) {
      return "You have not ordered anything yet. When you do, I can read the ledger back to you here.";
    }
    const lines = ctx.orders.map(shortStatus);
    return `${ucFirst(countWord(ctx.orders.length))} ${ctx.orders.length === 1 ? "order" : "orders"} on your account. ${lines.join(" ")} The Orders page keeps the full timelines.`;
  }

  /* 2 — shelf / waitlist */
  if (
    /\b(shelf|shelved|bookshelf|waitlist|saved)\b/.test(q) ||
    q.includes("my books") ||
    q.includes("my library") ||
    q.includes("my collection")
  ) {
    const shelfT = ctx.shelf.map(titleOf);
    const waitT = ctx.waitlist.map(titleOf);
    if (!shelfT.length && !waitT.length) {
      return "The shelf stands empty, a clean start or a small tragedy, depending. The Books page fixes either.";
    }
    const shelfPart = shelfT.length
      ? `${ucFirst(countWord(shelfT.length))} on the shelf, ${shelfT.join(", ")}.`
      : "The shelf itself stands empty.";
    const waitPart = waitT.length ? ` ${ucFirst(countWord(waitT.length))} more on the waitlist: ${waitT.join(", ")}.` : "";
    return `${shelfPart}${waitPart} All present and accounted for.`;
  }

  /* 3 — recommendations */
  if (
    /\b(recommend|recommendation|recommendations|suggest|suggestion|suggestions)\b/.test(q) ||
    q.includes("what next") ||
    q.includes("read next") ||
    q.includes("what should i read") ||
    q.includes("something new") ||
    q.includes("something to read") ||
    q.includes("something good")
  ) {
    const recs = recommendFor([...ctx.shelf, ...ctx.waitlist], 2);
    if (!recs.length) {
      return "You’ve outrun my list, a rare state of affairs. Browse the books while I restock my opinions.";
    }
    const [a, b] = recs;
    const second = b ? ` And a second: ${b.title}, ${b.author}. ${b.why}` : "";
    return `Two picks for you. ${a.title}, ${a.author}. ${a.why}${second}`;
  }

  /* 4 — companion mode: spoiler-gated talk about THE open book */
  if (ctx.companion) {
    const book = companionFor(ctx.companion.slug);
    if (book) {
      const unit = clamp(ctx.companion.unit, 1, book.units);
      const spoiler = book.spoilerLine;
      // fishing for the ending comes first — even when it names a character
      if (
        /\b(ending|dies|die|died|killed|killer|murderer|twist|finale|spoiler|spoil)\b/.test(q) ||
        q.includes("how does it end") ||
        q.includes("the end") ||
        q.includes("last page") ||
        q.includes("last chapter")
      ) {
        return spoiler;
      }
      const unitAsk = q.match(new RegExp(`\\b${escapeRe(book.unitLabel)}\\s+(\\d{1,3})\\b`));
      if (unitAsk && Number(unitAsk[1]) > unit) return spoiler;
      const c = matchCharacter(q, book);
      if (c) return c.from <= unit ? `${c.name}, ${c.note}` : spoiler;
      if (
        /\b(recap|summary|summarise|summarize)\b/.test(q) ||
        q.includes("so far") ||
        q.includes("what happened") ||
        q.includes("what has happened") ||
        q.includes("where was i") ||
        q.includes("where am i") ||
        q.includes("catch me up") ||
        q.includes("remind me")
      ) {
        const beats = book.beats.filter((bt) => bt.upTo <= unit);
        if (!beats.length) {
          return `Your bookmark sits at ${book.unitLabel} ${unit}, early pages. Nothing to recap that the book doesn’t do better itself. Read a little; I’ll keep score.`;
        }
        return beats
          .slice(-2)
          .map((bt) => bt.note)
          .join(" ");
      }
      if (/\b(themes?|meaning|ideas)\b/.test(q) || q.includes("what is it about") || q.includes("about the book")) {
        const t = book.themes.slice(0, 2);
        return `Two of its standing questions. ${t[0]} And: ${t[1]}`;
      }
      return `We’re inside ${book.title}, bookmark at ${book.unitLabel} ${unit} of ${book.units}. Ask for a recap, a character, or the themes. I never answer past your bookmark.`;
    }
  }

  /* 5 — a book named without companion mode: the deadpan pitch */
  const named = matchBook(q);
  if (named) {
    const pitch =
      PITCHES[named.slug] ??
      `On the ${named.category.replace(/-/g, " ")} shelf, printed and in stock, read out loud if you’d rather listen.`;
    const offer = companionFor(named.slug)
      ? "Open it as a reading companion, the About-a-book chip, and I’ll go deeper, spoiler-safe."
      : "";
    return `${named.title}, ${named.author}, ${named.year}. ${pitch}${offer}`;
  }

  /* 6 — the house: editions, listening, the notes, the app, the press */
  // the PDF branch sits ahead of the audio one so "turn this PDF into an
  // audiobook" lands here, and behind a print guard so "print my PDF" doesn't.
  if (/\bpdfs?\b/.test(q) && !/\b(print|printed|printing|bind|binding|bound)\b/.test(q)) {
    return "A PDF you drop in comes back narrated, a paper you have to read, a manuscript, a book you already own. Pick the voice; the subscription covers it ($14.99 a month), and we hold your place.";
  }
  if (
    /\b(language|languages|translation|translations|translate|translated|edition|editions|simplified|abridged)\b/.test(q)
  ) {
    return "Two editions are set and waiting: the Original, and Simplified, same story, shorter sentences, nothing cut. For any other language, ask: we set that translation by hand and print that copy to order. Either one can be read aloud in a voice you pick.";
  }
  if (/\b(audio|audiobook|audiobooks|listen|listening|narrator|narrators|narration|voice|voices|aloud)\b/.test(q)) {
    return "Every book here is read aloud, in whichever narrator’s voice you pick, change it mid-book if the voice wears thin. The read-along lights each line as it’s spoken. It comes with the subscription, $14.99 a month; your Audiobooks page keeps the recordings.";
  }
  // the bench answers before the margin does, so "explain print-on-demand"
  // reaches the press rather than the notes.
  if (
    /\b(print|printed|printing|press|bind|binding|bound|publish|published|manuscript|pod)\b/.test(q) ||
    q.includes("print on demand")
  ) {
    return "Everything in the catalogue is printed and in stock, at your door in one to two days. Name a book we do not stock, or a manuscript of your own, and the press binds it for you. One flat quote first; nothing prints until you say so. /contact takes the name.";
  }
  if (
    /\b(explain|explains|explained|explanation|explanations|gloss|glosses|margin|notes?|footnotes?|ai)\b/.test(q) ||
    q.includes("hard words") ||
    q.includes("what does it mean")
  ) {
    return "The notes sit in the margin: who this character is, why this sentence matters, what just quietly happened. Ask for one line, a chapter, or the whole book and it answers at that size. Try it below, tap a word to see its meaning.";
  }
  if (/\b(app|android|iphone|ios|phone|pocket|camera|download)\b/.test(q)) {
    return "The app carries all of it, camera, read-along, every recording, the whole library. It is coming to iOS and Android; the website does the rest today. /app has the details.";
  }

  /* 7 — pleasantries and the clerk himself */
  if (q.includes("who are you") || q.includes("what can you do") || q.includes("what do you do") || q === "help") {
    return "I am the AI built into Roman Reads. I keep track of your orders, your shelf, what to read next, and any book you open with me, without spoilers. Ask about the editions, a narrator’s voice, or what the margin notes explain, and I’ll answer.";
  }
  if (/^(hi|hello|hey|yo|salaam|salam|assalamualaikum|assalam|good (morning|afternoon|evening))\b/.test(q)) {
    return `Hello, ${firstName}. Orders, your shelf, a recommendation, or a book, the chips below know the way.`;
  }
  if (/\b(thanks|thank you|shukriya|cheers)\b/.test(q)) {
    return "Noted. I’m here whenever you need me.";
  }
  if (/^(ok|okay|cool|great|nice|good|fine)$/.test(q)) {
    return "Very good. I’ll be here, alphabetizing.";
  }

  /* 8 — the honest shrug, rotated deterministically */
  return FALLBACKS[question.length % FALLBACKS.length];
}
