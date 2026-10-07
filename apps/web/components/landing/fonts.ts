import localFont from "next/font/local";

const heading = localFont({
  src: "../../public/assets/manrope-latin.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-manrope",
});

const body = localFont({
  src: "../../public/assets/dmsans-latin.woff2",
  weight: "100 1000",
  display: "swap",
  variable: "--font-dm",
});

export const landingFonts = `${heading.variable} ${body.variable}`;
