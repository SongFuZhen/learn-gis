import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  ChevronRight,
  Headphones,
  Highlighter,
  LineChart,
  RotateCcw,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { SKILL_REGISTRY } from "@/content/registry";
import { TRACK_LABEL, type SkillTrack } from "@/content/types";
import { getSkillProgressMap, getSkillStats } from "@/lib/course-stats";
import CourseCard from "@/components/course/CourseCard";
import LearningPath from "@/components/course/LearningPath";

export const metadata: Metadata = {
  title: "学习",
  description: "课程目录、复习、进度、打卡、划线、音频与排行榜的学习中心。",
};

const TRACK_ORDER: SkillTrack[] = ["geospatial", "graphics", "platform"];

type HubLink = {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
};

const HUB_GROUPS: { title: string; links: HubLink[] }[] = [
  {
    title: "学习记录",
    links: [
      {
        href: "/review",
        label: "今日复习",
        desc: "按 SM-2 排期回到队列的错题",
        icon: RotateCcw,
      },
      {
        href: "/progress",
        label: "学习进度",
        desc: "各章掌握度与测验成绩",
        icon: LineChart,
      },
      {
        href: "/checkin",
        label: "打卡日历",
        desc: "连续打卡与每日学习热度",
        icon: CalendarCheck,
      },
      {
        href: "/annotations",
        label: "我的划线",
        desc: "备注、记录与疑问按课程汇总",
        icon: Highlighter,
      },
    ],
  },
  {
    title: "内容与激励",
    links: [
      {
        href: "/audio",
        label: "讲义音频",
        desc: "按课程折叠，展开后播放朗读",
        icon: Headphones,
      },
      {
        href: "/rank",
        label: "学习积分榜",
        desc: "答题、考试与打卡综合排名",
        icon: Trophy,
      },
    ],
  },
];

/** 课程目录：学习路径 + 按轨道分组的课程卡（封面/元信息/通关进度） */
export default async function LearnPage() {
  const [progressMap, totals] = await Promise.all([
    getSkillProgressMap(),
    Promise.all(
      SKILL_REGISTRY.map(async (r) => ({ id: r.id, stats: getSkillStats(r.id) })),
    ),
  ]);
  const statsById = new Map(totals.map((t) => [t.id, t.stats]));

  const totalChapters = totals.reduce((sum, t) => sum + t.stats.chapters, 0);
  const totalQuestions = totals.reduce((sum, t) => sum + t.stats.questions, 0);

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] sm:text-[32px] lg:text-[36px]">
          学习
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground-secondary sm:text-[15px]">
          复习、进度、打卡、划线、音频与课程目录都收在这里。当前共 {SKILL_REGISTRY.length} 门课 · {totalChapters} 章讲义 · {totalQuestions} 题题库。
        </p>
      </header>

      <section className="mt-6 rounded-lg border border-border bg-card p-4 shadow-card sm:p-5">
        <h2 className="text-[15px] font-medium">学习中心</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {HUB_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-[11px] uppercase tracking-wider text-foreground-muted">
                {group.title}
              </h3>
              <ul className="mt-2 space-y-2">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex min-h-11 items-center gap-3 rounded-md border border-border-subtle px-3 py-2.5 transition-colors hover:border-brand/35 hover:bg-background-subtle"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                          <Icon className="h-4 w-4" strokeWidth={1.7} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-medium">
                            {link.label}
                          </span>
                          <span className="mt-0.5 block truncate text-[12px] text-foreground-tertiary">
                            {link.desc}
                          </span>
                        </span>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-foreground-muted"
                          strokeWidth={1.7}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 text-[15px] font-medium">
          <span className="h-px w-5 bg-border-strong" aria-hidden="true" />
          学习路径
        </h2>
        <div className="mt-3">
          <LearningPath />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-[15px] font-medium">
          <span className="h-px w-5 bg-border-strong" aria-hidden="true" />
          课程目录
        </h2>

      {TRACK_ORDER.map((track) => {
        const registrations = SKILL_REGISTRY.filter((r) => r.track === track);
        if (registrations.length === 0) return null;
        return (
          <section key={track} className="mt-8">
            <h2 className="flex items-center gap-2 text-[15px] font-medium">
              <span className="h-px w-5 bg-border-strong" aria-hidden="true" />
              {TRACK_LABEL[track]}
            </h2>
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {registrations.map((reg) => (
                <li key={reg.id}>
                  <CourseCard
                    compact
                    registration={reg}
                    stats={statsById.get(reg.id) ?? { chapters: 0, questions: 0, audioChapters: 0 }}
                    progress={progressMap?.[reg.id] ?? null}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      </section>
    </div>
  );
}
