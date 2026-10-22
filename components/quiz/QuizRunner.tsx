"use client";

import { useEffect, useReducer } from "react";
import Link from "next/link";
import {
  createSession,
  currentQuestion,
  currentRecord,
  sessionReducer,
  summarize,
} from "@/lib/quiz/reducer";
import type { Question } from "@/lib/quiz/types";
import ProgressBar from "./ProgressBar";
import QuestionView from "./QuestionView";
import ResultSummary from "./ResultSummary";

type QuizResult = { correct: number; total: number; skill?: string; moduleSlug?: string };

/** 考试完成（每日一考/综合考试）：写考试记录 */
async function submitExamProgress(mode: "daily" | "mock", result: QuizResult) {
  const d = new Date();
  const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  try {
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "exam-complete",
        mode,
        ...result,
        dateKey: mode === "daily" ? dateKey : undefined,
      }),
    });
  } catch {
    // 静默失败，不干扰答题体验
  }
}

/** 章节测验完成：只更新该章掌握度，不记入考试记录 */
async function submitModuleQuizProgress(moduleSlug: string, result: QuizResult) {
  try {
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "module-quiz-complete",
        moduleSlug,
        correct: result.correct,
        total: result.total,
      }),
    });
  } catch {
    // 静默失败，不干扰答题体验
  }
}

type Props = {
  skill: string;
  moduleSlug: string;
  moduleTitle: string;
  questions: Question[];
  /** 顶部返回链接；默认回讲义，考试模式回 /exam */
  backHref?: string;
  backLabel?: string;
  /** 顶部右侧上下文（默认「00 · 标题」） */
  context?: string;
  /** 结果页小标题（默认「测验结果」，考试用「考试结果」） */
  eyebrow?: string;
  /** 结果页的通过提示（默认指向下一章） */
  passedHint?: string;
  /** 结果页底部链接（默认「章节列表」） */
  resultLinks?: { href: string; label: string }[];
  /** 考试模式：每日一考 / 综合考试；不传则为章节测验 */
  examMode?: "daily" | "mock";
};

export default function QuizRunner({
  skill,
  moduleSlug,
  moduleTitle,
  questions,
  backHref,
  backLabel = "← 讲义",
  context,
  eyebrow,
  passedHint,
  resultLinks,
  examMode,
}: Props) {
  const [state, dispatch] = useReducer(sessionReducer, questions, createSession);
  const result = summarize(state);
  const finished = state.phase === "finished";
  const question = currentQuestion(state);
  const record = currentRecord(state);

  // 完成时上报：考试卷写考试记录；章节测验只更新章节掌握度
  useEffect(() => {
    if (!finished) return;
    const payload = { correct: result.correct, total: result.answered, skill };
    if (examMode) {
      void submitExamProgress(examMode, payload);
    } else if (moduleSlug) {
      void submitModuleQuizProgress(moduleSlug, payload);
    }
  }, [finished, examMode, result.correct, result.answered, skill, moduleSlug]);

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] w-full flex-col px-4 py-5 sm:px-6 sm:py-8 lg:min-h-0 lg:px-8">
      <h1 className="sr-only">{moduleTitle}</h1>
      <div className="flex items-center justify-between gap-3">
        <Link
          href={backHref ?? `/s/${skill}/${moduleSlug}`}
          className="inline-flex min-h-9 items-center text-[12px] text-foreground-muted hover:text-brand"
        >
          {backLabel}
        </Link>
        <span className="truncate text-[12px] text-foreground-tertiary">
          {context ?? `${moduleSlug} · ${moduleTitle}`}
        </span>
      </div>

      <div className="mt-3">
        <ProgressBar
          current={finished ? state.questions.length : state.index + 1}
          total={state.questions.length}
          correct={result.correct}
        />
      </div>

      {finished ? (
        <ResultSummary
          result={result}
          questions={state.questions}
          title={moduleTitle}
          eyebrow={eyebrow}
          passedHint={passedHint}
          links={
            resultLinks ?? [
              { href: `/s/${skill}/${moduleSlug}`, label: "回到讲义" },
              { href: `/s/${skill}`, label: "章节列表" },
            ]
          }
          onRestart={() => dispatch({ type: "restart" })}
        />
      ) : (
        <QuestionView
          key={question.id}
          question={question}
          record={record}
          isLast={state.index === state.questions.length - 1}
          onSubmit={(response) => dispatch({ type: "submit", response })}
          onNext={() => dispatch({ type: "next" })}
        />
      )}
    </div>
  );
}
