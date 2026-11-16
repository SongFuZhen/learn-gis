import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Clock, Headphones, Play } from "lucide-react";
import {
  chapterNo,
  getModules,
  getQuestionFile,
  getSkill,
  SKILLS,
} from "@/lib/content";
import { SKILL_REGISTRY } from "@/content/registry";
import { getHomeData } from "@/lib/progress/home";
import { getContinueSlug, getSkillStats } from "@/lib/course-stats";
import CourseCover from "@/components/course/CourseCover";
import ChapterTimeline from "@/components/course/ChapterTimeline";

export function generateStaticParams() {
  return SKILLS.map((skill) => ({ skill: skill.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ skill: string }>;
}) {
  const { skill: skillId } = await params;
  const skill = getSkill(skillId);
  if (!skill) return {};
  return { title: skill.title, description: skill.description };
}

export default async function SkillPage({
  params,
}: {
  params: Promise<{ skill: string }>;
}) {
  const { skill: skillId } = await params;
  const skill = getSkill(skillId);
  if (!skill) notFound();

  const modules = getModules(skillId);
  const registration = SKILL_REGISTRY.find((r) => r.id === skillId);
  const plannedModules = registration?.plannedModules ?? [];
  const stats = getSkillStats(skillId);

  const home = await getHomeData();
  const skillChapters =
    home?.chapters.filter((c) => c.skill === skillId) ?? [];
  const chapterMap = new Map(skillChapters.map((c) => [c.slug, c]));

  const continueSlug = getContinueSlug(skillId, skillChapters);
  const hasProgress = skillChapters.some((c) => c.quizCount > 0);

  const questionCounts: Record<string, number> = {};
  for (const m of modules) {
    questionCounts[m.slug] = getQuestionFile(skillId, m.slug).questions.length;
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {/* 封面横幅 */}
      <section className="relative overflow-hidden rounded-lg border border-border shadow-card">
        {registration && (
          <CourseCover
            skillId={skillId}
            icon={registration.icon}
            size="banner"
            // 必须带 sm:h-full：banner 默认含 sm:h-44，twMerge 按断点分组，
            // 只传 h-full 盖不掉 sm:h-44，桌面端封面会固定 176px 高、露出白底
            className="absolute inset-0 h-full sm:h-full"
          />
        )}
        <div className="relative p-5 sm:p-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/75">
            Skill pack · {skillId}
          </p>
          <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.02em] text-white sm:text-[32px] lg:text-[36px]">
            {skill.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-[15px]">
            {skill.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[12px] tabular text-white/90">
            <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
              {stats.chapters} 章
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
              {stats.questions} 题
            </span>
            {stats.audioChapters > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
                <Headphones className="h-3 w-3" strokeWidth={1.7} />
                音频 {stats.audioChapters} 章
              </span>
            )}
            {registration && (
              <>
                <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
                  {registration.difficulty}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
                  <Clock className="h-3 w-3" strokeWidth={1.7} />
                  约 {registration.estimatedHours}h
                </span>
              </>
            )}
          </div>

          {continueSlug && (
            <Link
              href={`/s/${skillId}/${continueSlug}`}
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-white px-6 text-sm font-medium text-foreground shadow-brand transition-opacity hover:opacity-90"
            >
              <Play className="h-4 w-4" strokeWidth={2} />
              {hasProgress ? "继续学习" : "开始学习"}
            </Link>
          )}
        </div>
      </section>

      {/* 学习目标 */}
      {registration && registration.objectives.length > 0 && (
        <section className="mt-5 rounded-lg border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="text-[15px] font-medium">你将学会</h2>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {registration.objectives.map((objective) => (
              <li
                key={objective}
                className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground-secondary"
              >
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-success"
                  strokeWidth={2}
                />
                {objective}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 课程大纲 */}
      <section className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-medium">课程大纲</h2>
          <Link
            href="/learn"
            className="inline-flex min-h-8 items-center gap-1 text-[12px] text-foreground-muted hover:text-brand"
          >
            全部课程
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
        <div className="mt-3">
          <ChapterTimeline
            skillId={skillId}
            modules={modules}
            chapters={chapterMap}
            questionCounts={questionCounts}
          />
        </div>

        {plannedModules.length > 0 && (
          <ul className="mt-3 space-y-2">
            {plannedModules.map((m) => (
              <li
                key={m.slug}
                className="flex items-center gap-3 rounded-md border border-dashed border-border bg-card/50 px-4 py-3 text-[13px] text-foreground-tertiary"
              >
                <span className="font-mono text-[11px] text-foreground-muted">
                  {chapterNo(m.slug)}
                </span>
                {m.title}
                <span className="ml-auto text-[11px]">即将上线</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
