import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata = {
  title: "设置",
  description: "外观主题、学习数据入口与站点说明。",
};

const ROWS = [
  {
    href: "/review",
    label: "今日复习",
    desc: "错题按 SM-2 排期回到这里",
  },
  {
    href: "/progress",
    label: "学习进度",
    desc: "各章掌握度与测验成绩",
  },
  {
    href: "/s/gis",
    label: "课程章节",
    desc: "讲义目录，按顺序读或跳着读",
  },
];

export default function SettingsPage() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em] sm:text-[32px] lg:text-[36px]">
        设置
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-secondary sm:text-[15px]">
        外观与学习数据都在这一页；导航只保留四个入口，其余收在这里。
      </p>

      {/* 外观 */}
      <section className="mt-6 rounded-md border border-border bg-card shadow-card">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[15px] font-medium">外观</p>
            <p className="mt-1 text-[13px] leading-relaxed text-foreground-tertiary">
              默认跟随系统，点按钮在浅色 / 深色之间切换。
            </p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      {/* 学习数据 */}
      <h2 className="mt-8 text-[11px] uppercase tracking-wider text-foreground-muted">
        学习
      </h2>
      <ul className="mt-2 overflow-hidden rounded-md border border-border bg-card shadow-card">
        {ROWS.map((row, index) => (
          <li
            key={row.href}
            className={index > 0 ? "border-t border-border-subtle" : undefined}
          >
            <Link
              href={row.href}
              className="flex min-h-[3.25rem] items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-background-subtle"
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-medium">
                  {row.label}
                </span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-foreground-tertiary">
                  {row.desc}
                </span>
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-foreground-muted"
                strokeWidth={1.7}
              />
            </Link>
          </li>
        ))}
      </ul>

      {/* 说明 */}
      <h2 className="mt-8 text-[11px] uppercase tracking-wider text-foreground-muted">
        说明
      </h2>
      <div className="mt-2 rounded-md border border-border bg-card p-5 shadow-card">
        <p className="text-[13px] leading-relaxed text-foreground-tertiary">
          学习进度与错题记录保存在 Neon 数据库，按浏览器 cookie（匿名身份）区分，
          无需注册登录。换设备或清除浏览器数据后进度不共享；首页的「继续学习」、
          上方的今日复习与学习进度页都基于这份数据。
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-foreground-tertiary">
          内容以仓库内 MDX / JSON 为准，引用来源见 docs/RESOURCES.md，欢迎 PR 纠错。
        </p>
        <p className="mt-4 text-[11px] text-foreground-muted">
          {SITE_NAME} · {SITE_URL.replace(/^https?:\/\//, "")}
        </p>
      </div>
    </div>
  );
}
