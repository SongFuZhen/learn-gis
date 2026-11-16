"use client";

import Link from "next/link";
import { ArrowRight, Highlighter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SKILL_REGISTRY } from "@/content/registry";
import { chapterNo, getModules } from "@/lib/content";
import {
  fetchAllAnnotations,
  KIND_META,
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

type Group = {
  skillId: string;
  skillTitle: string;
  moduleSlug: string;
  moduleTitle: string;
  items: AnnotationItem[];
};

export default function AllAnnotations() {
  const [items, setItems] = useState<AnnotationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AnnotationKind | "all">("all");

  useEffect(() => {
    let alive = true;
    fetchAllAnnotations()
      .then((rows) => {
        if (alive) setItems(rows);
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

  const groups = useMemo<Group[]>(() => {
    const filtered =
      filter === "all" ? items : items.filter((it) => it.kind === filter);
    const map = new Map<string, Group>();

    for (const item of filtered) {
      const key = `${item.skill}:${item.moduleSlug}`;
      const existing = map.get(key);
      if (existing) {
        existing.items.push(item);
        continue;
      }
      const skill = SKILL_REGISTRY.find((s) => s.id === item.skill);
      const moduleMeta = getModules(item.skill).find(
        (m) => m.slug === item.moduleSlug,
      );
      map.set(key, {
        skillId: item.skill,
        skillTitle: skill?.title ?? item.skill,
        moduleSlug: item.moduleSlug,
        moduleTitle: moduleMeta?.title ?? "未知章节",
        items: [item],
      });
    }

    return SKILL_REGISTRY.flatMap((skill) => {
      const moduleOrder = getModules(skill.id);
      return moduleOrder
        .map((module) => map.get(`${skill.id}:${module.slug}`))
        .filter((group): group is Group => Boolean(group));
    });
  }, [filter, items]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-border bg-card"
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

  if (items.length === 0) {
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
          共 {filter === "all" ? items.length : groups.reduce((n, g) => n + g.items.length, 0)} 条
        </span>
      </div>

      <div className="mt-5 space-y-7">
        {groups.map((group) => (
          <section key={`${group.skillId}:${group.moduleSlug}`}>
            <div className="flex items-baseline justify-between gap-3 border-b border-border-subtle pb-2">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-foreground-muted">
                  {group.skillTitle}
                </p>
                <h2 className="mt-0.5 truncate text-[15px] font-medium">
                  第 {chapterNo(group.moduleSlug)} 章 · {group.moduleTitle}
                </h2>
              </div>
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
                    "rounded-r-md border-l-2 bg-card py-2.5 pl-3.5 pr-3",
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
                      {new Date(item.createdAt).toLocaleDateString("zh-CN")}
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
          </section>
        ))}
      </div>
    </>
  );
}
