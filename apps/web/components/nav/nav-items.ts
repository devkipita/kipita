import { Bell, Crowd, Document, Gift, House, MagnifyingGlass, Person, Plus, QuestionCircle as LifeBuoy, PlusSquare, SearchSpark, Ticket, Wallet } from "@/components/icons";
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
    { key: "home", href: "/home", label: "Find a ride", shortLabel: "Find", icon: SearchSpark },
    {
      key: "trips",
      href: "/trips",
      label: "My trips",
      shortLabel: "Trips",
      icon: Ticket,
      requiresAuth: true,
      badge: "trips",
      owns: ["/trips", "/ride"],
    },
    {
      key: "alerts",
      href: "/alerts",
      label: "Road alerts",
      shortLabel: "Alerts",
      icon: Crowd,
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
      icon: Person,
      requiresAuth: true,
      owns: ["/profile"],
    },
  ],
  driver: [
    { key: "home", href: "/home", label: "Find a ride", shortLabel: "Find", icon: SearchSpark },
    {
      key: "trips",
      href: "/trips",
      label: "My rides",
      shortLabel: "Rides",
      icon: Ticket,
      requiresAuth: true,
      badge: "trips",
      owns: ["/trips", "/ride"],
    },
    {
      key: "alerts",
      href: "/alerts",
      label: "Road alerts",
      shortLabel: "Alerts",
      icon: Crowd,
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
      icon: Person,
      requiresAuth: true,
      owns: ["/profile"],
    },
  ],
};

export const SIGNED_OUT_NAV: NavItem[] = [
  { key: "home", href: "/home", label: "Find a ride", shortLabel: "Find", icon: SearchSpark },
  {
    key: "publish",
    href: "/publish",
    label: "Publish a ride",
    shortLabel: "Publish",
    icon: PlusSquare,
    owns: ["/publish"],
  },
  {
    key: "alerts",
    href: "/alerts",
    label: "Road alerts",
    shortLabel: "Alerts",
    icon: Crowd,
    owns: ["/alerts"],
  },
  { key: "help", href: "/help", label: "Help", shortLabel: "Help", icon: LifeBuoy },
];

const PUBLISH_ITEM: NavItem = {
  key: "publish",
  href: "/publish",
  label: "Publish a ride",
  shortLabel: "Publish",
  icon: PlusSquare,
  owns: ["/publish"],
};

export function barNavFor(mode: AppMode, signedIn: boolean): NavItem[] {
  const find = signedIn
    ? PRIMARY_NAV[mode][0]
    : SIGNED_OUT_NAV.find((i) => i.key === "home")!;
  const alerts = {
    key: "alerts",
    href: "/alerts",
    label: "Road alerts",
    shortLabel: "Alerts",
    icon: Crowd,
    owns: ["/alerts"],
  } satisfies NavItem;
  return [find, PUBLISH_ITEM, alerts];
}

export const ACCOUNT_NAV: NavItem[] = [
  {
    key: "trips",
    href: "/trips",
    label: "My trips",
    shortLabel: "Trips",
    icon: Ticket,
    requiresAuth: true,
    badge: "trips",
    owns: ["/trips", "/ride"],
  },
  {
    key: "alerts",
    href: "/alerts",
    label: "Road alerts",
    shortLabel: "Alerts",
    icon: Crowd,
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
  {
    key: "profile",
    href: "/profile",
    label: "Profile",
    shortLabel: "You",
    icon: Person,
    requiresAuth: true,
    owns: ["/profile"],
  },
  { key: "help", href: "/help", label: "Help & FAQ", shortLabel: "Help", icon: LifeBuoy },
  { key: "legal", href: "/legal/privacy", label: "Legal", shortLabel: "Legal", icon: Document },
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
  { key: "legal", href: "/legal/privacy", label: "Legal", shortLabel: "Legal", icon: Document },
];

export function primaryNavFor(mode: AppMode, signedIn: boolean): NavItem[] {
  if (!signedIn) return SIGNED_OUT_NAV;
  return PRIMARY_NAV[mode];
}

export function bottomNavFor(): NavItem[] {
  return [
    { key: "landing", href: "/", label: "Home", shortLabel: "Home", icon: House },
    {
      key: "home",
      href: "/home",
      label: "Find a ride",
      shortLabel: "Find",
      icon: SearchSpark,
    },
    { ...PUBLISH_ITEM, shortLabel: "Post" },
    {
      key: "alerts",
      href: "/alerts",
      label: "Road alerts",
      shortLabel: "Alerts",
      icon: Crowd,
      badge: "alerts",
      owns: ["/alerts"],
    },
  ];
}

