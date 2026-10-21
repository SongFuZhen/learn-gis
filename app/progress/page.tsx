import Link from "next/link";
import { GIS_MODULES, PLANNED_MODULES } from "@/content/gis/modules";

export const metadata = {
  title: "学习进度",
  description: "各章节掌握度与完成情况。",
};

export default function ProgressPage() {
  return (
    <div className="mx-auto w-full max-w-content px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-[22px] font-semibold tracking-tight sm:text-3xl">
        学习进度
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-secondary">
        每章取最高一次测验成绩作为掌握度，低于 80% 建议重读讲义后重练。
      </p>

      <ul className="mt-6 flex flex-col gap-2">
        {GIS_MODULES.map((m) => (
          <li
            key={m.slug}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[15px] font-medium">{m.title}</span>
              <span className="text-[11px] tabular text-foreground-tertiary">
                尚未测验
              </span>
            </div>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted"
              role="img"
              aria-label="掌握度 0%"
            >
              <div className="h-full w-0 rounded-full bg-accent" />
            </div>
          </li>
        ))}
        {PLANNED_MODULES.map((m) => (
          <li
            key={m.slug}
            className="flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-[13px] text-foreground-tertiary"
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
        className="mt-5 inline-flex h-10 items-center justify-center rounded-lg border border-border-strong px-4 text-sm hover:bg-surface-hover"
      >
        去章节列表
      </Link>
    </div>
  );
}
