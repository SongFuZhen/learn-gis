import type { ComponentType } from "react";

/**
 * Cesium 讲义注册表：显式动态 import（Turbopack 能静态分析）。
 * 与 gis 侧约定一致；未交付章节随批次再注册。
 */
const LESSONS: Record<string, () => Promise<{ default: ComponentType }>> = {
  "00-cesium-intro": () => import("./00-cesium-intro.mdx"),
  "01-camera-coords": () => import("./01-camera-coords.mdx"),
  "02-imagery-layers": () => import("./02-imagery-layers.mdx"),
  "03-terrain": () => import("./03-terrain.mdx"),
  "04-entity-geojson": () => import("./04-entity-geojson.mdx"),
  "05-czml-time": () => import("./05-czml-time.mdx"),
  "06-3dtiles": () => import("./06-3dtiles.mdx"),
  "07-picking-events": () => import("./07-picking-events.mdx"),
  "08-measure": () => import("./08-measure.mdx"),
  "09-performance-finale": () => import("./09-performance-finale.mdx"),
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
