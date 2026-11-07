import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CircleCheck,
  Globe,
  Map,
  Play,
  RotateCcw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SKILL_REGISTRY } from "@/content/registry";
import { SKILLS, chapterNo, getModules, getQuestionFile } from "@/lib/content";
import { PASS_LINE } from "@/lib/quiz/exam";
import { getHomeData } from "@/lib/progress/home";
import MasteryDonut from "@/components/home/MasteryDonut";
import ExamBars from "@/components/home/ExamBars";
import QuestionMix from "@/components/home/QuestionMix";

export default async function HomePage() {
  const data = await getHomeData();
  return data ? <Dashboard data={data} /> : <Intro />;
}

/** 课程展示图标（与 /learn 中转页一致；新增技能补一行） */
const SKILL_ICONS: Record<string, LucideIcon> = {
  gis: Map,
  cesium: Globe,
};

/** 每门课的章节/题量统计 */
function skillStat(id: string) {
  const modules = getModules(id);
  const questions = modules.reduce(
    (acc, m) => acc + getQuestionFile(id, m.slug).questions.length,
    0,
  );
  return { chapters: modules.length, questions };
}

/** 新访客版：介绍 + 课程卡 + 题库统计 + 快捷入口 */
function Intro() {
  const chapterCount = SKILLS.reduce(
    (sum, s) => sum + getModules(s.id).length,
    0,
  );
  const questionCount = SKILLS.reduce(
    (sum, s) =>
      sum +
      getModules(s.id).reduce(
        (acc, m) => acc + getQuestionFile(s.id, m.slug).questions.length,
        0,
      ),
    0,
  );

  const stats = [
    { value: SKILLS.length, unit: "门", label: "在学课程" },
    { value: chapterCount, unit: "章", label: "讲义章节" },
    { value: questionCount, unit: "题", label: "题库总量" },
    { value: PASS_LINE, unit: "%", label: "单卷通过线" },
  ];

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {/* Hero：两门课的总览 */}
      <section className="relative overflow-hidden rounded-lg border border-border bg-card px-5 py-6 shadow-card sm:px-7 sm:py-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-brand-gradient opacity-[0.14] blur-2xl"
        />
        <div className="relative">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand-ink">
            Skill pack · GIS + CesiumJS
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.25] tracking-[-0.02em] sm:text-[32px]">
            问答式学
            <span className="text-brand-gradient"> GIS 与三维地球</span>
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-foreground-secondary sm:text-[15px]">
            两门课、一个学习闭环：GIS
            基础从坐标与经纬度的数学打底讲起，一路到空间运算与 PostGIS；CesiumJS
            三维地球从第一个 Viewer 讲到粒子特效，全程免 ion token
            示例。讲义 → 刷题 → 间隔复习，答错先讲清为什么错。
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/learn"
              className="flex h-12 items-center justify-center gap-2 rounded-sm bg-brand-gradient px-6 text-[15px] font-medium text-white shadow-brand transition-opacity hover:opacity-95 sm:h-11 sm:text-sm"
            >
              开始学习
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <Link
              href="/exam"
              className="flex h-12 items-center justify-center rounded-sm border border-border-strong bg-card px-6 text-[15px] font-medium text-foreground transition-colors hover:bg-background-hover sm:h-11 sm:text-sm"
            >
              开始考试
            </Link>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-border-subtle pt-5 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse">
                <dt className="mt-0.5 text-[11px] text-foreground-muted sm:text-[12px]">
                  {s.label}
                </dt>
                <dd className="flex items-baseline gap-1 font-semibold tracking-tight">
                  <span className="tabular text-[22px] sm:text-[26px]">
                    {s.value}
                  </span>
                  <span className="text-[12px] font-medium text-foreground-tertiary">
                    {s.unit}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 课程双卡：两门课各一张，带独立统计 */}
      <section className="mt-3 grid gap-3 sm:grid-cols-2">
        {SKILLS.map((skill) => {
          const stat = skillStat(skill.id);
          const Icon = SKILL_ICONS[skill.id] ?? Map;
          return (
            <Link
              key={skill.id}
              href={`/s/${skill.id}`}
              className="group relative flex h-full flex-col overflow-hidden rounded-md border border-border bg-card p-5 shadow-card transition-colors hover:border-brand/40"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-14 h-32 w-32 rounded-full bg-brand-gradient opacity-[0.12] blur-2xl"
              />
              <div className="relative flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-ink">
                  <Icon className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <h2 className="min-w-0 text-[15px] font-medium leading-snug">
                  {skill.title}
                </h2>
              </div>
              <p className="relative mt-3 flex-1 text-[13px] leading-relaxed text-foreground-secondary">
                {skill.description}
              </p>
              <div className="relative mt-3.5 flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[12px] tabular text-foreground-tertiary">
                  <span className="rounded-full bg-surface-muted px-2 py-0.5">
                    {stat.chapters} 章
                  </span>
                  <span className="rounded-full bg-surface-muted px-2 py-0.5">
                    {stat.questions} 题
                  </span>
                </p>
                <span className="inline-flex items-center gap-1 text-[13px] font-medium text-brand">
                  进入课程
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={2}
                  />
                </span>
              </div>
            </Link>
          );
        })}
      </section>

      {/* 题库构成：题型 + 难度分布（跨课程汇总） */}
      <section className="mt-3 rounded-md border border-border bg-card px-5 py-4 shadow-card sm:px-7 sm:py-5">
        <h2 className="text-[13px] font-medium sm:text-sm">题库构成</h2>
        <div className="mt-3">
          <QuestionMix />
        </div>
      </section>

      <p className="mt-4 text-[11px] leading-relaxed text-foreground-tertiary">
        答过一次题后，这里会变成你的学习面板：继续上次进度、今日待复习与各章掌握度。
      </p>
    </div>
  );
}

