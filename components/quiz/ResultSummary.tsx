import Link from "next/link";
import type { Question } from "@/lib/quiz/types";
import type { SessionResult } from "@/lib/quiz/reducer";

type Props = {
  result: SessionResult;
  questions: Question[];
  skill: string;
  moduleSlug: string;
  moduleTitle: string;
  onRestart: () => void;
};

const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ResultSummary({
  result,
  questions,
  skill,
  moduleSlug,
  moduleTitle,
  onRestart,
}: Props) {
  const wrong = questions.filter((q) => result.wrongIds.includes(q.id));
  const passed = result.mastery >= 80;
  const offset = CIRCUMFERENCE * (1 - result.mastery / 100);

  return (
    <section className="mt-4">
      <div className="rounded-md border border-border bg-card p-5 shadow-card sm:p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand-ink">
          测验结果
        </p>
        <h2 className="mt-2 text-[20px] font-semibold leading-snug tracking-tight sm:text-[24px]">
          {moduleTitle}
        </h2>

        <div className="mt-5 flex items-center gap-5">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
              <circle
                cx="40"
                cy="40"
                r={RADIUS}
                fill="none"
                stroke="hsl(var(--brand-soft))"
                strokeWidth="6"
              />
              <circle
                cx="40"
                cy="40"
                r={RADIUS}
                fill="none"
                stroke={passed ? "hsl(var(--success))" : "hsl(var(--brand-primary))"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={offset}
                className="transition-[stroke-dashoffset] duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold tabular">
              <span className="sr-only">掌握度 </span>
              {result.mastery}
              <span className="ml-0.5 text-[11px] font-normal text-foreground-tertiary">
                %
              </span>
            </span>
          </div>

          <div className="min-w-0">
            <p className="text-sm text-foreground-secondary">
              答对{" "}
              <span className="font-semibold text-foreground">{result.correct}</span>{" "}
              / {result.answered} 题
            </p>
            <p
              className={
                passed
                  ? "mt-1 text-[13px] leading-relaxed text-success"
                  : "mt-1 text-[13px] leading-relaxed text-warning"
              }
            >
              {passed
                ? "达到掌握阈值（80%），可以进入下一章。"
                : "低于 80%：建议重读讲义后重练，错题会进入复习队列。"}
            </p>
          </div>
        </div>
      </div>

      {wrong.length > 0 && (
        <div className="mt-4">
          <h3 className="text-[14px] font-semibold text-foreground-secondary">
            错题（{wrong.length}）
          </h3>
          <ul className="mt-2 flex flex-col gap-2">
            {wrong.map((question) => (
              <li
                key={question.id}
                className="rounded-md border border-border bg-card p-4 shadow-card"
              >
                <span className="font-mono text-[11px] text-foreground-muted">
                  {question.id}
                </span>
                <p className="mt-1 text-[14px] leading-relaxed text-foreground-secondary">
                  {question.stem}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-foreground-tertiary">
                  {question.explanation}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onRestart}
          className="h-12 rounded-sm bg-brand-gradient text-[15px] font-medium text-white shadow-brand transition-opacity hover:opacity-95 sm:h-10 sm:px-5 sm:text-sm"
        >
          再练一遍
        </button>
        <Link
          href={`/s/${skill}/${moduleSlug}`}
          className="flex h-12 items-center justify-center rounded-sm border border-border-strong bg-card px-4 text-[15px] font-medium transition-colors hover:bg-background-hover sm:h-10 sm:text-sm"
        >
          回到讲义
        </Link>
        <Link
          href={`/s/${skill}`}
          className="flex h-12 items-center justify-center rounded-sm border border-border-strong bg-card px-4 text-[15px] font-medium transition-colors hover:bg-background-hover sm:h-10 sm:text-sm"
        >
          章节列表
        </Link>
      </div>
    </section>
  );
}
