import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { SITE } from "@/lib/site";
import { StyledRegistry } from "@/components/providers/StyledRegistry";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    siteName: SITE.name,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#dbe8d6" },
    { media: "(prefers-color-scheme: dark)", color: "#111412" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body>
        <StyledRegistry>
          <ThemeProvider>{children}</ThemeProvider>
        </StyledRegistry>
      </body>
    </html>
  );
}
