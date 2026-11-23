import { Clock, HandCoins, Question, ShieldWarning } from "@/components/icons";
import type { KipitaIcon } from "@/components/icons";
import type { ChipTone } from "@/components/ui/Chip";

export const TRIP_FAQS: { q: string; a: string }[] = [
  {
    q: "When is the driver actually paid?",
    a: "Not at booking. Your fare sits in escrow and is released once the trip is marked complete, minus the Kipita fee. If the ride never happens, the money comes back to you.",
  },
  {
    q: "What if I need to cancel?",
    a: "Cancel from the trip itself. If you have not paid yet, nothing is charged. If you have paid, you can cancel free until shortly before the ride, and for a short while after paying. After that you get part of the seat price back and the driver keeps the rest, and the service fee is not refunded. If you do not turn up, nothing is refunded. If the driver cancels, you always get everything back. The exact amounts are shown before you pay and again when you cancel.",
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

export type HelpViewer = "rider" | "driver";

export const HELP_TOPICS: {
  key: string;
  subject: string;
  category: string;
  hint: string;
  icon: KipitaIcon;
  tone: ChipTone;
  viewers: HelpViewer[];
}[] = [
  {
    key: "no_show",
    subject: "The driver did not arrive",
    category: "no_show",
    hint: "We will hold the fare while we look into it.",
    icon: Clock,
    tone: "neutral",
    viewers: ["rider"],
  },
  {
    key: "rider_no_show",
    subject: "The passenger did not turn up",
    category: "no_show",
    hint: "Tell us where you waited and for how long.",
    icon: Clock,
    tone: "neutral",
    viewers: ["driver"],
  },
  {
    key: "refund",
    subject: "I need a refund",
    category: "refund",
    hint: "Tell us which trip and what went wrong.",
    icon: HandCoins,
    tone: "neutral",
    viewers: ["rider"],
  },
  {
    key: "safety",
    subject: "Something felt unsafe",
    category: "safety",
    hint: "Reported privately and reviewed first.",
    icon: ShieldWarning,
    tone: "error",
    viewers: ["rider", "driver"],
  },
  {
    key: "other",
    subject: "Something else",
    category: "general",
    hint: "Anything the answers above do not cover.",
    icon: Question,
    tone: "neutral",
    viewers: ["rider", "driver"],
  },
];
