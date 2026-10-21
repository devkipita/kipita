/** Central brand + site configuration for the Kipita web app. */
export const SITE = {
  name: "Kipita",
  tagline: "Carpooling, made for Kenya.",
  description:
    "Kipita connects drivers with empty seats to passengers heading the same way, safer, cheaper journeys across Kenya, paid securely with M-Pesa.",
  supportEmail: "support@kipita.app",
  websiteUrl:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.kipita.co.ke",
  brand: {
    green: "#2F6C4F",
    greenDark: "#1E6B4A",
    tan: "#D4B896",
    sage: "#E6EFE3",
  },
} as const;
