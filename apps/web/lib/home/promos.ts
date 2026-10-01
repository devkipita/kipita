import { Clock, ShieldCheck, Users } from "@/components/icons";
import type { KipitaIcon as LucideIcon } from "@/components/icons";
import type { ToneName } from "@/lib/theme";

export interface Promo {
  id: string;
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
  href: string;
  icon: LucideIcon;
  tone: ToneName;
}

export const PROMOS: readonly Promo[] = [
  {
    id: "invite",
    eyebrow: "Bring a friend",
    headline: "Two seats, half the worry",
    body: "Invite someone who travels your route and you both ride easier.",
    cta: "Invite a friend",
    href: "/referrals",
    icon: Users,
    tone: "lime",
  },
  {
    id: "offpeak",
    eyebrow: "Off-peak",
    headline: "Mid-morning is cheaper",
    body: "Leave between 10am and 3pm and you'll find the calmest fares.",
    cta: "See off-peak rides",
    href: "/home",
    icon: Clock,
    tone: "peach",
  },
  {
    id: "safety",
    eyebrow: "Verified drivers",
    headline: "Know who you're riding with",
    body: "Every driver's ID and plate is checked before their first trip.",
    cta: "How we verify",
    href: "/help#faq",
    icon: ShieldCheck,
    tone: "lilac",
  },
];
