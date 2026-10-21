"use client";

import { useReducer } from "react";
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

type Props = {
  skill: string;
  moduleSlug: string;
  moduleTitle: string;
  questions: Question[];
};

export default function QuizRunner({
  skill,
  moduleSlug,
  moduleTitle,
  questions,
}: Props) {
  const [state, dispatch] = useReducer(sessionReducer, questions, createSession);
  const result = summarize(state);
  const finished = state.phase === "finished";
  const question = currentQuestion(state);
  const record = currentRecord(state);

  return (
    <div className="w-full px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/s/${skill}/${moduleSlug}`}
          className="inline-flex min-h-9 items-center text-[12px] text-foreground-muted hover:text-brand"
        >
          ← 讲义
        </Link>
        <span className="truncate text-[12px] text-foreground-tertiary">
          {moduleSlug} · {moduleTitle}
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
          skill={skill}
          moduleSlug={moduleSlug}
          moduleTitle={moduleTitle}
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
