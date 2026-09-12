// /account/orders — the ledger, kept simple.
//
// A transcription of app/data/accountOrdersPage.ts's `bodyHtml`, in its
// order: the room head inside `.rr-pt-wrap`, the ledger sheet (`.rr-od-zone`
// › `.rr-od-leaf`, src/portal/orders/Ledger.tsx), then — outside the wrap,
// edge to edge — the "Want another book?" band (src/portal/orders/Band.tsx).
// The frame, bar and tab bar are the kit's.
//
// Copy is the builder's own, verbatim: the catalogue is pre-printed and in
// stock, so an order is Packed / Shipped / Delivered — the same day out, at
// your door in one to two days, tracked. Nothing here is printed to order.

import { Head, PortalPage, Wrap } from "../../src/portal/PortalPage";
import { Band } from "../../src/portal/orders/Band";
import { Ledger } from "../../src/portal/orders/Ledger";

export default function Orders() {
  return (
    <PortalPage title="Orders" back="/">
      <Wrap>
        {/* .rr-pt-head — the kicker is display:none in the app shell */}
        <Head
          title="Orders."
          sub="Every order you have placed, and where each one has got to. Books are already printed, so an order goes out the same day and reaches you in 1 to 2 days. If a parcel is going to be late, we tell you before you have to ask."
        />
        <Ledger />
      </Wrap>
      <Band />
    </PortalPage>
  );
}
