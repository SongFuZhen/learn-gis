import type { MetadataRoute } from "next";
import { SKILL_REGISTRY } from "@/content/registry";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const skillIndexes: MetadataRoute.Sitemap = SKILL_REGISTRY.map((reg) => ({
    url: `${SITE_URL}/s/${reg.id}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.9,
  }));

  const modules: MetadataRoute.Sitemap = SKILL_REGISTRY.flatMap((reg) =>
    reg.modules.flatMap((m) => [
      {
        url: `${SITE_URL}/s/${reg.id}/${m.slug}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      },
      {
        url: `${SITE_URL}/s/${reg.id}/${m.slug}/quiz`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      },
    ]),
  );

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...skillIndexes,
    ...modules,
    {
      url: `${SITE_URL}/exam`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/exam/daily`,
      changeFrequency: "daily",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/exam/mock`,
      changeFrequency: "weekly",
      priority: 0.5,
    },
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
    {
      url: `${SITE_URL}/settings`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
