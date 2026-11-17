"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import SpeechBar from "@/components/lesson/SpeechBar";
import { getSkillIcon } from "@/content/icons";
import type { SkillIconName } from "@/content/registry";
import { cn } from "@/lib/utils";

type AudioModule = {
  slug: string;
  file: string;
  title: string;
  chapterNo: string;
  ready: boolean;
};

export type AudioCourse = {
  id: string;
  title: string;
  icon: SkillIconName;
  moduleCount: number;
  readyCount: number;
};

export default function AudioCourseList({
  courses,
}: {
  courses: AudioCourse[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modulesByCourse, setModulesByCourse] = useState<
    Record<string, AudioModule[]>
  >({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  async function toggle(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) {
      next.delete(id);
      setExpanded(next);
      return;
    }

    next.add(id);
    setExpanded(next);
    if (modulesByCourse[id] || loadingId === id) return;

    setLoadingId(id);
    setErrorId(null);
    try {
      const res = await fetch(`/api/audio/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { modules: AudioModule[] };
      setModulesByCourse((current) => ({ ...current, [id]: data.modules }));
    } catch {
      setErrorId(id);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="mt-6 space-y-3">
      {courses.map((course) => {
        const isOpen = expanded.has(course.id);
        const pending = course.readyCount < course.moduleCount;
        const modules = modulesByCourse[course.id];
        const Icon = getSkillIcon(course.icon);
        return (
          <section
            key={course.id}
            className="overflow-hidden rounded-lg border border-border bg-card shadow-card"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => void toggle(course.id)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-background-subtle"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" strokeWidth={1.7} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">
                  {course.title}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-foreground-tertiary">
                  <span className="rounded-full bg-background-subtle px-2 py-0.5 tabular">
                    {course.moduleCount} 章
                  </span>
                  <span className="rounded-full bg-background-subtle px-2 py-0.5 tabular">
                    已就绪 {course.readyCount}
                  </span>
                  {pending && (
                    <span className="rounded-full bg-warning-light px-2 py-0.5 text-warning">
                      生成中
                    </span>
                  )}
                </span>
              </span>
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle text-foreground-muted transition-all",
                  isOpen && "rotate-180 border-brand/35 bg-brand-soft text-brand",
                )}
              >
                <ChevronDown className="h-4 w-4" strokeWidth={1.8} />
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-border-subtle p-4">
                {loadingId === course.id && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-32 animate-pulse rounded-lg border border-border bg-background-subtle"
                      />
                    ))}
                  </div>
                )}
                {errorId === course.id && (
                  <p className="rounded-lg border border-warning/30 bg-warning-light px-4 py-3 text-[13px] text-warning">
                    章节加载失败，请重试。
                  </p>
                )}
                {modules && (
                  <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {modules.map((module) => (
                      <li
                        key={`${course.id}:${module.slug}`}
                        className="flex flex-col rounded-xl border border-border-subtle bg-card p-4 shadow-card transition-colors hover:border-brand/35"
                      >
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background-subtle font-mono text-xs text-brand-ink">
                            {module.chapterNo}
                          </span>
                          <Link
                            href={`/s/${course.id}/${module.slug}`}
                            className="min-w-0 flex-1 truncate text-[14.5px] font-medium leading-snug hover:text-brand"
                            title={module.title}
                          >
                            {module.title}
                          </Link>
                        </div>
                        <div className="mt-3 flex-1">
                          {module.ready ? (
                            <SpeechBar slug={module.file} compact />
                          ) : (
                            <p className="text-[12px] text-foreground-tertiary">
                              音频生成中
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
