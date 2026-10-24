import ProgressPanel from "@/components/ProgressPanel";
import { PASS_LINE } from "@/lib/quiz/exam";

export const metadata = {
  title: "学习进度",
  description: "各章节掌握度与完成情况。",
};

export default function ProgressPage() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em] sm:text-[32px] lg:text-[36px]">
        学习进度
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-secondary sm:text-[15px]">
        每章取测验成绩的平均分作为掌握度，低于 {PASS_LINE}% 建议重读讲义后重练。
      </p>
      <ProgressPanel />
    </div>
  );
}
