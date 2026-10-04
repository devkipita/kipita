import type { Metadata } from "next";
import { SITE } from "@/lib/site";

const SOCIAL_IMAGE = "/landing/car-hero.jpg";

export function createPageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  const socialTitle = `${title} — ${SITE.name}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description,
      url: path,
      siteName: SITE.name,
      locale: "en_KE",
      type: "website",
      images: [
        {
          url: SOCIAL_IMAGE,
          width: 1200,
          height: 630,
          alt: socialTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [SOCIAL_IMAGE],
    },
  };
}
