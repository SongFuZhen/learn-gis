"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { ALL_QUESTIONS } from "@/content/gis/all-questions";
import type { Question } from "@/lib/quiz/types";
import QuizRunner from "./quiz/QuizRunner";

type QueueItem = { questionId: string };

export default function ReviewQueue() {
  const [questions, setQuestions] = useState<Question[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/progress")
      .then((r) => r.json())
      .then((data: { wrongQueue?: QueueItem[] }) => {
        if (!active) return;
        const queue = data.wrongQueue ?? [];
        const qs = queue
          .map((item) => ALL_QUESTIONS.find((q) => q.id === item.questionId))
          .filter((q): q is Question => Boolean(q));
        setQuestions(qs);
      })
      .catch(() => {
        if (active) setQuestions([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (questions === null) {
    return <p className="mt-6 text-sm text-foreground-tertiary">加载中…</p>;
  }

  if (questions.length === 0) {
    return (
      <div className="mt-6 rounded-md border border-dashed border-border bg-card p-8 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-brand-soft text-brand">
          <RotateCcw className="h-6 w-6" strokeWidth={1.7} />
        </span>
        <p className="mt-3 text-[15px] font-medium">今天没有到期题</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-foreground-tertiary">
          错题会按 SM-2 排期回来：答对一次推到 1 天，再对推到 6 天，之后按 ease
          递增；答错则重置为明天，连续答对 3 次即毕业出队。去做一章测验，攒点复习材料吧。
        </p>
        <Link
          href="/s/gis/00/quiz"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-sm bg-brand-gradient px-5 text-sm font-medium text-white shadow-brand transition-opacity hover:opacity-95"
        >
          去做一章测验
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <QuizRunner
        reviewMode
        skill="gis"
        moduleSlug=""
        moduleTitle="今日复习"
        questions={questions}
        context="今日复习"
        eyebrow="复习结果"
        backHref="/review"
        backLabel="← 复习队列"
        passedHint="这批到期题已复习完，明天再回来巩固。"
        resultLinks={[
          { href: "/s/gis", label: "去刷题" },
          { href: "/progress", label: "查看进度" },
        ]}
      />
    </div>
  );
}
