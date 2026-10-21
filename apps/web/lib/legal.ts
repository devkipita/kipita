export const LEGAL_EFFECTIVE = "21 October 2026";

export const LEGAL_TABS = [
  { href: "/legal", label: "Overview", footerLabel: "Privacy & Terms" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/cookies", label: "Cookie Policy" },
  { href: "/legal/refunds", label: "Refund Policy" },
  { href: "/legal/faq", label: "FAQ" },
] as const;

export type LegalSectionLink = { id: string; label: string };
