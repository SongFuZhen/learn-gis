import type { ComponentType } from "react";

/**
 * 讲义注册表：显式动态 import（Turbopack 能静态分析），
 * 讲义只在对应章节加载，不拖累其它页面。
 */
const LESSONS: Record<string, () => Promise<{ default: ComponentType }>> = {
  "01-basics": () => import("./01-basics.mdx"),
  "02-crs-epsg": () => import("./02-crs-epsg.mdx"),
  "03-vector-raster": () => import("./03-vector-raster.mdx"),
  "04-formats-tiles": () => import("./04-formats-tiles.mdx"),
  "05-ogc-webmap": () => import("./05-ogc-webmap.mdx"),
  "06-spatial-postgis": () => import("./06-spatial-postgis.mdx"),
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
