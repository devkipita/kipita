import { RouteSkeleton } from "@/components/ui/RouteSkeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="Edit profile"
      sections={[{ cards: 1, cardHeight: "360px" }]}
    />
  );
}
