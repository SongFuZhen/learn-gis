import type { ComponentType } from "react";

/**
 * 讲义注册表：显式动态 import（Turbopack 能静态分析），
 * 讲义只在对应章节加载，不拖累其它页面。
 * 新大纲 15 章：未交付章节（05/07/08/09/10/11）待各自批次再注册。
 */
const LESSONS: Record<string, () => Promise<{ default: ComponentType }>> = {
  "00-geo-math": () => import("./00-geo-math.mdx"),
  "01-math-notation": () => import("./01-math-notation.mdx"),
  "02-basics": () => import("./02-basics.mdx"),
  "03-projection": () => import("./03-projection.mdx"),
  "04-crs-epsg": () => import("./04-crs-epsg.mdx"),
  "05-vector-raster": () => import("./05-vector-raster.mdx"),
  "06-cartography": () => import("./06-cartography.mdx"),
  "07-formats-tiles": () => import("./07-formats-tiles.mdx"),
  "08-gis-tools": () => import("./08-gis-tools.mdx"),
  "09-data-quality": () => import("./09-data-quality.mdx"),
  "10-spatial-analysis": () => import("./10-spatial-analysis.mdx"),
  "11-terrain": () => import("./11-terrain.mdx"),
  "12-remote-sensing": () => import("./12-remote-sensing.mdx"),
  "13-spatial-db": () => import("./13-spatial-db.mdx"),
  "14-webgis": () => import("./14-webgis.mdx"),
  "15-satellite-orbits": () => import("./15-satellite-orbits.mdx"),
  "16-satellite-constellations": () => import("./16-satellite-constellations.mdx"),
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
