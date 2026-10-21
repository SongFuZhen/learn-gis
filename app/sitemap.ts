import type { MetadataRoute } from "next";
import { GIS_MODULES } from "@/content/gis/modules";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const modules: MetadataRoute.Sitemap = GIS_MODULES.flatMap((m) => [
    {
      url: `${SITE_URL}/s/gis/${m.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/s/gis/${m.slug}/quiz`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
  ]);

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE_URL}/s/gis`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...modules,
    {
      url: `${SITE_URL}/review`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/progress`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];
}
