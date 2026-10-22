import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ChartColumn,
  RotateCcw,
} from "lucide-react";
import { GIS_MODULES } from "@/content/gis/modules";
import { getQuestionFile } from "@/lib/content";

const PASS_LINE = 80;

const ENTRIES = [
  {
    href: "/s/gis",
    label: "讲义",
    desc: "一章一页",
    Icon: BookOpen,
  },
  {
    href: "/review",
    label: "复习",
    desc: "今日到期",
    Icon: RotateCcw,
  },
  {
    href: "/progress",
    label: "进度",
    desc: "各章掌握度",
    Icon: ChartColumn,
  },
];

export default function HomePage() {
  const chapterCount = GIS_MODULES.length;
  const questionCount = GIS_MODULES.reduce(
    (sum, m) => sum + getQuestionFile("gis", m.slug).questions.length,
    0,
  );

  const stats = [
    { value: chapterCount, unit: "章", label: "已完成讲义" },
    { value: questionCount, unit: "题", label: "题库总量" },
    { value: PASS_LINE, unit: "%", label: "单卷通过线" },
  ];

  return (
    <div className="w-full px-4 pb-8 pt-5 sm:px-6 lg:px-8 lg:pt-10">
      {/* 介绍 + 统计 + 主操作：一屏内看完 */}
      <section className="relative overflow-hidden rounded-lg border border-border bg-card px-5 py-6 shadow-card sm:px-7 sm:py-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-brand-gradient opacity-[0.14] blur-2xl"
        />
        <div className="relative">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand-ink">
            Skill pack · GIS
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.25] tracking-[-0.02em] sm:text-[32px]">
            问答式学<span className="text-brand-gradient"> GIS</span>
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-foreground-secondary sm:text-[15px]">
            从球面到平面、坐标参考系、矢量与栅格、数据格式、OGC 服务、空间运算与
            PostGIS。讲义 → 刷题 → 间隔复习，答错先讲清为什么错。
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/exam"
              className="flex h-12 items-center justify-center gap-2 rounded-sm bg-brand-gradient px-6 text-[15px] font-medium text-white shadow-brand transition-opacity hover:opacity-95 sm:h-11 sm:text-sm"
            >
              开始考试
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <Link
              href="/s/gis"
              className="flex h-12 items-center justify-center rounded-sm border border-border-strong bg-card px-6 text-[15px] font-medium text-foreground transition-colors hover:bg-background-hover sm:h-11 sm:text-sm"
            >
              从第 1 章读起
            </Link>
          </div>

          {/* 统计 */}
          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-border-subtle pt-5">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse">
                <dt className="mt-0.5 text-[11px] text-foreground-muted sm:text-[12px]">
                  {s.label}
                </dt>
                <dd className="flex items-baseline gap-1 font-semibold tracking-tight">
                  <span className="tabular text-[22px] sm:text-[26px]">
                    {s.value}
                  </span>
                  <span className="text-[12px] font-medium text-foreground-tertiary">
                    {s.unit}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 快捷入口：导航里没有的次级入口集中在这里 */}
      <section className="mt-3">
        <h2 className="sr-only">快捷入口</h2>
        <ul className="grid grid-cols-3 gap-2 sm:gap-3">
          {ENTRIES.map(({ href, label, desc, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex h-full flex-col gap-2 rounded-md border border-border bg-card p-3.5 shadow-card transition-colors hover:border-brand/40 hover:bg-background-subtle sm:p-4"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-brand-soft text-brand">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                </span>
                <span className="text-[13px] font-medium sm:text-sm">
                  {label}
                </span>
                <span className="hidden text-[12px] leading-snug text-foreground-tertiary sm:block">
                  {desc}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-4 text-[11px] leading-relaxed text-foreground-tertiary">
        进度与错题记录在 M3 接入后按章保存；当前统计取自仓库内题库。
      </p>
    </div>
  );
}
