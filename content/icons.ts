import { Box, Boxes, Globe, Map, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SkillIconName } from "./registry";

/** registry 里的图标名（可被 node 脚本安全引用）→ lucide 组件（仅 UI 层 import） */
export const SKILL_ICONS: Record<SkillIconName, LucideIcon> = {
  Map,
  Globe,
  Boxes,
  Box,
  Smartphone,
};

export function getSkillIcon(name: SkillIconName): LucideIcon {
  return SKILL_ICONS[name] ?? Map;
}
