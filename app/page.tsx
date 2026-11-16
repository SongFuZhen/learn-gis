import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CircleCheck,
  Play,
  RotateCcw,
} from "lucide-react";
import { SKILL_REGISTRY } from "@/content/registry";
import { SKILLS } from "@/lib/content";
import { PASS_LINE, dateKey } from "@/lib/quiz/exam";
import { getActivityCalendar } from "@/lib/engagement/activity";
import { getHomeData, type HomeData } from "@/lib/progress/home";
import {
  getSkillProgressMap,
  getSkillStats,
  type SkillProgress,
  type SkillStats,
} from "@/lib/course-stats";
import HomeHero, { type HeroStat } from "@/components/home/HomeHero";
import CourseRail from "@/components/home/CourseRail";
import ActivityHeatmap from "@/components/engagement/ActivityHeatmap";
import RankPreview from "@/components/home/RankPreview";
import MasteryDonut from "@/components/home/MasteryDonut";
import ExamBars from "@/components/home/ExamBars";
import QuestionMix from "@/components/home/QuestionMix";
import { getCheckinSummary } from "@/lib/engagement/checkin";
import { getLeaderboard } from "@/lib/engagement/leaderboard";
import { resolveUserId } from "@/lib/api/user";
import LearningPath from "@/components/course/LearningPath";
import CourseCard from "@/components/course/CourseCard";
import McpEntry from "@/components/home/McpEntry";

export default async function HomePage() {
  const data = await getHomeData();
  if (!data) return <Intro />;
  const userId = await resolveUserId();
  const yearMonth = dateKey().slice(0, 7);
  const [progressMap, checkin, board, activityDays] = await Promise.all([
    getSkillProgressMap(data),
    userId ? getCheckinSummary(userId) : Promise.resolve(null),
    getLeaderboard(userId),
    userId ? getActivityCalendar(userId, yearMonth) : Promise.resolve([]),
  ]);
  return (
    <Dashboard
      data={data}
      progressMap={progressMap}
      checkin={checkin}
      board={board}
      currentUserId={userId}
      yearMonth={yearMonth}
      activityDays={activityDays}
    />
  );
}

/** 五门课的构建期内容统计，首页两个版本共用 */
function getCourseItems() {
  return SKILL_REGISTRY.map((registration) => ({
    registration,
    stats: getSkillStats(registration.id),
  }));
}

function totalStats(): { chapters: number; questions: number } {
  return getCourseItems().reduce(
    (acc, { stats }) => ({
      chapters: acc.chapters + stats.chapters,
      questions: acc.questions + stats.questions,
    }),
    { chapters: 0, questions: 0 },
  );
}

/** 新访客版：深色 Hero + 课程轨道 + 学习路径 + 题库构成 */
function Intro() {
  const items = getCourseItems();
  const totals = totalStats();

  const stats: HeroStat[] = [
    { value: SKILLS.length, unit: "门", label: "在学课程" },
    { value: totals.chapters, unit: "章", label: "讲义章节" },
    { value: totals.questions, unit: "题", label: "题库总量" },
    { value: PASS_LINE, unit: "%", label: "单卷通过线" },
  ];

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <HomeHero
        eyebrow={`Skill pack · ${SKILLS.map((s) => s.title).join(" / ")}`}
        title={
          <>
            问答式学
            <span className="text-brand-ink"> 地理空间与图形编程</span>
          </>
        }
        description={`${SKILLS.length} 门课、一个学习闭环：从 GIS 坐标与投影的数学打底，到 Turf 二维空间运算、CesiumJS 三维地球，再到 three.js 图形渲染与鸿蒙开发，全程免 token 示例。讲义 → 刷题 → 间隔复习，答错先讲清为什么错。`}
        actions={
          <>
            <Link
              href="/learn"
              className="flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-brand transition-opacity hover:opacity-90"
            >
              开始学习
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <Link
              href="/exam"
              className="flex h-11 items-center justify-center rounded-md border border-border bg-background-subtle px-6 text-sm font-medium text-foreground transition-colors hover:bg-background-hover"
            >
              开始考试
            </Link>
          </>
        }
        stats={stats}
      />

      <div className="mt-6">
        <McpEntry />
      </div>

      <div className="mt-6">
        <CourseRail items={items} />
      </div>

      <div className="mt-6">
        <LearningPath />
      </div>

      <section className="mt-6 rounded-lg border border-border bg-card px-5 py-5 shadow-card sm:px-7">
        <h2 className="text-[15px] font-medium">题库构成</h2>
        <div className="mt-4">
          <QuestionMix />
        </div>
      </section>

      <p className="mt-4 text-[11px] leading-relaxed text-foreground-tertiary">
        答过一次题后，这里会变成你的学习面板：继续上次进度、今日待复习与各章掌握度。
      </p>
    </div>
  );
}

