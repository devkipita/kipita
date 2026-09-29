import { HandCoins, Lifebuoy, ShieldCheck, TrafficCone } from "@/components/icons";
import type { KipitaIcon } from "@/components/icons";

export const TRIP_FAQS: { q: string; a: string }[] = [
  {
    q: "When is the driver actually paid?",
    a: "Not at booking. Your fare sits in escrow and is released once the trip is marked complete, minus the Kipita fee. If the ride never happens, the money comes back to you.",
  },
  {
    q: "What if I need to cancel?",
    a: "Cancel from the trip itself. A seat cancelled well before departure is refunded in full; closer to departure the driver keeps a share, because they have already turned away other passengers.",
  },
  {
    q: "The driver never arrived. What now?",
    a: "Open a case from that trip below. Nothing is released to the driver while a case is open, so start one before the trip is marked complete if you can.",
  },
  {
    q: "Can I change how many seats I booked?",
    a: "Seats are fixed once a booking is paid. Cancel and rebook if your group size changes, while seats are still available.",
  },
  {
    q: "How do I get a receipt?",
    a: "Every completed trip keeps its booking reference and the amount paid. Open a past trip to see both.",
  },
];

export const HELP_TOPICS: {
  key: string;
  subject: string;
  category: string;
  hint: string;
  icon: KipitaIcon;
}[] = [
  {
    key: "no_show",
    subject: "The driver did not arrive",
    category: "no_show",
    hint: "We will hold the fare while we look into it.",
    icon: TrafficCone,
  },
  {
    key: "refund",
    subject: "I need a refund",
    category: "refund",
    hint: "Tell us which trip and what went wrong.",
    icon: HandCoins,
  },
  {
    key: "safety",
    subject: "Something felt unsafe",
    category: "safety",
    hint: "Reported privately and reviewed first.",
    icon: ShieldCheck,
  },
  {
    key: "other",
    subject: "Something else",
    category: "general",
    hint: "Anything the answers above do not cover.",
    icon: Lifebuoy,
  },
];
