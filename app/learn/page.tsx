import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Globe, Map } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SKILLS, getModules, getQuestionFile } from "@/lib/content";

export const metadata: Metadata = {
  title: "学习",
  description: "全部课程：GIS 基础与 CesiumJS 三维地球。讲义 → 刷题 → 间隔复习。",
};

/** 每门课的展示图标（新增技能时在此补一条） */
const SKILL_ICONS: Record<string, LucideIcon> = {
  gis: Map,
  cesium: Globe,
};

/** 课程中转页：列出所有技能，作为「学习」导航的入口 */
export default function LearnPage() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
          选择课程
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-foreground-secondary">
          每门课都是「讲义 → 刷题 → 间隔复习」的完整闭环，答错先讲清为什么错。
        </p>

        <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {SKILLS.map((skill) => {
            const modules = getModules(skill.id);
            const questionCount = modules.reduce(
              (sum, m) =>
                sum + getQuestionFile(skill.id, m.slug).questions.length,
              0,
            );
            const Icon = SKILL_ICONS[skill.id] ?? Map;
            return (
              <li key={skill.id}>
                <Link
                  href={`/s/${skill.id}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card p-5 shadow-card transition-colors hover:border-brand/40"
                >
                  {/* 右上角品牌渐变光晕（纯装饰） */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-brand-gradient opacity-[0.12] blur-2xl"
                  />
                  <div className="relative flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-ink">
                      <Icon className="h-5 w-5" strokeWidth={1.7} />
                    </span>
                    <h2 className="min-w-0 text-[16px] font-medium leading-snug">
                      {skill.title}
                    </h2>
                  </div>
                  <p className="relative mt-3 flex-1 text-[13px] leading-relaxed text-foreground-secondary">
                    {skill.description}
                  </p>
                  <div className="relative mt-4 flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-[12px] tabular text-foreground-tertiary">
                      <span className="rounded-full bg-surface-muted px-2 py-0.5">
                        {modules.length} 章
                      </span>
                      <span className="rounded-full bg-surface-muted px-2 py-0.5">
                        {questionCount} 题
                      </span>
                    </p>
                    <span className="inline-flex items-center gap-1 text-[13px] font-medium text-brand">
                      进入课程
                      <ArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        strokeWidth={2}
                      />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
