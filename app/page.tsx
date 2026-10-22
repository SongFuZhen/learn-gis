import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  ChartColumn,
  CircleCheck,
  Play,
  RotateCcw,
} from "lucide-react";
import { GIS_MODULES } from "@/content/gis/modules";
import { getQuestionFile } from "@/lib/content";
import { getHomeData } from "@/lib/progress/home";
import MasteryDonut from "@/components/home/MasteryDonut";
import ExamBars from "@/components/home/ExamBars";
import QuestionMix from "@/components/home/QuestionMix";

const PASS_LINE = 80;

export default async function HomePage() {
  const data = await getHomeData();
  return data ? <Dashboard data={data} /> : <Intro />;
}

/** 新访客版：介绍 + 题库统计 + 快捷入口 */
function Intro() {
  const chapterCount = GIS_MODULES.length;
  const questionCount = GIS_MODULES.reduce(
    (sum, m) => sum + getQuestionFile("gis", m.slug).questions.length,
    0,
  );

  const stats = [
    { value: chapterCount, unit: "章", label: "已完成讲义" },
    { value: questionCount, unit: "题", label: "题库总量" },
    { value: PASS_LINE, unit: "%", label: "单卷通过线" },
  ];

  return (
    <div className="w-full px-4 pb-8 pt-5 sm:px-6 lg:px-8 lg:pt-10">
      <section className="relative overflow-hidden rounded-lg border border-border bg-card px-5 py-6 shadow-card sm:px-7 sm:py-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-brand-gradient opacity-[0.14] blur-2xl"
        />
        <div className="relative">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand-ink">
            Skill pack · GIS
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.25] tracking-[-0.02em] sm:text-[32px]">
            问答式学<span className="text-brand-gradient"> GIS</span>
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-foreground-secondary sm:text-[15px]">
            从球面到平面、坐标参考系、矢量与栅格、数据格式、OGC
            服务、空间运算与 PostGIS。讲义 → 刷题 → 间隔复习，答错先讲清为什么错。
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/exam"
              className="flex h-12 items-center justify-center gap-2 rounded-sm bg-brand-gradient px-6 text-[15px] font-medium text-white shadow-brand transition-opacity hover:opacity-95 sm:h-11 sm:text-sm"
            >
              开始考试
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <Link
              href="/s/gis"
              className="flex h-12 items-center justify-center rounded-sm border border-border-strong bg-card px-6 text-[15px] font-medium text-foreground transition-colors hover:bg-background-hover sm:h-11 sm:text-sm"
            >
              从第 1 章读起
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

      <section className="mt-3">
        <h2 className="sr-only">快捷入口</h2>
        <ul className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { href: "/s/gis", label: "讲义", desc: "一章一页", Icon: BookOpen },
            { href: "/review", label: "复习", desc: "今日到期", Icon: RotateCcw },
            {
              href: "/progress",
              label: "进度",
              desc: "各章掌握度",
              Icon: ChartColumn,
            },
          ].map(({ href, label, desc, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex h-full flex-col gap-2 rounded-md border border-border bg-card p-3.5 shadow-card transition-colors hover:border-brand/40 hover:bg-background-subtle sm:p-4"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-brand-soft text-brand">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                </span>
                <span className="text-[13px] font-medium sm:text-sm">
                  {label}
                </span>
                <span className="hidden text-[12px] leading-snug text-foreground-tertiary sm:block">
                  {desc}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 题库构成：题型 + 难度分布 */}
      <section className="mt-3 rounded-md border border-border bg-card p-4 shadow-card sm:p-5">
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

/** 回访用户版：今日任务 + 继续学习 + 各章掌握度 */
function Dashboard({ data }: { data: NonNullable<Awaited<ReturnType<typeof getHomeData>>> }) {
  const continueModule = data.continueSlug
    ? GIS_MODULES.find((m) => m.slug === data.continueSlug)
    : null;
  // 下一步：有最近章节就继续它，否则从头开始
  const nextHref = continueModule
    ? `/s/gis/${continueModule.slug}`
    : `/s/gis/${GIS_MODULES[0]?.slug ?? ""}`;
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
  const notStartedChapters = data.chapters.length - passedChapters - learningChapters;

  return (
    <div className="w-full px-4 pb-8 pt-5 sm:px-6 lg:px-8 lg:pt-10">
      <section className="relative overflow-hidden rounded-lg border border-border bg-card px-5 py-6 shadow-card sm:px-7 sm:py-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-brand-gradient opacity-[0.14] blur-2xl"
        />
        <div className="relative">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand-ink">
            Skill pack · GIS
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.25] tracking-[-0.02em] sm:text-[32px]">
            今天接着学
          </h1>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href={nextHref}
              className="flex h-12 items-center justify-center gap-2 rounded-sm bg-brand-gradient px-6 text-[15px] font-medium text-white shadow-brand transition-opacity hover:opacity-95 sm:h-11 sm:text-sm"
            >
              <Play className="h-4 w-4" strokeWidth={2} />
              {nextLabel}
            </Link>
            {!data.dailyDoneToday && (
              <Link
                href="/exam/daily"
                className="flex h-12 items-center justify-center gap-2 rounded-sm border border-border-strong bg-card px-6 text-[15px] font-medium text-foreground transition-colors hover:bg-background-hover sm:h-11 sm:text-sm"
              >
                <CalendarCheck className="h-4 w-4" strokeWidth={1.7} />
                今日一考
              </Link>
            )}
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

      {/* 各章掌握度 */}
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
        <ul className="mt-3 space-y-2.5">
          {data.chapters.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/s/gis/${c.slug}`}
                className="group flex items-center gap-3"
              >
                <span className="w-7 shrink-0 font-mono text-[11px] text-foreground-muted">
                  {c.slug}
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
      </section>

      <p className="mt-4 text-[11px] leading-relaxed text-foreground-tertiary">
        进度与错题保存在云端数据库，同一浏览器自动同步。
      </p>
    </div>
  );
}
