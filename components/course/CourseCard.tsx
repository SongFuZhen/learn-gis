import Link from "next/link";
import { ArrowRight, Clock, Headphones } from "lucide-react";
import type { SkillRegistration } from "@/content/registry";
import type { SkillProgress, SkillStats } from "@/lib/course-stats";
import CourseCover from "./CourseCover";

/**
 * 课程目录卡片：几何封面 + 元信息 chips + 通关进度。
 * progress 为 null（新访客/DB 不可用）时整体按未开始渲染。
 */
export default function CourseCard({
  registration,
  stats,
  progress,
  compact = false,
}: {
  registration: SkillRegistration;
  stats: SkillStats;
  progress: SkillProgress | null;
  /** 首页摘要版：矮封面、窄内边距、描述单行 */
  compact?: boolean;
}) {
  const started = progress !== null && progress.passed + progress.learning > 0;

  return (
    <Link
      href={`/s/${registration.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-colors hover:border-brand/40"
    >
      <CourseCover
        skillId={registration.id}
        icon={registration.icon}
        className={compact ? "h-20 sm:h-24" : undefined}
      />

      <div className={compact ? "flex flex-1 flex-col p-4" : "flex flex-1 flex-col p-5"}>
        <div className="flex items-start justify-between gap-3">
          <h3
            className={
              compact
                ? "min-w-0 text-[15px] font-medium leading-snug"
                : "min-w-0 text-[16px] font-medium leading-snug"
            }
          >
            {registration.title}
          </h3>
          <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand-ink">
            {registration.difficulty}
          </span>
        </div>

        <p
          className={
            compact
              ? "mt-1.5 line-clamp-1 text-[13px] leading-relaxed text-foreground-secondary"
              : "mt-2.5 line-clamp-2 flex-1 text-[13px] leading-relaxed text-foreground-secondary"
          }
        >
          {registration.description}
        </p>

        <div
          className={
            compact
              ? "mt-3 flex flex-wrap items-center gap-1.5 text-[12px] tabular text-foreground-tertiary"
              : "mt-3.5 flex flex-wrap items-center gap-1.5 text-[12px] tabular text-foreground-tertiary"
          }
        >
          <span className="rounded-full bg-surface-muted px-2 py-0.5">
            {stats.chapters} 章
          </span>
          <span className="rounded-full bg-surface-muted px-2 py-0.5">
            {stats.questions} 题
          </span>
          {stats.audioChapters > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5">
              <Headphones className="h-3 w-3" strokeWidth={1.7} />
              {stats.audioChapters} 章
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5">
            <Clock className="h-3 w-3" strokeWidth={1.7} />
            约 {registration.estimatedHours}h
          </span>
        </div>

        <div
          className={
            compact
              ? "mt-3 border-t border-border-subtle pt-3"
              : "mt-4 border-t border-border-subtle pt-3.5"
          }
        >
          {started ? (
            <>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-foreground-tertiary">
                  通关 {progress!.passed}/{progress!.total} 章
                </span>
                <span className="tabular font-medium text-brand-ink">
                  {progress!.completion}%
                </span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-soft"
                role="img"
                aria-label={`通关进度 ${progress!.completion}%`}
              >
                <div
                  className="h-full rounded-full bg-brand-gradient"
                  style={{ width: `${progress!.completion}%` }}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] text-foreground-tertiary">未开始</span>
              <span className="inline-flex items-center gap-1 text-[13px] font-medium text-brand">
                进入课程
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
