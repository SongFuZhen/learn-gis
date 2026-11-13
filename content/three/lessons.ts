import type { ComponentType } from "react";

/**
 * three.js 讲义注册表：显式动态 import（Turbopack 能静态分析）。
 * 与 gis / cesium / turf 侧约定一致。
 */
const LESSONS: Record<string, () => Promise<{ default: ComponentType }>> = {
  "00-three-intro": () => import("./00-three-intro.mdx"),
  "01-scene-camera": () => import("./01-scene-camera.mdx"),
  "02-geometry-material": () => import("./02-geometry-material.mdx"),
  "03-light-shadow": () => import("./03-light-shadow.mdx"),
  "04-texture-loader": () => import("./04-texture-loader.mdx"),
  "05-orbit-raycast": () => import("./05-orbit-raycast.mdx"),
  "06-animation": () => import("./06-animation.mdx"),
  "07-shader-basics": () => import("./07-shader-basics.mdx"),
  "08-postprocessing": () => import("./08-postprocessing.mdx"),
  "09-geo-integration": () => import("./09-geo-integration.mdx"),
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
