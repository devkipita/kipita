import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/auth/",
          "/wallet",
          "/trips",
          "/profile",
          "/notifications",
          "/referrals",
          "/ride/",
        ],
      },
    ],
    sitemap: `${SITE.websiteUrl}/sitemap.xml`,
    host: SITE.websiteUrl,
  };
}
