import ReviewQueue from "@/components/ReviewQueue";

export const metadata = {
  title: "今日复习",
  description: "按 SM-2 排期的错题复习队列。",
};

export default function ReviewPage() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em] sm:text-[32px] lg:text-[36px]">
        今日复习
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-secondary sm:text-[15px]">
        做错的题会按 SM-2 排期回到这里：答对一次推到 1 天，再对推到 6 天，之后按
        ease 递增；答错则重置为明天。
      </p>
      <ReviewQueue />
    </div>
  );
}
