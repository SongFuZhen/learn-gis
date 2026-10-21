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
    <div className="mx-auto w-full max-w-content">
      <section className="px-4 pb-8 pt-10 sm:px-6 sm:pt-16">
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">
          Skill pack · GIS
        </p>
        <h1 className="mt-3 text-[26px] font-semibold leading-[1.25] tracking-tight sm:text-4xl">
          从零建立
          <br className="sm:hidden" />
          GIS 的知识骨架
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-foreground-secondary sm:text-base">
          球面到平面、坐标参考系、矢量与栅格、数据格式、OGC 服务、空间运算与
          PostGIS。每个概念都配题目与权威引用，答错先讲清为什么错。
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href="/s/gis/01"
            className="flex h-12 items-center justify-center rounded-lg bg-accent px-5 text-[15px] font-medium text-accent-foreground transition-colors hover:bg-accent-hover sm:h-11 sm:w-auto sm:text-sm"
          >
            从第 1 章开始
          </Link>
          <Link
            href="/s/gis"
            className="flex h-12 items-center justify-center rounded-lg border border-border-strong px-5 text-[15px] transition-colors hover:bg-surface-hover sm:h-11 sm:w-auto sm:text-sm"
          >
            查看全部章节
          </Link>
        </div>
      </section>

      <section className="px-4 sm:px-6">
        <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
          {LOOP.map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <span className="font-mono text-[11px] text-accent">{item.step}</span>
              <h2 className="mt-1.5 text-sm font-semibold">{item.title}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-foreground-tertiary">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 px-4 pb-10 sm:px-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-foreground-secondary">
            课程章节
          </h2>
          <span className="text-[11px] text-foreground-muted">
            已上线 {GIS_MODULES.length} / {GIS_MODULES.length + PLANNED_MODULES.length}
          </span>
        </div>

        <ol className="mt-3 flex flex-col gap-2">
          {GIS_MODULES.map((m) => {
            const count = getQuestionFile("gis", m.slug).questions.length;
            return (
              <li key={m.slug}>
                <Link
                  href={`/s/gis/${m.slug}`}
                  className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-hover"
                >
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 font-mono text-xs text-accent">
                    {m.slug}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[15px] font-medium">{m.title}</span>
                      <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] tabular text-foreground-tertiary">
                        {count} 题
                      </span>
                    </span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-foreground-tertiary">
                      {m.summary}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        {PLANNED_MODULES.length > 0 && (
          <div className="mt-5">
            <h3 className="text-[11px] uppercase tracking-wider text-foreground-muted">
              即将上线
            </h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {PLANNED_MODULES.map((m) => (
                <li
                  key={m.slug}
                  className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-2.5 text-[13px] text-foreground-tertiary"
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
