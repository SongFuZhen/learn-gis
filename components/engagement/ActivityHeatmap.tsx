import { cn } from "@/lib/utils";
import { activityLevel, type ActivityDay } from "@/lib/engagement/activity";
import { dateKey } from "@/lib/quiz/exam";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * 打卡热力图（首页摘要）：周一起始 7 列圆角块，按学习量上色。
 * 今日块显示「今日」；未来日期浅底置灰；底部带已打卡/未打卡图例。完整月历在 /checkin。
 */
export default function ActivityHeatmap({
  yearMonth,
  days,
}: {
  /** YYYY-MM */
  yearMonth: string;
  days: ActivityDay[];
}) {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return null;

  const todayKey = dateKey();
  const dayMap = new Map(days.map((d) => [d.dateKey, d]));
  const lastDate = new Date(year, month, 0).getDate();
  const leadBlanks = (new Date(year, month - 1, 1).getDay() + 6) % 7;

  const cells: (ActivityDay | null)[] = [
    ...Array.from({ length: leadBlanks }, () => null),
    ...Array.from({ length: lastDate }, (_, i) => {
      const key = `${yearMonth}-${pad(i + 1)}`;
      return (
        dayMap.get(key) ?? {
          dateKey: key,
          answerCount: 0,
          examCount: 0,
          lessonCount: 0,
          checkedIn: false,
        }
      );
    }),
  ];

  return (
    <div className="max-w-xl">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} className="h-8 sm:h-9" />;
          const level = activityLevel(day);
          const isFuture = day.dateKey > todayKey;
          const isToday = day.dateKey === todayKey;
          const dayNum = Number(day.dateKey.slice(-2));
          const title = `${month}月${dayNum}日 · 答题 ${day.answerCount} · 讲义 ${day.lessonCount} · 考试 ${day.examCount}`;

          return (
            <span
              key={day.dateKey}
              title={isFuture ? undefined : title}
              aria-label={title}
              className={cn(
                "flex h-8 items-center justify-center rounded-lg text-[12px] font-medium tabular leading-none sm:h-9 sm:text-[13px]",
                isFuture && "bg-background-muted text-foreground-disabled",
                !isFuture &&
                  !isToday &&
                  level > 0 && `cal-l${level}`,
                !isFuture &&
                  !isToday &&
                  level === 0 &&
                  "bg-background-muted text-foreground-tertiary",
                isToday && (level > 0 ? `cal-l${level}` : "cal-l1"),
              )}
            >
              {isToday ? "今日" : dayNum}
            </span>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 text-[11px] text-foreground-tertiary">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm cal-l2" />
          已打卡
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-background-muted" />
          未打卡
        </span>
      </div>
    </div>
  );
}