/** 回访用户版：今日任务 + 继续学习 + 各章掌握度（按课程分组） */
function Dashboard({ data }: { data: NonNullable<Awaited<ReturnType<typeof getHomeData>>> }) {
  const continueModule =
    data.continueSlug && data.continueSkill
      ? SKILL_REGISTRY.find((r) => r.id === data.continueSkill)?.modules.find(
          (m) => m.slug === data.continueSlug,
        ) ?? null
      : null;
  // 下一步：有最近章节就继续它（跨技能），否则从头开始 GIS
  const nextHref = continueModule
    ? `/s/${data.continueSkill}/${continueModule.slug}`
    : `/s/gis/${SKILL_REGISTRY[0]?.modules[0]?.slug ?? ""}`;
  const nextLabel = continueModule
    ? `继续《${continueModule.title}》`
    : "开始学习";

  const stats = [
    { value: data.answeredTotal, unit: "题", label: "累计作答" },
    {
      value: data.avgMastery === null ? "—" : Math.round(data.avgMastery),
      unit: data.avgMastery === null ? "" : "%",
      label: "平均掌握度",
    },
    { value: data.examCount, unit: "次", label: "参加考试" },
  ];

  const passedChapters = data.chapters.filter(
    (c) => c.quizCount > 0 && c.mastery >= PASS_LINE,
  ).length;
  const learningChapters = data.chapters.filter(
    (c) => c.quizCount > 0 && c.mastery < PASS_LINE,
  ).length;
  const notStartedChapters =
    data.chapters.length - passedChapters - learningChapters;

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <section className="relative overflow-hidden rounded-lg border border-border bg-card px-5 py-6 shadow-card sm:px-7 sm:py-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-brand-gradient opacity-[0.14] blur-2xl"
        />
        <div className="relative">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand-ink">
            Skill pack · GIS + CesiumJS
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.25] tracking-[-0.02em] sm:text-[32px]">
            今天接着学
          </h1>

          <div className="mt-5">
            <Link
              href={nextHref}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-brand-gradient px-6 text-[15px] font-medium text-white shadow-brand transition-opacity hover:opacity-95 sm:h-11 sm:text-sm"
            >
              <Play className="h-4 w-4" strokeWidth={2} />
              {nextLabel}
            </Link>
          </div>

          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-border-subtle pt-5">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse">
                <dt className="mt-0.5 text-[11px] text-foreground-muted sm:text-[12px]">
                  {s.label}
                </dt>
                <dd className="flex items-baseline gap-1 font-semibold tracking-tight">
                  <span className="tabular text-[22px] sm:text-[26px]">
                    {s.value}
                  </span>
                  <span className="text-[12px] font-medium text-foreground-tertiary">
                    {s.unit}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 今日任务 */}
      <section className="mt-3">
        <h2 className="sr-only">今日任务</h2>
        <ul className="grid grid-cols-2 gap-2 sm:gap-3">
          <li>
            <Link
              href="/review"
              className="flex h-full items-center gap-3 rounded-md border border-border bg-card p-3.5 shadow-card transition-colors hover:border-brand/40 hover:bg-background-subtle sm:p-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-brand-soft text-brand">
                <RotateCcw className="h-[18px] w-[18px]" strokeWidth={1.7} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium sm:text-sm">
                  待复习 {data.reviewDue} 题
                </span>
                <span className="block truncate text-[11px] text-foreground-tertiary sm:text-[12px]">
                  {data.reviewDue > 0 ? "错题不隔夜" : "队列已清空"}
                </span>
              </span>
            </Link>
          </li>
          <li>
            <Link
              href={data.dailyDoneToday ? "/exam" : "/exam/daily"}
              className="flex h-full items-center gap-3 rounded-md border border-border bg-card p-3.5 shadow-card transition-colors hover:border-brand/40 hover:bg-background-subtle sm:p-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-brand-soft text-brand">
                {data.dailyDoneToday ? (
                  <CircleCheck className="h-[18px] w-[18px]" strokeWidth={1.7} />
                ) : (
                  <CalendarCheck className="h-[18px] w-[18px]" strokeWidth={1.7} />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium sm:text-sm">
                  每日一考
                </span>
                <span className="block truncate text-[11px] text-foreground-tertiary sm:text-[12px]">
                  {data.dailyDoneToday
                    ? "今日已完成"
                    : data.lastExamMastery !== null
                      ? `上次 ${Math.round(data.lastExamMastery)}%`
                      : "10 题 · 每天一套"}
                </span>
              </span>
            </Link>
          </li>
        </ul>
      </section>

      {/* 学习概览：通关环图 + 成绩柱状图 */}
      <section className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-4 shadow-card sm:p-5">
          <h2 className="text-[13px] font-medium sm:text-sm">章节通关</h2>
          <div className="mt-3">
            <MasteryDonut
              segments={[
                {
                  value: passedChapters,
                  color: "hsl(var(--brand-primary))",
                  label: `已通关（≥${PASS_LINE}%）`,
                },
                {
                  value: learningChapters,
                  color: "hsl(var(--brand-cyan))",
                  label: "学习中",
                },
                {
                  value: notStartedChapters,
                  color: "hsl(var(--foreground-disabled))",
                  label: "未开始",
                },
              ]}
              centerValue={
                data.avgMastery === null ? "—" : `${Math.round(data.avgMastery)}%`
              }
              centerLabel="平均掌握度"
            />
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-4 shadow-card sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[13px] font-medium sm:text-sm">最近考试</h2>
            <span className="text-[11px] tabular text-foreground-tertiary">
              {data.bestExamMastery !== null
                ? `最好 ${Math.round(data.bestExamMastery)}%`
                : ""}
              {data.bestExamMastery !== null && " · "}
              近 7 天 {data.examsLast7d} 次
            </span>
          </div>
          <div className="mt-3">
            <ExamBars exams={data.recentExams} />
          </div>
          <p className="mt-2 text-right text-[10px] text-foreground-tertiary">
            虚线为 {PASS_LINE}% 通过线
          </p>
        </div>
      </section>

      {/* 各章掌握度：按课程分组（两门课章节号各自从 01 起） */}
      <section className="mt-3 rounded-md border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-medium sm:text-sm">各章掌握度</h2>
          <Link
            href="/progress"
            className="inline-flex min-h-8 items-center gap-1 text-[12px] text-foreground-muted hover:text-brand"
          >
            详情
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
        {SKILL_REGISTRY.map((reg) => {
          const chapters = data.chapters.filter((c) => c.skill === reg.id);
          if (chapters.length === 0) return null;
          const skillTitle =
            SKILLS.find((s) => s.id === reg.id)?.title ?? reg.id;
          return (
            <div key={reg.id} className="mt-4 first:mt-3">
              <p className="flex items-center gap-2 text-[11px] font-medium text-foreground-tertiary">
                {skillTitle}
                <span className="tabular">· {chapters.length} 章</span>
              </p>
              <ul className="mt-2 space-y-2.5">
                {chapters.map((c) => (
                  <li key={`${c.skill}:${c.slug}`}>
                    <Link
                      href={`/s/${c.skill}/${c.slug}`}
                      className="group flex items-center gap-3"
                    >
                      <span className="w-7 shrink-0 font-mono text-[11px] text-foreground-muted">
                        {chapterNo(c.slug)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] group-hover:text-brand sm:text-sm">
                        {c.title}
                      </span>
                      <span
                        className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-brand-soft sm:w-28"
                        role="img"
                        aria-label={`掌握度 ${Math.round(c.mastery)}%`}
                      >
                        <span
                          className="block h-full rounded-full bg-brand-gradient"
                          style={{ width: `${Math.min(100, c.mastery)}%` }}
                        />
                      </span>
                      <span className="w-10 shrink-0 text-right text-[11px] tabular text-foreground-tertiary">
                        {c.quizCount > 0 ? `${Math.round(c.mastery)}%` : "—"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <p className="mt-4 text-[11px] leading-relaxed text-foreground-tertiary">
        进度与错题保存在云端数据库，同一浏览器自动同步。
      </p>
    </div>
  );
}
