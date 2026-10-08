import { RouteSkeleton } from "@/components/ui/RouteSkeleton";

export default function Loading() {
  return (
    <RouteSkeleton title="Ride" sections={[{ cards: 2, cardHeight: "200px" }]} />
  );
}
