import {
  BookOpen,
  GraduationCap,
  House,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  key: "home" | "learn" | "exam" | "settings";
  /** 是否只在精确匹配时高亮 */
  exact: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "首页", key: "home", exact: true },
  { href: "/s/gis", label: "学习", key: "learn", exact: false },
  // 考试入口：每日一考 / 综合考试（章节测验在讲义末尾，不在这里列）
  { href: "/exam", label: "考试", key: "exam", exact: false },
  { href: "/settings", label: "设置", key: "settings", exact: false },
];

/** 导航图标一律取自 lucide-react（`components/nav.tsx` 为唯一事实源） */
export const NAV_ICONS: Record<NavItem["key"], LucideIcon> = {
  home: House,
  learn: BookOpen,
  // 主操作「考试」用学位帽：比剪贴板/试卷板更像“考试”，且与书本、齿轮形状拉开
  exam: GraduationCap,
  settings: Settings,
};

export function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

/** 答题 / 考试进行中是专注模式：隐藏底部 tab，把底部留给「提交/下一题」操作条 */
export function isFocusMode(pathname: string): boolean {
  return (
    pathname.endsWith("/quiz") ||
    pathname === "/exam/daily" ||
    pathname === "/exam/mock"
  );
}
