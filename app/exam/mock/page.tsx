import type { Metadata } from "next";
import QuizRunner from "@/components/quiz/QuizRunner";
import { ALL_QUESTIONS } from "@/content/gis/all-questions";
import {
  EXAM_PLAN,
  PASS_LINE,
  mulberry32,
  pickExamQuestions,
  randomSeed,
} from "@/lib/quiz/exam";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "综合考试 · GIS",
  description: "跨全部章节随机抽 25 题，每次开考都是新卷。",
};

/** 每次请求都用随机种子重新组卷 */
export default function MockExamPage() {
  const questions = pickExamQuestions(
    ALL_QUESTIONS,
    EXAM_PLAN.mock.size,
    mulberry32(randomSeed()),
  );

  return (
    <QuizRunner
      examMode="mock"
      skill="gis"
      moduleSlug=""
      moduleTitle={EXAM_PLAN.mock.label}
      questions={questions}
      backHref="/exam"
      backLabel="← 考试"
      context={`${EXAM_PLAN.mock.label} · ${questions.length} 题`}
      eyebrow="考试结果"
      passedHint={`达到通过线（${PASS_LINE}%）——整体掌握得不错。`}
      resultLinks={[{ href: "/s/gis", label: "章节列表" }]}
    />
  );
}
