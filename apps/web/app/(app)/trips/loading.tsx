import { RouteSkeleton } from "@/components/ui/RouteSkeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="Trips"
      sections={[
        { heading: "Upcoming", cards: 2, cardHeight: "148px" },
        { heading: "Past trips", cards: 2, cardHeight: "132px" },
      ]}
    />
  );
}
