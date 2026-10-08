import { RouteSkeleton } from "@/components/ui/RouteSkeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="Profile"
      sections={[{ cards: 3, cardHeight: "104px" }]}
    />
  );
}
