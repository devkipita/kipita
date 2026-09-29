import { fetchDestinations } from "@/lib/places/destinations";
import { DestinationsBand } from "./DestinationsBand";

/**
 * Server half of the trip-ideas band. It reads the traveller's history to pick
 * suggestions and then hits two upstreams for photos and weather, so it is
 * streamed in a Suspense boundary rather than held in front of the page.
 */
export async function DestinationsSlot({ userId }: { userId: string }) {
  const items = await fetchDestinations(userId, 10);
  return <DestinationsBand items={items} />;
}
