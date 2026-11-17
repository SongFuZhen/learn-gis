"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown, Highlighter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SKILL_REGISTRY } from "@/content/registry";
import { getSkillIcon } from "@/content/icons";
import { chapterNo, getModules } from "@/lib/content";
import {
  fetchAnnotationSummary,
  fetchSkillAnnotations,
  KIND_META,
  type AnnotationCourseSummary,
  type AnnotationItem,
} from "@/lib/annotations/store";
import type { AnnotationKind } from "@/lib/annotations/highlight";
import { cn } from "@/lib/utils";

const FILTERS: { value: AnnotationKind | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "note", label: "备注" },
  { value: "record", label: "记录" },
  { value: "question", label: "疑问" },
];

const BAR_CLASS: Record<AnnotationKind, string> = {
  note: "border-l-info",
  record: "border-l-brand",
  question: "border-l-warning",
};

type ModuleGroup = {
  skillId: string;
  moduleSlug: string;
  moduleTitle: string;
  items: AnnotationItem[];
};

function groupByModule(skillId: string, items: AnnotationItem[]): ModuleGroup[] {
  const map = new Map<string, ModuleGroup>();
  for (const item of items) {
    const existing = map.get(item.moduleSlug);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    const moduleMeta = getModules(skillId).find(
      (module) => module.slug === item.moduleSlug,
    );
    map.set(item.moduleSlug, {
      skillId,
      moduleSlug: item.moduleSlug,
      moduleTitle: moduleMeta?.title ?? "未知章节",
      items: [item],
    });
  }

  return getModules(skillId)
    .map((module) => map.get(module.slug))
    .filter((group): group is ModuleGroup => Boolean(group));
}

