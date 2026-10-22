import Link from "next/link";
import { RotateCcw } from "lucide-react";

export const metadata = {
  title: "今日复习",
  description: "按 SM-2 排期的错题复习队列。",
};

export default function ReviewPage() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em] sm:text-[32px] lg:text-[36px]">
        今日复习
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-secondary sm:text-[15px]">
        做错的题会按 SM-2 排期回到这里：答对一次推到 1 天，再对推到 6 天，之后按
        ease 递增；答错则重置为明天。
      </p>

      <div className="mt-6 rounded-md border border-dashed border-border bg-card p-8 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-brand-soft text-brand">
          <RotateCcw className="h-6 w-6" strokeWidth={1.7} />
        </span>
        <p className="mt-3 text-[15px] font-medium">复习队列还没开张</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-foreground-tertiary">
          M3 会接上 Neon 存储与排期：到时候这里显示「今天到期 N 题」，点一下就能开做。
        </p>
        <Link
          href="/s/gis/01/quiz"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-sm bg-brand-gradient px-5 text-sm font-medium text-white shadow-brand transition-opacity hover:opacity-95"
        >
          先去做一章测验
        </Link>
      </div>
    </div>
  );
}
