import type { Metadata, Viewport } from "next";
import { SITE } from "@/lib/site";
import { landingFonts } from "@/components/landing/fonts";
import { StyledRegistry } from "@/components/providers/StyledRegistry";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ChunkReloadScript } from "@/components/providers/ChunkReloadScript";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.websiteUrl),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.websiteUrl }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "travel",
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
      className={landingFonts}
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
