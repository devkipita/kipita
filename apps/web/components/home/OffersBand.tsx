import { fetchLivePromotionsServer } from "@/lib/promotions.server";
import { OffersBandUI } from "./OffersBandUI";

/**
 * Band 3 — server component, so that when there are no live offers the band
 * doesn't exist at all rather than mounting and collapsing.
 *
 * `HomeView` is a client component and cannot import this; `app/home/page.tsx`
 * renders it and passes the element down as a prop.
 */
export async function OffersBand() {
  const offers = await fetchLivePromotionsServer();
  if (offers.length === 0) return null;
  return <OffersBandUI offers={offers} />;
}
