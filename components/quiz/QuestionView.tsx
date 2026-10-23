"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { grade } from "@/lib/quiz/grade";
import type { AnswerRecord, Question, QuizResponse } from "@/lib/quiz/types";
import ChoiceList from "./ChoiceList";
import AnswerFeedback from "./AnswerFeedback";
import { Check, X } from "lucide-react";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

type Props = {
  question: Question;
  record: AnswerRecord | null;
  isLast: boolean;
  reviewMode?: boolean;
  onSubmit: (response: QuizResponse) => void;
  onNext: () => void;
};

export default function QuestionView({
  question,
  record,
  isLast,
  reviewMode,
  onSubmit,
  onNext,
}: Props) {
  const answered = record !== null;
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [numericText, setNumericText] = useState("");
  const [boolAnswer, setBoolAnswer] = useState<boolean | null>(
    record && record.response.kind === "boolean" ? record.response.value : null,
  );
  const [mapPoint, setMapPoint] = useState<{ lat: number; lng: number } | null>(
    record && record.response.kind === "map"
      ? { lat: record.response.lat, lng: record.response.lng }
      : null,
  );

  const result = record ? grade(question, record.response) : null;
  const numericValue = Number(numericText);
  const canSubmit =
    question.type === "map"
      ? mapPoint !== null
      : question.type === "short"
        ? text.trim().length > 0
        : question.type === "numeric"
          ? numericText.trim() !== "" && Number.isFinite(numericValue)
          : question.type === "truefalse"
            ? boolAnswer !== null
            : selected.length > 0;

  // 提交答案后，异步记录答题结果到后端进度（复习模式推进 SM-2，否则喂复习队列）
  useEffect(() => {
    async function doSubmit() {
      if (!record || !result) return;
      const body = reviewMode
        ? {
            type: "review-answer",
            questionId: question.id,
            isCorrect: result.correct,
          }
        : {
            type: "submit-answer",
            skill: question.skill,
            moduleSlug: question.module,
            questionId: question.id,
            isCorrect: result.correct,
          };
      try {
        await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch {
        /* 静默失败，不影响用户体验 */
      }
    }
    doSubmit();
  }, [record, result, question, reviewMode]);

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
    if (question.type === "map") {
      if (!mapPoint) return;
      onSubmit({ kind: "map", lat: mapPoint.lat, lng: mapPoint.lng });
      return;
    }
    if (question.type === "short") {
      onSubmit({ kind: "short", text });
      return;
    }
    if (question.type === "numeric") {
      onSubmit({ kind: "numeric", value: numericValue });
      return;
    }
    if (question.type === "truefalse") {
      if (boolAnswer === null) return;
      onSubmit({ kind: "boolean", value: boolAnswer });
      return;
    }
    onSubmit({ kind: "choice", selected });
  }, [
    answered,
    canSubmit,
    onSubmit,
    question.type,
    mapPoint,
    text,
    selected,
    numericValue,
    boolAnswer,
  ]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement;

      if (event.key === "Enter") {
        event.preventDefault();
        if (answered) onNext();
        else submit();
        return;
      }

      if (
        typing ||
        answered ||
        question.type === "short" ||
        question.type === "map" ||
        question.type === "numeric" ||
        question.type === "truefalse"
      )
        return;
      const index = Number.parseInt(event.key, 10);
      if (
        !Number.isNaN(index) &&
        index >= 1 &&
        index <= question.options.length
      ) {
        const option = question.options[index - 1];
        if (option) toggle(option.key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answered, onNext, question, submit, toggle]);

  const selectedKeys =
    record && record.response.kind === "choice"
      ? record.response.selected
      : selected;

  return (
    <div className="flex flex-1 flex-col">
      <section className="mt-4 rounded-md border border-border bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-foreground-tertiary">
          <span className="rounded-sm bg-surface-muted px-1.5 py-0.5 font-mono text-foreground-tertiary">
            {question.id}
          </span>
          <span
            className="text-brand-violet"
            aria-label={"难度 " + question.difficulty + " 星"}
          >
            {"★".repeat(question.difficulty)}
            <span className="text-foreground-disabled">
              {"★".repeat(3 - question.difficulty)}
            </span>
          </span>
          <span>
            {question.type === "multi"
              ? "多选 · 全对才算对"
              : question.type === "map"
                ? "地图题 · 点击地图作答"
                : question.type === "short"
                  ? "短答"
                  : question.type === "numeric"
                    ? "计算题 · 填数值"
                    : question.type === "truefalse"
                      ? "判断题"
                      : "单选"}
          </span>
        </div>

        <h2 className="mt-3 text-[17px] font-semibold leading-relaxed tracking-[-0.01em] sm:text-[19px]">
          {question.stem}
        </h2>

        {question.type === "map" ? (
          <div className="mt-4">
            <MapPicker
              center={[question.target.lat, question.target.lng]}
              selected={mapPoint}
              onPick={setMapPoint}
              disabled={answered}
            />
            {mapPoint && (
              <p className="mt-2 text-[12px] tabular text-foreground-muted">
                已选：{mapPoint.lat.toFixed(2)}°, {mapPoint.lng.toFixed(2)}°
              </p>
            )}
          </div>
        ) : question.type === "short" ? (
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
              className="h-12 w-full rounded-sm border border-border bg-card px-3.5 text-base outline-none transition-colors placeholder:text-foreground-disabled focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-70"
            />
          </div>
        ) : question.type === "numeric" ? (
          <div className="mt-4 flex items-center gap-2">
            <label htmlFor="numeric-answer" className="sr-only">
              作答
            </label>
            <input
              id="numeric-answer"
              type="text"
              inputMode="decimal"
              value={numericText}
              disabled={answered}
              onChange={(e) => setNumericText(e.target.value)}
              placeholder={question.placeholder ?? "输入数值"}
              autoComplete="off"
              enterKeyHint="done"
              className="h-12 w-full rounded-sm border border-border bg-card px-3.5 text-base tabular outline-none transition-colors placeholder:text-foreground-disabled focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-70"
            />
            {question.unit && (
              <span className="shrink-0 text-[14px] text-foreground-secondary">
                {question.unit}
              </span>
            )}
          </div>
        ) : question.type === "truefalse" ? (
          <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="判断">
            {[
              { value: true, label: "对" },
              { value: false, label: "错" },
            ].map(({ value, label }) => {
              const active = boolAnswer === value;
              const isRight = answered && question.answer === value;
              const isWrongPick = answered && active && !isRight;
              return (
                <button
                  key={label}
                  type="button"
                  disabled={answered}
                  aria-pressed={active}
                  onClick={() => setBoolAnswer(value)}
                  className={cn(
                    "flex h-12 items-center justify-center gap-2 rounded-sm border bg-card text-[15px] font-medium transition-colors",
                    "border-border",
                    !answered && "hover:border-brand/50 hover:bg-background-subtle",
                    active && !answered && "border-brand bg-brand-soft text-brand",
                    isRight && "border-success/45 bg-success-light text-success",
                    isWrongPick && "border-destructive/45 bg-destructive-light text-destructive",
                    answered && "cursor-default",
                  )}
                >
                  {label}
                  {isRight && <Check className="h-4 w-4" strokeWidth={2.2} aria-label="正确答案" />}
                  {isWrongPick && <X className="h-4 w-4" strokeWidth={2.2} aria-label="你选的错误项" />}
                </button>
              );
            })}
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
      <div className="sticky bottom-0 z-30 mt-auto -mx-4 border-t border-border bg-background/90 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:mt-5 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
        <div className="flex items-center gap-3">
          <p className="hidden flex-1 text-[12px] text-foreground-muted sm:block">
            {answered
              ? "按 Enter 继续"
              : question.type === "map"
                ? "点击地图选点，Enter 提交"
                : question.type === "short" || question.type === "numeric"
                  ? "输入后按 Enter 提交"
                  : question.type === "truefalse"
                    ? "选择对或错，Enter 提交"
                    : "数字键选择，Enter 提交"}
          </p>
          {answered ? (
            <button
              type="button"
              onClick={onNext}
              className="h-12 w-full rounded-sm bg-brand-gradient text-[15px] font-medium text-white shadow-brand transition-opacity hover:opacity-95 sm:w-auto sm:px-5"
            >
              {isLast ? "查看结果" : "下一题"}
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="h-12 w-full rounded-sm bg-brand-gradient text-[15px] font-medium text-white shadow-brand transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:w-auto sm:px-5"
            >
              提交答案
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
