import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { SkillRegistration } from "@/content/registry";
import type { SkillStats } from "@/lib/course-stats";
import CourseCover from "@/components/course/CourseCover";

/**
 * 首页课程轨道：移动端横向滑动、桌面端五列整行。
 * 紧凑卡只保留封面 + 标题 + 题量 meta，完整目录在 /learn。
 */
export default function CourseRail({
  items,
}: {
  items: { registration: SkillRegistration; stats: SkillStats }[];
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-medium">课程</h2>
        <Link
          href="/learn"
          className="inline-flex min-h-8 items-center gap-1 text-[12px] text-foreground-muted transition-colors hover:text-brand"
        >
          查看全部
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </Link>
      </div>

      <ul className="mt-3 flex snap-x gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
        {items.map(({ registration, stats }) => (
          <li key={registration.id} className="w-40 shrink-0 snap-start sm:w-52 lg:w-auto">
            <Link
              href={`/s/${registration.id}`}
              className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-colors hover:border-brand/40"
            >
              <CourseCover
                skillId={registration.id}
                icon={registration.icon}
                size="card"
              />
              <div className="flex flex-1 flex-col p-3.5">
                <h3 className="line-clamp-2 text-[14px] font-medium leading-snug group-hover:text-brand">
                  {registration.title}
                </h3>
                <p className="mt-1.5 text-[12px] tabular text-foreground-tertiary">
                  {stats.chapters} 章 · {stats.questions} 题
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
