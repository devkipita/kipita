import { Clock, HandCoins, Question, ShieldWarning } from "@/components/icons";
import type { KipitaIcon } from "@/components/icons";
import type { ChipTone } from "@/components/ui/Chip";

export const TRIP_FAQS: { q: string; a: string }[] = [
  {
    q: "When is the driver actually paid?",
    a: "After the trip ends, minus the Kipita fee. If the ride doesn't happen, you're refunded.",
  },
  {
    q: "What if I need to cancel?",
    a: "Cancel from the trip. Unpaid: nothing is charged. Paid: free until shortly before the ride, then part of the seat price comes back. If the driver cancels, you get everything back. Amounts show before you confirm.",
  },
  {
    q: "The driver never arrived. What now?",
    a: "Open a case from the trip. The fare stays on hold while a case is open.",
  },
  {
    q: "Can I change how many seats I booked?",
    a: "Seats can't change after payment. Cancel and rebook.",
  },
  {
    q: "How do I get a receipt?",
    a: "Open a past trip to see its reference and amount.",
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
    hint: "Fare held while we review.",
    icon: Clock,
    tone: "neutral",
    viewers: ["rider"],
  },
  {
    key: "rider_no_show",
    subject: "The passenger did not turn up",
    category: "no_show",
    hint: "Where and how long you waited.",
    icon: Clock,
    tone: "neutral",
    viewers: ["driver"],
  },
  {
    key: "refund",
    subject: "I need a refund",
    category: "refund",
    hint: "Which trip and what went wrong.",
    icon: HandCoins,
    tone: "neutral",
    viewers: ["rider"],
  },
  {
    key: "safety",
    subject: "Something felt unsafe",
    category: "safety",
    hint: "Private. Reviewed first.",
    icon: ShieldWarning,
    tone: "error",
    viewers: ["rider", "driver"],
  },
  {
    key: "other",
    subject: "Something else",
    category: "general",
    hint: "Anything else.",
    icon: Question,
    tone: "neutral",
    viewers: ["rider", "driver"],
  },
];
