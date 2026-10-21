import type { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  key: "home" | "chapters" | "review" | "progress";
  /** 是否只在精确匹配时高亮 */
  exact: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "首页", key: "home", exact: true },
  { href: "/s/gis", label: "章节", key: "chapters", exact: false },
  { href: "/review", label: "复习", key: "review", exact: false },
  { href: "/progress", label: "进度", key: "progress", exact: false },
];

export const NAV_ICONS: Record<NavItem["key"], ReactNode> = {
  home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  chapters: (
    <>
      <path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H19v16H6.5A1.5 1.5 0 0 0 5 21.5z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  review: (
    <>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v4h-4" />
    </>
  ),
  progress: <path d="M4 20V9m6 11V4m6 16v-7" />,
};

export function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}
