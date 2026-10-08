import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

type Entry = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

const ROUTES: Entry[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/home", changeFrequency: "hourly", priority: 0.9 },
  { path: "/alerts", changeFrequency: "hourly", priority: 0.8 },
  { path: "/publish", changeFrequency: "weekly", priority: 0.7 },
  { path: "/help", changeFrequency: "weekly", priority: 0.5 },
  { path: "/legal/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/cookies", changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/refunds", changeFrequency: "yearly", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE.websiteUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