/** 回访用户版：今日任务 + Hero/学习概览/活跃地图三列 + 课程进度 + 积分榜 */
function Dashboard({
  data,
  progressMap,
  checkin,
  board,
  currentUserId,
  yearMonth,
  activityDays,
}: {
  data: HomeData;
  progressMap: Record<string, SkillProgress> | null;
  checkin: Awaited<ReturnType<typeof getCheckinSummary>> | null;
  board: Awaited<ReturnType<typeof getLeaderboard>>;
  currentUserId: string | null;
  yearMonth: string;
  activityDays: Awaited<ReturnType<typeof getActivityCalendar>>;
}) {
  const continueModule =
    data.continueSlug && data.continueSkill
      ? SKILL_REGISTRY.find((r) => r.id === data.continueSkill)?.modules.find(
          (m) => m.slug === data.continueSlug,
        ) ?? null
      : null;
  // 下一步：有最近章节就继续它（跨技能），否则回到课程选择页
  const nextHref = continueModule
    ? `/s/${data.continueSkill}/${continueModule.slug}`
    : "/learn";
  const nextLabel = continueModule
    ? `继续《${continueModule.title}》`
    : "开始学习";

  const stats: HeroStat[] = [
    { value: data.answeredTotal, unit: "题", label: "累计作答" },
    {
      value: data.avgMastery === null ? "—" : Math.round(data.avgMastery),
      unit: data.avgMastery === null ? undefined : "%",
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

  const items = getCourseItems();
  const statsById = new Map<string, SkillStats>(
    items.map((item) => [item.registration.id, item.stats]),
  );

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {/* 今日任务（紧凑两卡）+ MCP 入口并排 */}
      <section className="grid gap-3 lg:grid-cols-3">
        <div className="flex flex-col lg:col-span-2">
          <h2 className="text-[15px] font-medium">今日任务</h2>
          <ul className="mt-3 grid h-full flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <li>
              <Link
                href="/review"
                className="flex h-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-card transition-colors hover:border-brand/40 hover:bg-background-subtle"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-brand-soft text-brand">
                  <RotateCcw className="h-4 w-4" strokeWidth={1.7} />
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
                className="flex h-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-card transition-colors hover:border-brand/40 hover:bg-background-subtle"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-brand-soft text-brand">
                  {data.dailyDoneToday ? (
                    <CircleCheck className="h-4 w-4" strokeWidth={1.7} />
                  ) : (
                    <CalendarCheck className="h-4 w-4" strokeWidth={1.7} />
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
        </div>
        <McpEntry />
      </section>

      {/* 三列同排：Hero 今天接着学 | 学习概览上下叠 | 活跃地图 */}
      <section className="mt-6 grid gap-3 lg:grid-cols-3">
        <div className={`h-full ${checkin ? "" : "lg:col-span-2"}`}>
          <HomeHero
            eyebrow={`Skill pack · ${SKILLS.map((s) => s.title).join(" / ")}`}
            title="今天接着学"
            description={
              continueModule
                ? `上次学到《${continueModule.title}》，从这里接着往下走。`
                : "选一门课开始，讲义、刷题与复习会自动排进你的学习面板。"
            }
            actions={
              <Link
                href={nextHref}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-brand transition-opacity hover:opacity-90"
              >
                <Play className="h-4 w-4" strokeWidth={2} />
                {nextLabel}
              </Link>
            }
            stats={stats}
          />
        </div>

        {/* 学习概览：通关环图 + 成绩柱状图，窄列上下堆叠 */}
        <div className="flex h-full flex-col gap-3">
          <div className="flex flex-1 flex-col rounded-lg border border-border bg-card p-4 shadow-card">
            <h2 className="text-[14px] font-medium">章节通关</h2>
            {data.avgMastery === null ? (
              <>
                <ul className="mt-3 space-y-1.5">
                  {[
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
                  ].map((s) => (
                    <li
                      key={s.label}
                      className="flex items-center gap-2 text-[12px]"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: s.color }}
                      />
                      <span className="flex-1 text-foreground-secondary">
                        {s.label}
                      </span>
                      <span className="tabular font-medium">{s.value}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] leading-relaxed text-foreground-tertiary">
                  完成任意章节测验后，自动统计通关分布与平均掌握度。
                </p>
              </>
            ) : (
              <div className="mt-3">
                <MasteryDonut
                  stackOnMobile
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
                  centerValue={`${Math.round(data.avgMastery)}%`}
                  centerLabel="平均掌握度"
                />
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col rounded-lg border border-border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[14px] font-medium">最近考试</h2>
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
            {data.recentExams.length > 0 && (
              <p className="mt-2 text-right text-[10px] text-foreground-tertiary">
                虚线为 {PASS_LINE}% 通过线
              </p>
            )}
            <Link
              href="/progress"
              className="group mt-auto flex items-center justify-between gap-2 border-t border-border pt-3 text-[12px] font-medium"
            >
              <span>查看完整学习进度</span>
              <span className="inline-flex items-center gap-1 text-brand">
                各章掌握度与成绩
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </span>
            </Link>
          </div>
        </div>

        {checkin && (
          <div className="flex h-full flex-col rounded-lg border border-border bg-card p-4 shadow-card">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 className="text-[13px] font-semibold sm:text-sm">
                {Number(yearMonth.slice(5))} 月活跃地图
              </h3>
              <span className="text-[11px] tabular text-foreground-tertiary">
                连续 {checkin.current} 天 · 累计 {checkin.totalDays} 天
              </span>
            </div>
            <ActivityHeatmap yearMonth={yearMonth} days={activityDays} />
            <Link
              href="/checkin"
              className="mt-auto block pt-3 text-right text-[11px] font-medium text-brand hover:underline"
            >
              查看日历 →
            </Link>
          </div>
        )}
      </section>

      {/* 我的课程：与 /learn 同款 CourseCard，带通关进度 */}
      <section className="mt-7">
        <h2 className="text-[15px] font-medium">我的课程</h2>
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SKILL_REGISTRY.map((registration) => (
            <li key={registration.id}>
              <CourseCard
                compact
                registration={registration}
                stats={
                  statsById.get(registration.id) ?? {
                    chapters: 0,
                    questions: 0,
                    audioChapters: 0,
                  }
                }
                progress={progressMap?.[registration.id] ?? null}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* 积分榜摘要：完整榜单在 /rank */}
      {board.length > 0 && (
        <div className="mt-7">
          <RankPreview entries={board} currentUserId={currentUserId} />
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-foreground-tertiary">
        进度与错题保存在云端数据库，同一浏览器自动同步。
      </p>
    </div>
  );
}
