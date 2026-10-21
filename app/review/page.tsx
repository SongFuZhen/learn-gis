import Link from "next/link";

export const metadata = {
  title: "今日复习",
  description: "按 SM-2 排期的错题复习队列。",
};

export default function ReviewPage() {
  return (
    <div className="mx-auto w-full max-w-content px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-[22px] font-semibold tracking-tight sm:text-3xl">
        今日复习
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-secondary">
        做错的题会按 SM-2 排期回到这里：答对一次推到 1 天，再对推到 6 天，之后按
        ease 递增；答错则重置为明天。
      </p>

      <div className="mt-6 rounded-xl border border-dashed border-border bg-surface p-6 text-center">
        <p className="text-sm font-medium">复习队列还没开张</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-foreground-tertiary">
          M3 会接上 Neon 存储与排期：到时候这里显示「今天到期 N 题」，点一下就能开做。
        </p>
        <Link
          href="/s/gis/01/quiz"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
        >
          先去做一章测验
        </Link>
      </div>
    </div>
  );
}
