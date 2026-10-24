import Link from "next/link";
import { PASS_LINE } from "@/lib/quiz/exam";
import type { Question } from "@/lib/quiz/types";
import type { SessionResult } from "@/lib/quiz/reducer";

type Props = {
  result: SessionResult;
  questions: Question[];
  /** 结果页标题（章节名 / 「每日一考」等） */
  title: string;
  eyebrow?: string;
  /** 达到通过线时的提示语 */
  passedHint?: string;
  links: { href: string; label: string }[];
  onRestart: () => void;
};

const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ResultSummary({
  result,
  questions,
  title,
  eyebrow = "测验结果",
  passedHint = `达到掌握阈值（${PASS_LINE}%），可以进入下一章。`,
  links,
  onRestart,
}: Props) {
  const wrong = questions.filter((q) => result.wrongIds.includes(q.id));
  const passed = result.mastery >= PASS_LINE;
  const offset = CIRCUMFERENCE * (1 - result.mastery / 100);

  return (
    <section className="mt-4">
      <div className="rounded-md border border-border bg-card p-5 shadow-card sm:p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand-ink">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-[20px] font-semibold leading-snug tracking-tight sm:text-[24px]">
          {title}
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
                ? passedHint
                : `低于 ${PASS_LINE}%：建议重读讲义后重练，错题会进入复习队列。`}
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

      <div className="mt-5 flex gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="h-12 flex-1 rounded-sm bg-brand-gradient text-[15px] font-medium text-white shadow-brand transition-opacity hover:opacity-95 sm:h-10 sm:flex-none sm:px-5 sm:text-sm"
        >
          再练一遍
        </button>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex h-12 flex-1 items-center justify-center rounded-sm border border-border-strong bg-card px-4 text-[15px] font-medium transition-colors hover:bg-background-hover sm:h-10 sm:flex-none sm:text-sm"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
