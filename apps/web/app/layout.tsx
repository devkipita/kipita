import type { Metadata, Viewport } from "next";
import { Nunito, Space_Grotesk } from "next/font/google";
import localFont from "next/font/local";
import { SITE } from "@/lib/site";
import { StyledRegistry } from "@/components/providers/StyledRegistry";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ChunkReloadScript } from "@/components/providers/ChunkReloadScript";

const dmSans = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-dm-sans",
});

// Tall, condensed titles. The CSS variable keeps its old name so no call sites change.
const outfit = localFont({
  src: [
    {
      path: "../public/assets/barlow-condensed-500.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/assets/barlow-condensed-600.ttf",
      weight: "600",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-heading",
});

// Used only on the StepFlow cards on the landing.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.websiteUrl),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "carpooling Kenya",
    "rideshare Kenya",
    "Nairobi carpool",
    "share a ride Kenya",
    "M-Pesa ride payments",
    "cheap travel Kenya",
    "intercity rides Kenya",
    "Kipita",
  ],
  authors: [{ name: SITE.name, url: SITE.websiteUrl }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "travel",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.websiteUrl,
    siteName: SITE.name,
    locale: "en_KE",
    type: "website",
    images: [
      {
        url: "/landing/car-hero.jpg",
        width: 1200,
        height: 630,
        alt: `${SITE.name} — ${SITE.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: ["/landing/car-hero.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicons/favicon.ico", sizes: "any" },
      { url: "/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/favicons/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/favicons/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111412" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${outfit.variable} ${spaceGrotesk.variable} ${dmSans.className}`}
      suppressHydrationWarning
    >
      <body>
        <ChunkReloadScript />
        <StyledRegistry>
          <ThemeProvider>{children}</ThemeProvider>
        </StyledRegistry>
      </body>
    </html>
  );
}
