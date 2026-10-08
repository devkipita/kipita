import { RouteSkeleton } from "@/components/ui/RouteSkeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="Referrals"
      lead="Invite friends and earn on their first ride."
      sections={[{ heading: "Your invites", cards: 3, cardHeight: "88px" }]}
    />
  );
}
