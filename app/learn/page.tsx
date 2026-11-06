import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SKILLS, getModules, getQuestionFile } from "@/lib/content";

export const metadata: Metadata = {
  title: "学习",
  description: "全部课程：GIS 基础与 CesiumJS 三维地球。讲义 → 刷题 → 间隔复习。",
};

/** 课程中转页：列出所有技能，作为「学习」导航的入口 */
export default function LearnPage() {
  return (
    <div className="w-full px-4 pb-8 pt-5 sm:px-6 lg:px-8 lg:pt-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
          选择课程
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-foreground-secondary">
          每门课都是「讲义 → 刷题 → 间隔复习」的完整闭环，答错先讲清为什么错。
        </p>

        <ul className="mt-6 flex flex-col gap-4">
          {SKILLS.map((skill) => {
            const modules = getModules(skill.id);
            const questionCount = modules.reduce(
              (sum, m) => sum + getQuestionFile(skill.id, m.slug).questions.length,
              0,
            );
            return (
              <li key={skill.id}>
                <Link
                  href={`/s/${skill.id}`}
                  className="group flex items-start gap-4 rounded-lg border border-border bg-card p-5 shadow-card transition-colors hover:border-brand/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-medium">{skill.title}</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-foreground-secondary">
                      {skill.description}
                    </p>
                    <p className="mt-2.5 flex items-center gap-2 text-[12px] tabular text-foreground-tertiary">
                      <span>{modules.length} 章</span>
                      <span className="text-foreground-disabled">·</span>
                      <span>{questionCount} 题</span>
                    </p>
                  </div>
                  <ArrowRight
                    className="mt-1 h-5 w-5 shrink-0 text-foreground-muted transition-colors group-hover:text-brand"
                    strokeWidth={1.8}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
