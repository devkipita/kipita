import { EventsView } from "@/components/admin/console/EventsView";

export const metadata = {
  title: "Events",
  robots: { index: false, follow: false },
};

export default function AdminEventsPage() {
  return <EventsView />;
}
