import Link from "next/link";
import { ChevronRight, LogIn, UserPlus } from "lucide-react";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LogoutButton from "@/components/auth/LogoutButton";
import NicknameForm from "@/components/account/NicknameForm";
import { displayNameOf, getSession } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
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
    href: "/learn",
    label: "课程章节",
    desc: "讲义目录，按顺序读或跳着读",
  },
];

export default async function SettingsPage() {
  const session = await getSession();
  const [accountRow] = session
    ? await db
        .select({
          id: users.id,
          username: users.username,
          nickname: users.nickname,
        })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1)
    : [null];

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em] sm:text-[32px] lg:text-[36px]">
        设置
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-secondary sm:text-[15px]">
        外观与学习数据都在这一页；导航只保留四个入口，其余收在这里。
      </p>

      {/* 账号 */}
      <section className="mt-6 rounded-md border border-border bg-card shadow-card">
        <div className="flex items-center gap-4 px-5 py-5">
          {accountRow?.username ? (
            <>
              <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-[24px] font-semibold uppercase text-white shadow-brand">
                {displayNameOf(accountRow).charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-semibold">
                  {displayNameOf(accountRow)}
                </p>
                <p className="mt-0.5 truncate font-mono text-[12.5px] text-foreground-tertiary">
                  {accountRow.username}
                </p>
                <p className="mt-1 text-[12px] text-foreground-muted">
                  学习进度随账号跨设备同步
                </p>
              </div>
              <LogoutButton />
            </>
          ) : (
            <>
              <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-background-subtle text-[24px] font-semibold text-foreground-muted">
                客
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-semibold">匿名访客</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-foreground-tertiary">
                  进度只存在本浏览器，登录或注册后可跨设备同步
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/?auth=login"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong px-3 text-[13px] font-medium transition-colors hover:bg-surface-hover"
                >
                  <LogIn className="h-4 w-4" strokeWidth={1.7} />
                  登录
                </Link>
                <Link
                  href="/?auth=register"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <UserPlus className="h-4 w-4" strokeWidth={1.7} />
                  注册
                </Link>
              </div>
            </>
          )}
        </div>
        {accountRow?.username && (
          <div className="border-t border-border-subtle px-5 py-4">
            <p className="text-[13px] font-medium">登录名（仅用于登录，不公开）</p>
            <p className="mt-1 inline-flex h-9 max-w-full items-center truncate rounded-md bg-background-subtle px-3 font-mono text-[13px] text-foreground-tertiary">
              {accountRow.username}
            </p>
            <NicknameForm initialNickname={displayNameOf(accountRow)} />
          </div>
        )}
      </section>

      {/* 外观 */}
      <section className="mt-6 rounded-md border border-border bg-card shadow-card">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[15px] font-medium">外观</p>
            <p className="mt-1 text-[13px] leading-relaxed text-foreground-tertiary">
              默认跟随系统外观，也可固定浅色或深色。
            </p>
          </div>
          <ThemeSwitcher />
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
          学习进度与错题记录保存在 Neon 数据库。未注册时按浏览器匿名 cookie 区分；
          注册账号会把当前进度就地归入账号，在其他设备登录后自动合并同步。
          首页的「继续学习」、今日复习与学习进度页都基于这份数据。
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
