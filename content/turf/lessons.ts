import type { ComponentType } from "react";

/**
 * Turf 讲义注册表：显式动态 import（Turbopack 能静态分析）。
 * 与 gis / cesium 侧约定一致。
 */
const LESSONS: Record<string, () => Promise<{ default: ComponentType }>> = {
  "00-turf-intro": () => import("./00-turf-intro.mdx"),
  "01-measurement": () => import("./01-measurement.mdx"),
  "02-bearing-destination": () => import("./02-bearing-destination.mdx"),
  "03-buffer-transform": () => import("./03-buffer-transform.mdx"),
  "04-boolean-joins": () => import("./04-boolean-joins.mdx"),
  "05-point-polygon-voronoi": () => import("./05-point-polygon-voronoi.mdx"),
  "06-aggregation": () => import("./06-aggregation.mdx"),
  "07-interpolation-random": () => import("./07-interpolation-random.mdx"),
  "08-leaflet-maplibre": () => import("./08-leaflet-maplibre.mdx"),
  "09-performance-data": () => import("./09-performance-data.mdx"),
};

export const LESSON_FILES = Object.keys(LESSONS);

export async function loadLesson(
  file: string,
): Promise<ComponentType | null> {
  const loader = LESSONS[file];
  if (!loader) return null;
  const mod = await loader();
  return mod.default;
}
