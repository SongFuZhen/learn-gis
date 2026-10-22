import type { Metadata } from "next";
import QuizRunner from "@/components/quiz/QuizRunner";
import { ALL_QUESTIONS } from "@/content/gis/all-questions";
import {
  EXAM_PLAN,
  dailySeed,
  dateKey,
  mulberry32,
  pickExamQuestions,
} from "@/lib/quiz/exam";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "每日一考 · GIS",
  description: "每天一套随机卷：跨章节抽 10 题，答完立刻判卷并讲解错题。",
};

/** 每天一套：种子由日期决定，同一天刷新拿到同一份卷，第二天自动换 */
export default function DailyExamPage() {
  const questions = pickExamQuestions(
    ALL_QUESTIONS,
    EXAM_PLAN.daily.size,
    mulberry32(dailySeed(dateKey())),
  );

  return (
    <QuizRunner
      examMode="daily"
      skill="gis"
      moduleSlug=""
      moduleTitle={EXAM_PLAN.daily.label}
      questions={questions}
      backHref="/exam"
      backLabel="← 考试"
      context={`${EXAM_PLAN.daily.label} · ${questions.length} 题`}
      eyebrow="考试结果"
      passedHint="达到通过线（80%）——今天这一卷收工。"
      resultLinks={[
        { href: "/exam", label: "回到考试" },
        { href: "/s/gis", label: "章节列表" },
      ]}
    />
  );
}
