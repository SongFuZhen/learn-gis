import Link from "next/link";
import { CalendarCheck, ChevronRight, Layers } from "lucide-react";
import { GIS_MODULES } from "@/content/gis/modules";
import { getQuestionFile } from "@/lib/content";
import { EXAM_PLAN } from "@/lib/quiz/exam";

export const metadata = {
  title: "考试",
  description: "每日一考与综合考试：随机抽题、逐题判卷、错题讲解。",
};

export default function ExamPage() {
  const total = GIS_MODULES.reduce(
    (sum, m) => sum + getQuestionFile("gis", m.slug).questions.length,
    0,
  );

  const modes = [
    {
      href: "/exam/daily",
      icon: CalendarCheck,
      label: EXAM_PLAN.daily.label,
      size: EXAM_PLAN.daily.size,
      blurb: EXAM_PLAN.daily.blurb,
      meta: "每天一套 · 跨章抽题",
    },
    {
      href: "/exam/mock",
      icon: Layers,
      label: EXAM_PLAN.mock.label,
      size: EXAM_PLAN.mock.size,
      blurb: EXAM_PLAN.mock.blurb,
      meta: `覆盖全部 ${GIS_MODULES.length} 章 · 每次新卷`,
    },
  ];

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand-ink">
        Exam · GIS
      </p>
      <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.02em] sm:text-[32px] lg:text-[36px]">
        考试
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-secondary sm:text-[15px]">
        两种卷子，都从 {total} 题的题库里随机抽。答完立刻判卷，错题先讲「错在哪」
        再给正确答案；正确率 ≥ 80% 记为通过。
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <Link
              key={mode.href}
              href={mode.href}
              className="flex h-full flex-col rounded-md border border-border bg-card p-5 shadow-card transition-colors hover:border-brand/40 hover:bg-background-subtle"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-sm bg-brand-soft text-brand-ink">
                  <Icon className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <span className="shrink-0 rounded-sm bg-surface-muted px-1.5 py-0.5 text-[11px] tabular text-foreground-tertiary">
                  {mode.size} 题
                </span>
              </span>
              <span className="mt-4 block text-[16px] font-medium leading-snug">
                {mode.label}
              </span>
              <span className="mt-1.5 block flex-1 text-[13px] leading-relaxed text-foreground-tertiary">
                {mode.blurb}
              </span>
              <span className="mt-4 flex items-center justify-between gap-2">
                <span className="text-[12px] text-foreground-muted">
                  {mode.meta}
                </span>
                <span className="inline-flex items-center gap-1 text-[13px] font-medium text-brand">
                  开考
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 rounded-md border border-dashed border-border px-5 py-4">
        <p className="text-[13px] font-medium text-foreground-secondary">
          章节测验在讲义末尾
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-foreground-tertiary">
          每章学完就地做 10~15 题，用来随学随测；
          <Link
            href="/s/gis"
            className="mx-1 text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
          >
            从章节列表
          </Link>
          进入即可。考试这一页只管跨章节的随机卷。
        </p>
      </div>
    </div>
  );
}
