import { RouteSkeleton } from "@/components/ui/RouteSkeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="Notifications"
      sections={[{ cards: 5, cardHeight: "80px" }]}
    />
  );
}
