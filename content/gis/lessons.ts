import type { ComponentType } from "react";

/**
 * 讲义注册表：显式动态 import（Turbopack 能静态分析），
 * 讲义只在对应章节加载，不拖累其它页面。
 */
const LESSONS: Record<string, () => Promise<{ default: ComponentType }>> = {
  "00-geo-math": () => import("./00-geo-math.mdx"),
  "01-basics": () => import("./01-basics.mdx"),
  "02-projection": () => import("./02-projection.mdx"),
  "03-crs-epsg": () => import("./03-crs-epsg.mdx"),
  "04-vector-raster": () => import("./04-vector-raster.mdx"),
  "05-formats-tiles": () => import("./05-formats-tiles.mdx"),
  "06-ogc-webmap": () => import("./06-ogc-webmap.mdx"),
  "07-spatial-postgis": () => import("./07-spatial-postgis.mdx"),
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
