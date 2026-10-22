"use client";

import { useEffect, useState } from "react";
import { GIS_MODULES, PLANNED_MODULES } from "@/content/gis/modules";

type Row = {
  moduleSlug: string;
  mastery: number;
  quizCount: number;
  totalAttempts: number;
  wrongCount: number;
};

export default function ProgressPanel() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/progress")
      .then((r) => r.json())
      .then((d: { progress?: Row[] }) => {
        if (active) setRows(d.progress ?? []);
      })
      .catch(() => {
        if (active) setRows([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (rows === null) {
    return <p className="mt-6 text-sm text-foreground-tertiary">加载中…</p>;
  }

  return (
    <>
      <ul className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {GIS_MODULES.map((m) => {
          const row = rows.find((r) => r.moduleSlug === m.slug);
          const mastery = Math.round(row ? row.mastery : 0);
          return (
            <li
              key={m.slug}
              className="rounded-md border border-border bg-card p-5 shadow-card"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[15px] font-medium">{m.title}</span>
                <span className="text-[11px] tabular text-foreground-tertiary">
                  {row ? mastery + "%" : "尚未测验"}
                </span>
              </div>
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-soft"
                role="img"
                aria-label={"掌握度 " + mastery + "%"}
              >
                <div
                  className="h-full rounded-full bg-brand-gradient"
                  style={{ width: mastery + "%" }}
                />
              </div>
              {row && (
                <p className="mt-2 text-[11px] text-foreground-tertiary">
                  测验 {row.quizCount} 次 · 累计 {row.totalAttempts} 答 · 错{" "}
                  {row.wrongCount}
                </p>
              )}
            </li>
          );
        })}
        {PLANNED_MODULES.map((m) => (
          <li
            key={m.slug}
            className="flex items-center gap-3 rounded-md border border-dashed border-border px-4 py-3 text-[13px] text-foreground-tertiary"
          >
            <span className="font-mono text-[11px] text-foreground-muted">
              {m.slug}
            </span>
            {m.title}
            <span className="ml-auto text-[11px]">即将上线</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] leading-relaxed text-foreground-tertiary">
        掌握度取各章测验成绩的滚动平均；低于 80% 建议重读讲义后重练。
      </p>
    </>
  );
}
