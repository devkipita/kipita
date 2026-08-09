import { DM_Sans } from "next/font/google";

/**
 * The web uses the SAME typeface as the mobile app — DM Sans — for brand
 * consistency. The landing's CSS module references `--font-outfit` (headings)
 * and `--font-inter` (body); both resolve to DM Sans, so no module changes
 * are needed.
 */
const heading = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-outfit",
});

const body = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

/** Class string that exposes the font CSS variables to the landing subtree. */
export const landingFonts = `${heading.variable} ${body.variable}`;
