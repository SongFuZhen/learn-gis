import {
  BookOpen,
  GraduationCap,
  Headphones,
  House,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  key: "home" | "learn" | "audio" | "exam" | "settings";
  /** 是否只在精确匹配时高亮 */
  exact: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "首页", key: "home", exact: true },
  // 学习入口指向课程中转页；/s/<skill> 下的章节页也算在学习内（见 isActive）
  { href: "/learn", label: "学习", key: "learn", exact: false },
  { href: "/audio", label: "音频", key: "audio", exact: true },
  // 考试入口：每日一考 / 综合考试（章节测验在讲义末尾，不在这里列）
  { href: "/exam", label: "考试", key: "exam", exact: false },
  { href: "/settings", label: "设置", key: "settings", exact: false },
];

/** 导航图标一律取自 lucide-react（`components/nav.tsx` 为唯一事实源） */
export const NAV_ICONS: Record<NavItem["key"], LucideIcon> = {
  home: House,
  learn: BookOpen,
  audio: Headphones,
  // 主操作「考试」用学位帽：比剪贴板/试卷板更像“考试”，且与书本、齿轮形状拉开
  exam: GraduationCap,
  settings: Settings,
};

export function isActive(pathname: string, item: NavItem): boolean {
  if (!item.exact) {
    if (item.key === "learn" && pathname.startsWith("/s/")) return true;
    return pathname.startsWith(item.href);
  }
  return pathname === item.href;
}

/** 答题 / 考试进行中是专注模式：隐藏底部 tab，把底部留给「提交/下一题」操作条 */
export function isFocusMode(pathname: string): boolean {
  return (
    pathname.endsWith("/quiz") ||
    pathname === "/exam/daily" ||
    pathname === "/exam/mock"
  );
}
