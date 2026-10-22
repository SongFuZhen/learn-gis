"use client";

import { cn } from "@/lib/utils";
import type { ChoiceQuestion } from "@/lib/quiz/types";
import { Check, X } from "lucide-react";

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
    <div role="group" aria-label="选项">
      <ul className="mt-4 flex flex-col gap-2">
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
                  "flex min-h-[3rem] w-full items-start gap-3 rounded-sm border bg-card px-3.5 py-3 text-left text-[15px] leading-relaxed transition-colors",
                  "border-border",
                  !disabled && "hover:border-brand/50 hover:bg-background-subtle active:bg-background-hover",
                  active && !revealed && "border-brand bg-brand-soft",
                  isRightAnswer && "border-success/45 bg-success-light",
                  isWrongPick && "border-destructive/45 bg-destructive-light",
                  disabled && "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border text-xs font-semibold",
                    active && !revealed
                      ? "border-brand bg-brand text-white"
                      : "border-border-strong text-foreground-tertiary",
                    isRightAnswer && "border-success bg-success text-white",
                    isWrongPick && "border-destructive bg-destructive text-white",
                  )}
                >
                  {option.key}
                </span>
                <span className="flex-1">{option.text}</span>
                {isRightAnswer && (
                  <Check
                    className="mt-1 h-4 w-4 shrink-0 text-success"
                    strokeWidth={2.2}
                    aria-label="正确答案"
                  />
                )}
                {isWrongPick && (
                  <X
                    className="mt-1 h-4 w-4 shrink-0 text-destructive"
                    strokeWidth={2.2}
                    aria-label="你选的错误项"
                  />
                )}
                <span className="mt-0.5 hidden shrink-0 text-[11px] tabular text-foreground-disabled sm:inline">
                  {i + 1}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
