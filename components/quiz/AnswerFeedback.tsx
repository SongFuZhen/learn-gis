import { missedPicks, wrongPicks } from "@/lib/quiz/grade";
import type { Question, QuizResponse } from "@/lib/quiz/types";
import { cn } from "@/lib/utils";

type Props = {
  question: Question;
  response: QuizResponse;
  correct: boolean;
  expected: string[];
};

/**
 * 答错先讲“为什么错”：逐条列出被选中的干扰项及其 hint，
 * 再给完整解析与权威引用。答对也展示解析，强化正确路径。
 */
export default function AnswerFeedback({
  question,
  response,
  correct,
  expected,
}: Props) {
  const wrong = wrongPicks(question, response);
  const missed = missedPicks(question, response);
  const expectedText = expected.join(" / ");

  return (
    <div
      className={cn(
        "mt-4 rounded-lg border p-4",
        correct
          ? "border-success/35 bg-success-light"
          : "border-destructive/35 bg-destructive-light",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white",
            correct ? "bg-success" : "bg-destructive",
          )}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="h-3 w-3"
          >
            {correct ? <path d="m5 12.5 4.5 4.5L19 7" /> : <path d="M6 6l12 12M18 6 6 18" />}
          </svg>
        </span>
        <p
          className={cn(
            "text-sm font-semibold",
            correct ? "text-success" : "text-destructive",
          )}
        >
          {correct ? "答对了" : "答错了"}
        </p>
        {!correct && (
          <p className="ml-auto text-xs text-foreground-secondary">
            {question.type === "short" ? "参考答案" : "正确答案"}{" "}
            <span className="font-mono text-foreground">{expectedText}</span>
          </p>
        )}
      </div>

      {wrong.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2 rounded-md border-l-2 border-destructive/40 bg-background/40 py-2 pl-3 pr-2">
          {wrong.map((option) => (
            <li key={option.key} className="text-[13px] leading-relaxed">
              <span className="font-mono text-xs text-destructive">{option.key}</span>{" "}
              <span className="text-foreground-secondary">
                {option.hint ?? "这一项不满足题意。"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {missed.length > 0 && question.type === "multi" && (
        <p className="mt-3 text-[13px] text-foreground-secondary">
          漏选：
          <span className="text-foreground">
            {missed.map((o) => `${o.key}（${o.text}）`).join("、")}
          </span>
        </p>
      )}

      <div className="mt-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-foreground-tertiary">
          解析
        </p>
        <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">
          {question.explanation}
        </p>
      </div>

      {question.refs.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-foreground-tertiary">
          <span>参考</span>
          {question.refs.map((ref) => (
            <a
              key={ref.url}
              href={ref.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-info underline underline-offset-2"
            >
              {ref.title}
            </a>
          ))}
        </p>
      )}
    </div>
  );
}
