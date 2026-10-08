import { RouteSkeleton } from "@/components/ui/RouteSkeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="Where are you driving?"
      lead="Publish your trip in a few steps."
      sections={[{ cards: 1, cardHeight: "420px" }]}
    />
  );
}
