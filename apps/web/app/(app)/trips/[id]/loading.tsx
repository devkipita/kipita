import { RouteSkeleton } from "@/components/ui/RouteSkeleton";

export default function Loading() {
  return (
    <RouteSkeleton title="Trip" sections={[{ cards: 2, cardHeight: "180px" }]} />
  );
}
