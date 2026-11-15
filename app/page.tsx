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
import { PASS_LINE } from "@/lib/quiz/exam";
import { getHomeData, type HomeData } from "@/lib/progress/home";
import {
  getSkillProgressMap,
  getSkillStats,
  type SkillProgress,
  type SkillStats,
} from "@/lib/course-stats";
import HomeHero, { type HeroStat } from "@/components/home/HomeHero";
import CourseRail from "@/components/home/CourseRail";
import CheckinCard from "@/components/home/CheckinCard";
import RankPreview from "@/components/home/RankPreview";
import MasteryDonut from "@/components/home/MasteryDonut";
import ExamBars from "@/components/home/ExamBars";
import QuestionMix from "@/components/home/QuestionMix";
import { getCheckinSummary } from "@/lib/engagement/checkin";
import { getLeaderboard } from "@/lib/engagement/leaderboard";
import { resolveUserId } from "@/lib/api/user";
import LearningPath from "@/components/course/LearningPath";
import CourseCard from "@/components/course/CourseCard";

export default async function HomePage() {
  const data = await getHomeData();
  if (!data) return <Intro />;
  const userId = await resolveUserId();
  const [progressMap, checkin, board] = await Promise.all([
    getSkillProgressMap(data),
    userId ? getCheckinSummary(userId) : Promise.resolve(null),
    getLeaderboard(userId),
  ]);
  return (
    <Dashboard
      data={data}
      progressMap={progressMap}
      checkin={checkin}
      board={board}
      currentUserId={userId}
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
            <span className="text-white"> 地理空间与图形编程</span>
          </>
        }
        description={`${SKILLS.length} 门课、一个学习闭环：从 GIS 坐标与投影的数学打底，到 Turf 二维空间运算、CesiumJS 三维地球，再到 three.js 图形渲染与鸿蒙开发，全程免 token 示例。讲义 → 刷题 → 间隔复习，答错先讲清为什么错。`}
        actions={
          <>
            <Link
              href="/learn"
              className="flex h-11 items-center justify-center gap-2 rounded-sm bg-white px-6 text-sm font-medium text-foreground transition-opacity hover:opacity-90"
            >
              开始学习
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <Link
              href="/exam"
              className="flex h-11 items-center justify-center rounded-sm border border-white/25 bg-white/10 px-6 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              开始考试
            </Link>
          </>
        }
        stats={stats}
      />

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

/** 回访用户版：个性化深色 Hero + 今日任务 + 课程进度 + 学习概览 */
function Dashboard({
  data,
  progressMap,
  checkin,
  board,
  currentUserId,
}: {
  data: HomeData;
  progressMap: Record<string, SkillProgress> | null;
  checkin: Awaited<ReturnType<typeof getCheckinSummary>> | null;
  board: Awaited<ReturnType<typeof getLeaderboard>>;
  currentUserId: string | null;
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
            className="flex h-11 items-center justify-center gap-2 rounded-sm bg-white px-6 text-sm font-medium text-foreground transition-opacity hover:opacity-90"
          >
            <Play className="h-4 w-4" strokeWidth={2} />
            {nextLabel}
          </Link>
        }
        stats={stats}
      />

      {/* 今日任务 */}
      <section className="mt-6">
        <h2 className="text-[15px] font-medium">今日任务</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {checkin && (
            <li className="col-span-2 lg:col-span-1">
              <CheckinCard summary={checkin} />
            </li>
          )}
          <li>
            <Link
              href="/review"
              className="flex h-full items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-card transition-colors hover:border-brand/40 hover:bg-background-subtle"
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
              className="flex h-full items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-card transition-colors hover:border-brand/40 hover:bg-background-subtle"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-brand-soft text-brand">
                {data.dailyDoneToday ? (
                  <CircleCheck className="h-[18px] w-[18px]" strokeWidth={1.7} />
                ) : (
                  <CalendarCheck
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.7}
                  />
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

      {/* 我的课程：与 /learn 同款 CourseCard，带通关进度 */}
      <section className="mt-7">
        <h2 className="text-[15px] font-medium">我的课程</h2>
        <ul className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          {SKILL_REGISTRY.map((registration) => (
            <li key={registration.id}>
              <CourseCard
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

      {/* 学习概览：通关环图 + 成绩柱状图 */}
      <section className="mt-7 grid gap-4 sm:grid-cols-2">
        <div className="flex h-full flex-col rounded-lg border border-border bg-card p-5 shadow-card">
          <h2 className="text-[15px] font-medium">章节通关</h2>
          <div className="mt-3 flex flex-1 items-center">
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
                data.avgMastery === null
                  ? "—"
                  : `${Math.round(data.avgMastery)}%`
              }
              centerLabel="平均掌握度"
            />
          </div>
          {data.avgMastery === null && (
            <p className="mt-3 text-[11px] leading-relaxed text-foreground-tertiary">
              完成任意章节测验后，自动统计通关分布与平均掌握度。
            </p>
          )}
        </div>

        <div className="flex h-full flex-col rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-medium">最近考试</h2>
            <span className="text-[11px] tabular text-foreground-tertiary">
              {data.bestExamMastery !== null
                ? `最好 ${Math.round(data.bestExamMastery)}%`
                : ""}
              {data.bestExamMastery !== null && " · "}
              近 7 天 {data.examsLast7d} 次
            </span>
          </div>
          <div className="mt-3 flex flex-1 items-center">
            <ExamBars exams={data.recentExams} />
          </div>
          {data.recentExams.length > 0 && (
            <p className="mt-2 text-right text-[10px] text-foreground-tertiary">
              虚线为 {PASS_LINE}% 通过线
            </p>
          )}
        </div>
      </section>

      {/* 积分榜摘要：完整榜单在 /rank */}
      {board.length > 0 && (
        <div className="mt-7">
          <RankPreview entries={board} currentUserId={currentUserId} />
        </div>
      )}

      {/* 完整进度入口：逐章掌握度长表收在 /progress */}
      <Link
        href="/progress"
        className="group mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-4 shadow-card transition-colors hover:border-brand/40"
      >
        <span className="text-[14px] font-medium">查看完整学习进度</span>
        <span className="inline-flex items-center gap-1 text-[13px] font-medium text-brand">
          各章掌握度与测验成绩
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </span>
      </Link>

      <p className="mt-4 text-[11px] leading-relaxed text-foreground-tertiary">
        进度与错题保存在云端数据库，同一浏览器自动同步。
      </p>
    </div>
  );
}
