"use client";

import { cn } from "@/lib/utils";

type Props = {
  current: number;
  total: number;
  correct: number;
};

export default function ProgressBar({ current, total, correct }: Props) {
  const percent = total === 0 ? 0 : Math.round((current / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`进度 ${percent}%`}
      >
        <div
          className={cn("h-full rounded-full bg-accent transition-all duration-300")}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="shrink-0 text-xs tabular text-foreground-tertiary">
        {current} / {total}
        {correct > 0 ? ` · 对 ${correct}` : ""}
      </span>
    </div>
  );
}
