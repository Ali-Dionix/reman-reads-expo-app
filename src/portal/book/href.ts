// Where a book's page is, named once.
//
// The site's book page is /books/<slug>; the app's is a screen on the
// Library room's own stack — app/(tabs)/library/[slug].tsx — so the tab bar
// stays, Library stays lit, and back returns to the shelf the reader was
// on. Every surface that opens a book (the floor, the grid, the related
// shelf on a page) goes through this, so the route can move without a
// search.
//
// Kept apart from data.ts on purpose: that module pulls the page slice
// (~180KB) in with it, and the rooms that merely LINK to a book must not
// pay for it at boot.

/** The expo-router href of a book's page. */
export const bookHref = (slug: string): string => `/library/${encodeURIComponent(slug)}`;
