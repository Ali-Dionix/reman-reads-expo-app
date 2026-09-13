// /profile — `/account/profile`: who you are, what you have heard, and how to
// reach us. A transcription of app/data/accountProfilePage.ts.
//
// THE SETTINGS LEFT. Everything below the identity block lives at
// /profile/settings, reached by the cog in the identity block, which is where
// an app puts settings and where a reader looks for them. What is on this
// screen, in the order a reader uses it:
//
//   1  the identity block   the mark, the name, the plan — and the cog.
//   2  the slab             the one filled surface: the subscription being built.
//   3  statistics           what you have actually heard, drawn as a tally.
//   4  support              three ways to reach a person, as discs.
//   5  questions            the three answers most often wanted, as rows.
//
// AND NOTHING ELSE. The heading is the card name (fillReaderName: the session's
// name, or "Reader"); a guest pass reads "Guest reader" and draws the guest
// note under the block, whose one link drops the pass and lands on the
// sign-in wall — the site's `/login`.
//
// The statistics are computed from the listening ledger (src/portal/profile/
// ledger.ts), never invented; Phase 2 fills the ledger from the reader's own
// rows and until then it is empty, which draws the honest empty state.
//

import { useSession } from "../../../src/lib/session";
import { PortalPage, Wrap } from "../../../src/portal/PortalPage";
import { EMPTY_LEDGER } from "../../../src/portal/profile/ledger";
import { Identity, Questions, Slab, Stats, Support } from "../../../src/portal/profile/parts";

export default function Profile() {
  const { user } = useSession();

  // portalClient.fillReaderName: the session's name, trimmed, or "Reader".
  const name = (user?.name ?? "").trim() || "Reader";

  return (
    <PortalPage title="Profile">
      <Wrap>
        <Identity name={name} />
        <Slab />
        <Stats listening={EMPTY_LEDGER} />
        <Support />
        <Questions />
      </Wrap>
    </PortalPage>
  );
}
