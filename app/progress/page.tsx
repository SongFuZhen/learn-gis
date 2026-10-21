import Link from "next/link";
import { GIS_MODULES, PLANNED_MODULES } from "@/content/gis/modules";

export const metadata = {
  title: "学习进度",
  description: "各章节掌握度与完成情况。",
};

export default function ProgressPage() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em] sm:text-[32px] lg:text-[36px]">
        学习进度
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-secondary sm:text-[15px]">
        每章取最高一次测验成绩作为掌握度，低于 80% 建议重读讲义后重练。
      </p>

      <ul className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {GIS_MODULES.map((m) => (
          <li
            key={m.slug}
            className="rounded-md border border-border bg-card p-5 shadow-card"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[15px] font-medium">{m.title}</span>
              <span className="text-[11px] tabular text-foreground-tertiary">
                尚未测验
              </span>
            </div>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-soft"
              role="img"
              aria-label="掌握度 0%"
            >
              <div className="h-full w-0 rounded-full bg-brand-gradient" />
            </div>
          </li>
        ))}
        {PLANNED_MODULES.map((m) => (
          <li
            key={m.slug}
            className="flex items-center gap-3 rounded-md border border-dashed border-border px-4 py-3 text-[13px] text-foreground-tertiary"
          >
            <span className="font-mono text-[11px] text-foreground-muted">
              {m.slug}
            </span>
            {m.title}
            <span className="ml-auto text-[11px]">即将上线</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[11px] leading-relaxed text-foreground-tertiary">
        进度存储（Neon + 本地降级）在 M3 上线，届时这里会显示真实掌握度。
      </p>

      <Link
        href="/s/gis"
        className="mt-5 inline-flex h-10 items-center justify-center rounded-sm border border-border-strong bg-card px-4 text-sm font-medium transition-colors hover:bg-background-hover"
      >
        去章节列表
      </Link>
    </div>
  );
}