export default function AllAnnotations() {
  const [summaries, setSummaries] = useState<AnnotationCourseSummary[]>([]);
  const [itemsBySkill, setItemsBySkill] = useState<Record<string, AnnotationItem[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [courseErrorId, setCourseErrorId] = useState<string | null>(null);
  const [filter, setFilter] = useState<AnnotationKind | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    fetchAnnotationSummary()
      .then((rows) => {
        if (alive) setSummaries(rows);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const courses = useMemo(
    () =>
      SKILL_REGISTRY.flatMap((skill) => {
        const summary = summaries.find((item) => item.skill === skill.id);
        if (!summary) return [];
        const count =
          filter === "all" ? summary.total : summary.counts[filter] ?? 0;
        return count > 0 ? [{ skill, summary }] : [];
      }),
    [filter, summaries],
  );

  const totalCount = summaries.reduce((total, item) => total + item.total, 0);
  const filteredCount = summaries.reduce(
    (total, item) =>
      total + (filter === "all" ? item.total : item.counts[filter] ?? 0),
    0,
  );

  async function toggleCourse(skillId: string) {
    const next = new Set(expanded);
    if (next.has(skillId)) {
      next.delete(skillId);
      setExpanded(next);
      return;
    }

    next.add(skillId);
    setExpanded(next);
    if (itemsBySkill[skillId] || loadingId === skillId) return;

    setLoadingId(skillId);
    setCourseErrorId(null);
    try {
      const rows = await fetchSkillAnnotations(skillId);
      setItemsBySkill((current) => ({ ...current, [skillId]: rows }));
    } catch {
      setCourseErrorId(skillId);
    } finally {
      setLoadingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-warning/30 bg-warning-light px-4 py-3 text-[13px] text-warning">
        划线加载失败：{error}
      </p>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
        <Highlighter
          className="mx-auto h-7 w-7 text-foreground-disabled"
          strokeWidth={1.5}
        />
        <p className="mt-3 text-[14px] font-medium">还没有划线</p>
        <p className="mt-1 text-[12.5px] text-foreground-tertiary">
          打开任意讲义，选中文字即可添加备注、记录或疑问。
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              "h-8 rounded-full border px-3 text-[12.5px] transition-colors",
              filter === option.value
                ? "border-brand/40 bg-brand-soft text-brand-ink"
                : "border-border bg-card text-foreground-secondary hover:bg-background-subtle",
            )}
          >
            {option.label}
          </button>
        ))}
        <span className="ml-auto text-[12px] text-foreground-tertiary">
          共 {filteredCount} 条
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {courses.map(({ skill, summary }) => {
          const isOpen = expanded.has(skill.id);
          const Icon = getSkillIcon(skill.icon);
          const rawItems = itemsBySkill[skill.id] ?? [];
          const visibleItems =
            filter === "all"
              ? rawItems
              : rawItems.filter((item) => item.kind === filter);
          const modules = groupByModule(skill.id, visibleItems);
          return (
            <section
              key={skill.id}
              className="overflow-hidden rounded-lg border border-border bg-card shadow-card"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => void toggleCourse(skill.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-background-subtle"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">
                    {skill.title}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] text-foreground-tertiary">
                    <span className="rounded-full bg-background-subtle px-2 py-0.5 tabular">
                      {summary.moduleCount} 章
                    </span>
                    <span className="rounded-full bg-background-subtle px-2 py-0.5 tabular">
                      {filter === "all"
                        ? summary.total
                        : summary.counts[filter] ?? 0}{" "}
                      条
                    </span>
                    <span className="rounded-full bg-info-light px-2 py-0.5 tabular">
                      备注 {summary.counts.note}
                    </span>
                    <span className="rounded-full bg-brand-soft px-2 py-0.5 tabular">
                      记录 {summary.counts.record}
                    </span>
                    <span className="rounded-full bg-warning-light px-2 py-0.5 tabular">
                      疑问 {summary.counts.question}
                    </span>
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
                <div className="border-t border-border-subtle px-5 py-5">
                  {loadingId === skill.id && (
                    <div className="space-y-3">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-20 animate-pulse rounded-md bg-background-subtle"
                        />
                      ))}
                    </div>
                  )}
                  {courseErrorId === skill.id && (
                    <p className="rounded-lg border border-warning/30 bg-warning-light px-4 py-3 text-[13px] text-warning">
                      课程划线加载失败，请重试。
                    </p>
                  )}
                  {!loadingId && courseErrorId !== skill.id && (
                    <div className="space-y-3">
                      {modules.map((group) => (
                        <div
                          key={`${group.skillId}:${group.moduleSlug}`}
                          className="rounded-xl border border-border-subtle bg-background-subtle/40 p-4"
                        >
                          <div className="flex items-baseline justify-between gap-3 border-b border-border-subtle pb-2.5">
                            <h2 className="min-w-0 truncate text-[14px] font-medium">
                              第 {chapterNo(group.moduleSlug)} 章 ·{" "}
                              {group.moduleTitle}
                            </h2>
                            <Link
                              href={`/s/${group.skillId}/${group.moduleSlug}`}
                              className="group inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-brand hover:underline"
                            >
                              回到讲义
                              <ArrowRight
                                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                                strokeWidth={2}
                              />
                            </Link>
                          </div>

                          <ul className="mt-3 space-y-2.5">
                            {group.items.map((item) => (
                              <li
                                key={item.id}
                                className={cn(
                                  "rounded-r-md border-l-2 bg-card py-2.5 pl-3.5 pr-3 shadow-card",
                                  BAR_CLASS[item.kind],
                                )}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={cn(
                                      "h-1.5 w-1.5 rounded-full",
                                      KIND_META[item.kind].dot,
                                    )}
                                  />
                                  <span className="text-[11px] text-foreground-muted">
                                    {KIND_META[item.kind].label}
                                  </span>
                                  <span className="ml-auto text-[11px] text-foreground-disabled">
                                    {new Date(
                                      item.createdAt,
                                    ).toLocaleDateString("zh-CN")}
                                  </span>
                                </div>
                                <p className="mt-1 text-[13.5px] leading-relaxed text-foreground">
                                  {item.quote}
                                </p>
                                {item.note && (
                                  <p className="mt-1.5 rounded-sm bg-background-subtle px-2.5 py-1.5 text-[12.5px] leading-relaxed text-foreground-secondary">
                                    {item.note}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
