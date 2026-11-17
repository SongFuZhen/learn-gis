import { SKILLS, getModule } from "@/lib/content";
import { SITE_NAME } from "@/lib/site";

const STATIC_TITLES: readonly (readonly [prefix: string, title: string])[] = [
  ["/learn", "学习"],
  ["/exam/daily", "每日一考"],
  ["/exam/mock", "综合考试"],
  ["/exam", "考试"],
  ["/audio", "讲义音频"],
  ["/review", "今日复习"],
  ["/progress", "学习进度"],
  ["/annotations", "我的划线"],
  ["/checkin", "打卡"],
  ["/rank", "学习积分榜"],
  ["/docs/mcp", "MCP 接入"],
  ["/settings", "设置"],
];

function isPathOrUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** 移动顶栏标题：只负责 chrome 文案，SEO 标题仍由各页面 metadata 控制 */
export function pageTitle(pathname: string): string {
  for (const [prefix, title] of STATIC_TITLES) {
    if (isPathOrUnder(pathname, prefix)) return title;
  }

  const chapter = pathname.match(/^\/s\/([a-z]+)\/(\d{2})/);
  if (chapter) {
    const mod = getModule(chapter[1] ?? "", chapter[2] ?? "");
    if (mod) {
      return pathname.endsWith("/quiz") ? `测验 · ${mod.title}` : mod.title;
    }
  }

  if (isPathOrUnder(pathname, "/s")) {
    const skill = SKILLS.find((item) =>
      isPathOrUnder(pathname, `/s/${item.id}`),
    );
    return skill?.title ?? "课程";
  }

  return pathname === "/" ? "首页" : SITE_NAME;
}
