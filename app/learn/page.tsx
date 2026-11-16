import type { Metadata } from "next";
import { SKILL_REGISTRY } from "@/content/registry";
import { TRACK_LABEL, type SkillTrack } from "@/content/types";
import { getSkillProgressMap, getSkillStats } from "@/lib/course-stats";
import CourseCard from "@/components/course/CourseCard";
import LearningPath from "@/components/course/LearningPath";

export const metadata: Metadata = {
  title: "课程目录",
  description: "全部课程：地理空间、图形渲染与平台开发。讲义 → 刷题 → 间隔复习。",
};

const TRACK_ORDER: SkillTrack[] = ["geospatial", "graphics", "platform"];

/** 课程目录：学习路径 + 按轨道分组的课程卡（封面/元信息/通关进度） */
export default async function LearnPage() {
  const [progressMap, totals] = await Promise.all([
    getSkillProgressMap(),
    Promise.all(
      SKILL_REGISTRY.map(async (r) => ({ id: r.id, stats: getSkillStats(r.id) })),
    ),
  ]);
  const statsById = new Map(totals.map((t) => [t.id, t.stats]));

  const totalChapters = totals.reduce((sum, t) => sum + t.stats.chapters, 0);
  const totalQuestions = totals.reduce((sum, t) => sum + t.stats.questions, 0);

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] sm:text-[32px] lg:text-[36px]">
          课程目录
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground-secondary sm:text-[15px]">
          {SKILL_REGISTRY.length} 门课 · {totalChapters} 章讲义 · {totalQuestions} 题题库
          · 每门课都是「讲义 → 刷题 → 间隔复习」的完整闭环，答错先讲清为什么错。
        </p>
      </header>

      <div className="mt-6">
        <LearningPath />
      </div>

      {TRACK_ORDER.map((track) => {
        const registrations = SKILL_REGISTRY.filter((r) => r.track === track);
        if (registrations.length === 0) return null;
        return (
          <section key={track} className="mt-8">
            <h2 className="flex items-center gap-2 text-[15px] font-medium">
              <span className="h-px w-5 bg-border-strong" aria-hidden="true" />
              {TRACK_LABEL[track]}
            </h2>
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {registrations.map((reg) => (
                <li key={reg.id}>
                  <CourseCard
                    compact
                    registration={reg}
                    stats={statsById.get(reg.id) ?? { chapters: 0, questions: 0, audioChapters: 0 }}
                    progress={progressMap?.[reg.id] ?? null}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
