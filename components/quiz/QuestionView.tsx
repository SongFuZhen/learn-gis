"use client";

import { useCallback, useEffect, useState } from "react";
import { grade } from "@/lib/quiz/grade";
import type { AnswerRecord, Question, QuizResponse } from "@/lib/quiz/types";
import ChoiceList from "./ChoiceList";
import AnswerFeedback from "./AnswerFeedback";

type Props = {
  question: Question;
  record: AnswerRecord | null;
  isLast: boolean;
  onSubmit: (response: QuizResponse) => void;
  onNext: () => void;
};

export default function QuestionView({
  question,
  record,
  isLast,
  onSubmit,
  onNext,
}: Props) {
  const answered = record !== null;
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState("");

  const result = record ? grade(question, record.response) : null;
  const canSubmit =
    question.type === "short" ? text.trim().length > 0 : selected.length > 0;

  const toggle = useCallback(
    (key: string) => {
      if (answered) return;
      setSelected((prev) => {
        if (question.type === "multi") {
          return prev.includes(key)
            ? prev.filter((k) => k !== key)
            : [...prev, key];
        }
        return [key];
      });
    },
    [answered, question.type],
  );

  const submit = useCallback(() => {
    if (answered || !canSubmit) return;
    if (question.type === "short") {
      onSubmit({ kind: "short", text });
      return;
    }
    onSubmit({ kind: "choice", selected });
  }, [answered, canSubmit, onSubmit, question.type, selected, text]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

      if (event.key === "Enter") {
        event.preventDefault();
        if (answered) onNext();
        else submit();
        return;
      }

      if (typing || answered || question.type === "short") return;
      const index = Number.parseInt(event.key, 10);
      if (!Number.isNaN(index) && index >= 1 && index <= question.options.length) {
        const option = question.options[index - 1];
        if (option) toggle(option.key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answered, onNext, question, submit, toggle]);

  const selectedKeys =
    record && record.response.kind === "choice" ? record.response.selected : selected;

  return (
    <div>
      <section className="mt-4 rounded-xl border border-border bg-surface p-4 shadow-[0_1px_2px_hsl(var(--foreground)/0.04)] sm:p-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-foreground-tertiary">
          <span className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-foreground-tertiary">
            {question.id}
          </span>
          <span className="text-accent" aria-label={`难度 ${question.difficulty} 星`}>
            {"★".repeat(question.difficulty)}
            <span className="text-foreground-disabled">
              {"★".repeat(3 - question.difficulty)}
            </span>
          </span>
          <span>
            {question.type === "multi"
              ? "多选 · 全对才算对"
              : question.type === "short"
                ? "短答"
                : "单选"}
          </span>
        </div>

        <h2 className="mt-3 text-[17px] font-semibold leading-relaxed sm:text-lg">
          {question.stem}
        </h2>

        {question.type === "short" ? (
          <div className="mt-4">
            <label htmlFor="short-answer" className="sr-only">
              作答
            </label>
            <input
              id="short-answer"
              type="text"
              value={text}
              disabled={answered}
              onChange={(e) => setText(e.target.value)}
              placeholder={question.placeholder ?? "输入你的答案"}
              autoComplete="off"
              enterKeyHint="done"
              className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base outline-none transition-colors focus:border-accent disabled:opacity-70"
            />
          </div>
        ) : (
          <ChoiceList
            question={question}
            selected={selectedKeys}
            disabled={answered}
            revealed={answered}
            onToggle={toggle}
          />
        )}

        {result && record ? (
          <AnswerFeedback
            question={question}
            response={record.response}
            correct={result.correct}
            expected={result.expected}
          />
        ) : null}
      </section>

      {/* 移动端：提交/下一题固定在视口底部，拇指可达 */}
      <div className="sticky bottom-0 z-30 mt-4 -mx-4 border-t border-border bg-background/92 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mt-5 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <div className="flex items-center gap-3">
          <p className="hidden flex-1 text-xs text-foreground-muted sm:block">
            {answered
              ? "按 Enter 继续"
              : question.type === "short"
                ? "输入后按 Enter 提交"
                : "数字键选择，Enter 提交"}
          </p>
          {answered ? (
            <button
              type="button"
              onClick={onNext}
              className="h-12 w-full rounded-lg bg-accent text-[15px] font-medium text-accent-foreground transition-colors hover:bg-accent-hover sm:w-auto sm:px-5"
            >
              {isLast ? "查看结果" : "下一题"}
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="h-12 w-full rounded-lg bg-accent text-[15px] font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:px-5"
            >
              提交答案
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
