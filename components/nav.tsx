import {
  BookOpen,
  GraduationCap,
  House,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavKey = "home" | "learn" | "exam" | "settings";

export type NavItem = {
  href: string;
  label: string;
  key: NavKey;
  activePrefixes: readonly string[];
  exact?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "首页", key: "home", activePrefixes: [], exact: true },
  // 学习中心承接课程、章节、复习、进度、打卡、划线、音频与排行
  {
    href: "/learn",
    label: "学习",
    key: "learn",
    activePrefixes: [
      "/learn",
      "/s",
      "/review",
      "/progress",
      "/checkin",
      "/annotations",
      "/audio",
      "/rank",
    ],
  },
  // 跨章节随机卷；章节测验在 /s/* 内，归学习
  { href: "/exam", label: "考试", key: "exam", activePrefixes: ["/exam"] },
  {
    href: "/settings",
    label: "设置",
    key: "settings",
    activePrefixes: ["/settings", "/docs/mcp"],
  },
];

/** 导航图标一律取自 lucide-react（`components/nav.tsx` 为唯一事实源） */
export const NAV_ICONS: Record<NavKey, LucideIcon> = {
  home: House,
  learn: BookOpen,
  // 主操作「考试」用学位帽：比剪贴板/试卷板更像“考试”，且与书本、齿轮形状拉开
  exam: GraduationCap,
  settings: Settings,
};

function isPathOrUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return item.activePrefixes.some((prefix) => isPathOrUnder(pathname, prefix));
}

/** 答题 / 考试进行中是专注模式：隐藏底部 tab，把底部留给「提交/下一题」操作条 */
export function isFocusMode(pathname: string): boolean {
  return (
    pathname.endsWith("/quiz") ||
    pathname === "/exam/daily" ||
    pathname === "/exam/mock"
  );
}
