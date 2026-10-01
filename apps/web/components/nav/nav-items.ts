import { Bell, CardStack, CompassRose, Gift, Grid, House, QuestionCircle as LifeBuoy, Scroll as ScrollText, UserCircle as UserRound, Wallet } from "@/components/icons";
import type { KipitaIcon as LucideIcon } from "@/components/icons";
import type { AppMode } from "@/lib/home/mode";

export type NavItem = {
  key: string;
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
  badge?: "notifications" | "alerts" | "trips";
  owns?: string[];
};

export function isNavItemCurrent(item: NavItem, pathname: string): boolean {
  return pathname === item.href;
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href) return true;
  return (item.owns ?? []).some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const PRIMARY_NAV: Record<AppMode, NavItem[]> = {
  passenger: [
    { key: "home", href: "/home", label: "Discover", shortLabel: "Discover", icon: CompassRose },
    {
      key: "trips",
      href: "/trips",
      label: "My trips",
      shortLabel: "Trips",
      icon: CardStack,
      requiresAuth: true,
      badge: "trips",
      owns: ["/trips", "/ride"],
    },
    {
      key: "alerts",
      href: "/alerts",
      label: "Road alerts",
      shortLabel: "Alerts",
      icon: Grid,
      badge: "alerts",
      owns: ["/alerts"],
    },
    {
      key: "notifications",
      href: "/notifications",
      label: "Notifications",
      shortLabel: "Inbox",
      icon: Bell,
      requiresAuth: true,
      badge: "notifications",
    },
    {
      key: "profile",
      href: "/profile",
      label: "Profile",
      shortLabel: "You",
      icon: UserRound,
      requiresAuth: true,
      owns: ["/profile"],
    },
  ],
  driver: [
    { key: "home", href: "/home", label: "Discover", shortLabel: "Discover", icon: CompassRose },
    {
      key: "trips",
      href: "/trips",
      label: "My rides",
      shortLabel: "Rides",
      icon: CardStack,
      requiresAuth: true,
      badge: "trips",
      owns: ["/trips", "/ride"],
    },
    {
      key: "alerts",
      href: "/alerts",
      label: "Road alerts",
      shortLabel: "Alerts",
      icon: Grid,
      badge: "alerts",
      owns: ["/alerts"],
    },
    {
      key: "notifications",
      href: "/notifications",
      label: "Requests",
      shortLabel: "Inbox",
      icon: Bell,
      requiresAuth: true,
      badge: "notifications",
    },
    {
      key: "profile",
      href: "/profile",
      label: "Profile",
      shortLabel: "You",
      icon: UserRound,
      requiresAuth: true,
      owns: ["/profile"],
    },
  ],
};

export const SIGNED_OUT_NAV: NavItem[] = [
  { key: "landing", href: "/", label: "Kipita", shortLabel: "Home", icon: House },
  {
    key: "alerts",
    href: "/alerts",
    label: "Road alerts",
    shortLabel: "Alerts",
    icon: Grid,
    owns: ["/alerts"],
  },
  { key: "help", href: "/help", label: "Help", shortLabel: "Help", icon: LifeBuoy },
];

export const SECONDARY_NAV: NavItem[] = [
  {
    key: "wallet",
    href: "/wallet",
    label: "Wallet",
    shortLabel: "Wallet",
    icon: Wallet,
    requiresAuth: true,
    owns: ["/wallet"],
  },
  {
    key: "referrals",
    href: "/referrals",
    label: "Invite friends",
    shortLabel: "Invite",
    icon: Gift,
    requiresAuth: true,
    owns: ["/referrals"],
  },
  { key: "help", href: "/help", label: "Help & FAQ", shortLabel: "Help", icon: LifeBuoy },
  { key: "legal", href: "/legal/privacy", label: "Legal", shortLabel: "Legal", icon: ScrollText },
];

export function primaryNavFor(mode: AppMode, signedIn: boolean): NavItem[] {
  if (!signedIn) return SIGNED_OUT_NAV;
  return PRIMARY_NAV[mode];
}

