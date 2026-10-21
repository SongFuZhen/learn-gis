"use client";

import { cn } from "@/lib/utils";
import type { ChoiceQuestion } from "@/lib/quiz/types";

type Props = {
  question: ChoiceQuestion;
  selected: string[];
  disabled: boolean;
  /** 已揭晓：正确项标绿，错选项标红 */
  revealed?: boolean;
  onToggle: (key: string) => void;
};

export default function ChoiceList({
  question,
  selected,
  disabled,
  revealed = false,
  onToggle,
}: Props) {
  return (
    <ul className="mt-4 flex flex-col gap-2" role="group">
      {question.options.map((option, i) => {
        const active = selected.includes(option.key);
        const isAnswer = question.answer.includes(option.key);
        const isWrongPick = revealed && active && !isAnswer;
        const isRightAnswer = revealed && isAnswer;

        return (
          <li key={option.key}>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onToggle(option.key)}
              className={cn(
                "flex w-full min-h-[3rem] items-start gap-3 rounded-lg border px-3 py-3 text-left text-[15px] leading-relaxed transition-colors",
                "border-border bg-surface",
                !disabled && "hover:border-border-strong hover:bg-surface-hover active:bg-surface-muted",
                active && !revealed && "border-accent bg-accent/10",
                isRightAnswer && "border-success/50 bg-success-light",
                isWrongPick && "border-destructive/50 bg-destructive-light",
                disabled && "cursor-default",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-mono",
                  active && !revealed
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border-strong text-foreground-tertiary",
                  isRightAnswer && "border-success bg-success text-white",
                  isWrongPick && "border-destructive bg-destructive text-white",
                )}
              >
                {option.key}
              </span>
              <span className="flex-1">{option.text}</span>
              {isRightAnswer && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="mt-0.5 h-4 w-4 shrink-0 text-success"
                  aria-label="正确答案"
                >
                  <path d="m5 12.5 4.5 4.5L19 7" />
                </svg>
              )}
              {isWrongPick && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                  aria-label="你选的错误项"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              )}
              <span className="mt-0.5 hidden shrink-0 text-[11px] tabular text-foreground-muted sm:inline">
                {i + 1}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
