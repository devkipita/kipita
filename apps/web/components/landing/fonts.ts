import { Nunito } from "next/font/google";
import localFont from "next/font/local";

// `--font-outfit` is the heading variable and `--font-inter` the body one; names kept so CSS modules need no changes.
const heading = localFont({
  src: [
    {
      path: "../../public/assets/barlow-condensed-500.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/assets/barlow-condensed-600.ttf",
      weight: "600",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-outfit",
});

const body = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

/** Class string that exposes the font CSS variables to the landing subtree. */
export const landingFonts = `${heading.variable} ${body.variable}`;
