import Link from "next/link";
import { GIS_MODULES, PLANNED_MODULES } from "@/content/gis/modules";
import { getQuestionFile } from "@/lib/content";

const LOOP = [
  {
    step: "01",
    title: "读一页讲义",
    desc: "一章一页，讲清概念与常见坑，手机上也读得下去。",
  },
  {
    step: "02",
    title: "做十道题",
    desc: "一题一屏，答错立刻说清「错在哪」，不只给答案。",
  },
  {
    step: "03",
    title: "错题再回来",
    desc: "按 SM-2 排期，隔几天把错题放进复习队列。",
  },
];

export default function HomePage() {
  return (
    <div className="w-full px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-lg border border-border bg-card px-5 py-8 shadow-card sm:px-8 sm:py-12 lg:px-10 lg:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand-gradient opacity-[0.14] blur-2xl"
        />
        <div className="relative">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand-ink">
            Skill pack · GIS
          </p>
          <h1 className="mt-3 text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] sm:text-4xl lg:text-[40px]">
            从零建立
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> </span>
            <span className="text-brand-gradient">GIS</span>
            的知识骨架
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-foreground-secondary sm:text-base">
            球面到平面、坐标参考系、矢量与栅格、数据格式、OGC 服务、空间运算与
            PostGIS。每个概念都配题目与权威引用，答错先讲清为什么错。
          </p>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/s/gis/01"
              className="flex h-12 items-center justify-center rounded-sm bg-brand-gradient px-6 text-[15px] font-medium text-white shadow-brand transition-opacity hover:opacity-95 sm:h-11 sm:w-auto sm:text-sm"
            >
              从第 1 章开始
            </Link>
            <Link
              href="/s/gis"
              className="flex h-12 items-center justify-center rounded-sm border border-border-strong bg-card px-6 text-[15px] font-medium text-foreground transition-colors hover:bg-background-hover sm:h-11 sm:w-auto sm:text-sm"
            >
              查看全部章节
            </Link>
          </div>
        </div>
      </section>

      {/* 学习闭环 */}
      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        {LOOP.map((item) => (
          <div
            key={item.step}
            className="rounded-md border border-border bg-card p-5 shadow-card"
          >
            <span className="inline-flex h-7 items-center rounded-sm bg-brand-soft px-2 font-mono text-[11px] text-brand">
              {item.step}
            </span>
            <h2 className="mt-3 text-[15px] font-semibold">{item.title}</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-foreground-tertiary">
              {item.desc}
            </p>
          </div>
        ))}
      </section>

      {/* 章节 */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[20px] font-semibold tracking-tight sm:text-[22px]">
            课程章节
          </h2>
          <span className="text-[12px] text-foreground-muted">
            已上线 {GIS_MODULES.length} / {GIS_MODULES.length + PLANNED_MODULES.length}
          </span>
        </div>

        <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {GIS_MODULES.map((m) => {
            const count = getQuestionFile("gis", m.slug).questions.length;
            return (
              <li key={m.slug}>
                <Link
                  href={`/s/gis/${m.slug}`}
                  className="flex h-full items-start gap-4 rounded-md border border-border bg-card p-5 shadow-card transition-colors hover:border-brand/40 hover:bg-background-subtle"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-brand-soft font-mono text-xs text-brand">
                    {m.slug}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[15px] font-medium leading-snug">
                        {m.title}
                      </span>
                      <span className="shrink-0 rounded-sm bg-surface-muted px-1.5 py-0.5 text-[11px] tabular text-foreground-tertiary">
                        {count} 题
                      </span>
                    </span>
                    <span className="mt-1.5 block text-[13px] leading-relaxed text-foreground-tertiary">
                      {m.summary}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        {PLANNED_MODULES.length > 0 && (
          <div className="mt-6">
            <h3 className="text-[11px] uppercase tracking-wider text-foreground-muted">
              即将上线
            </h3>
            <ul className="mt-2 flex flex-col gap-2">
              {PLANNED_MODULES.map((m) => (
                <li
                  key={m.slug}
                  className="flex items-center gap-3 rounded-md border border-dashed border-border px-4 py-2.5 text-[13px] text-foreground-tertiary"
                >
                  <span className="font-mono text-[11px] text-foreground-muted">
                    {m.slug}
                  </span>
                  {m.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
