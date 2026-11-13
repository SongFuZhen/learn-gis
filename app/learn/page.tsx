import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SKILL_REGISTRY } from "@/content/registry";
import { getSkillIcon } from "@/content/icons";
import { TRACK_LABEL, type SkillTrack } from "@/content/types";
import { getModules, getQuestionFile } from "@/lib/content";

export const metadata: Metadata = {
  title: "学习",
  description: "全部课程：地理空间、图形渲染与平台开发。讲义 → 刷题 → 间隔复习。",
};

const TRACK_ORDER: SkillTrack[] = ["geospatial", "graphics", "platform"];

/** 课程中转页：按轨道分组列出所有技能，作为「学习」导航的入口 */
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

        {TRACK_ORDER.map((track) => {
          const registrations = SKILL_REGISTRY.filter((r) => r.track === track);
          if (registrations.length === 0) return null;
          return (
            <section key={track} className="mt-7 first:mt-6">
              <h2 className="flex items-center gap-2 text-[13px] font-medium text-foreground-tertiary">
                <span className="h-px w-5 bg-border-strong" aria-hidden="true" />
                {TRACK_LABEL[track]}
              </h2>
              <ul className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                {registrations.map((reg) => {
                  const modules = getModules(reg.id);
                  const questionCount = modules.reduce(
                    (sum, m) =>
                      sum + getQuestionFile(reg.id, m.slug).questions.length,
                    0,
                  );
                  const Icon = getSkillIcon(reg.icon);
                  return (
                    <li key={reg.id}>
                      <Link
                        href={`/s/${reg.id}`}
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
                          <h3 className="min-w-0 text-[16px] font-medium leading-snug">
                            {reg.title}
                          </h3>
                        </div>
                        <p className="relative mt-3 flex-1 text-[13px] leading-relaxed text-foreground-secondary">
                          {reg.description}
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
            </section>
          );
        })}
      </div>
    </div>
  );
}
