/** 站点级常量（供 layout / sitemap / JSON-LD 共用） */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://gis.ason.top";

export const SITE_NAME = "learn-gis";

export const SITE_DESCRIPTION =
  "以问答驱动的 GIS 学习应用：讲义 → 刷题 → 即时讲解 → 间隔复习，从零建立地理信息系统的知识体系。";
