import { RouteSkeleton } from "@/components/ui/RouteSkeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="Wallet"
      sections={[{ heading: "Activity", cards: 4, cardHeight: "72px" }]}
    />
  );
}
