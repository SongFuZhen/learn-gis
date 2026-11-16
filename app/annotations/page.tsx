import type { Metadata } from "next";
import AllAnnotations from "@/components/lesson/annotations/AllAnnotations";

export const metadata: Metadata = {
  title: "我的划线",
  description: "按课程与章节汇总全部划线、类型与附言。",
};

export default function AnnotationsPage() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
          我的划线
        </h1>
        <p className="mt-1.5 text-[13px] text-foreground-tertiary">
          按课程与章节汇总，点击「回到讲义」可定位到对应章节继续阅读。
        </p>
        <div className="mt-6">
          <AllAnnotations />
        </div>
      </div>
    </div>
  );
}
