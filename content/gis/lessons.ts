import type { ComponentType } from "react";

/**
 * 讲义注册表：显式动态 import（Turbopack 能静态分析），
 * 讲义不进首屏以外的地方，也不为没读到的章节加载 MDX runtime。
 */
const LESSONS: Record<string, () => Promise<{ default: ComponentType }>> = {
  "01-basics": () => import("./01-basics.mdx"),
};

export async function loadLesson(
  file: string,
): Promise<ComponentType | null> {
  const loader = LESSONS[file];
  if (!loader) return null;
  const mod = await loader();
  return mod.default;
}
