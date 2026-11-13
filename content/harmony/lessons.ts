import type { ComponentType } from "react";

/**
 * HarmonyOS 讲义注册表：显式动态 import（Turbopack 能静态分析）。
 * 与 gis / cesium / turf / three 侧约定一致。
 */
const LESSONS: Record<string, () => Promise<{ default: ComponentType }>> = {
  "00-cognitive-map": () => import("./00-cognitive-map.mdx"),
  "01-env-project": () => import("./01-env-project.mdx"),
  "02-arkui-declarative": () => import("./02-arkui-declarative.mdx"),
  "03-state-management": () => import("./03-state-management.mdx"),
  "04-navigation": () => import("./04-navigation.mdx"),
  "05-network-async": () => import("./05-network-async.mdx"),
  "06-persistence-lifecycle": () => import("./06-persistence-lifecycle.mdx"),
  "07-polish-practice": () => import("./07-polish-practice.mdx"),
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
