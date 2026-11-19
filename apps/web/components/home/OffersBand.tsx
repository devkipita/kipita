import { fetchLivePromotionsServer } from "@/lib/promotions.server";
import { OffersBandUI } from "./OffersBandUI";

export async function OffersBand() {
  const offers = await fetchLivePromotionsServer();
  if (offers.length === 0) return null;
  return <OffersBandUI offers={offers} />;
}
