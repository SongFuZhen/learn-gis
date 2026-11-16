import { cn } from "@/lib/utils";
import { activityLevel, type ActivityDay } from "@/lib/engagement/activity";
import { dateKey } from "@/lib/quiz/exam";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

/** 把 Date.getDay()（0=周日）换算成周一起始的列下标 */
function mondayFirstIndex(day: number): number {
  return (day + 6) % 7;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * 打卡月历（纯展示）：周一起始，格子色阶由 activityLevel 决定。
 * 今日加 ring 描边；未来日期空底不可点；仅渲染当前月，不做历史切换。
 */
export default function CheckinCalendar({
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
  const leadBlanks = mondayFirstIndex(new Date(year, month - 1, 1).getDay());

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
    <div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className="pb-1 text-center text-[11px] text-foreground-muted"
          >
            {w}
          </span>
        ))}
        {cells.map((day, index) => {
          if (!day) {
            return <span key={`blank-${index}`} className="aspect-square" />;
          }
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
                "flex aspect-square items-center justify-center rounded-md text-[12px] tabular sm:text-[13px]",
                isFuture && "text-foreground-disabled",
                !isFuture && level > 0 && `cal-l${level}`,
                !isFuture && level === 0 && "bg-background-muted",
                isToday &&
                  "ring-2 ring-brand ring-offset-1 ring-offset-[hsl(var(--card))]",
              )}
            >
              {dayNum}
            </span>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-foreground-tertiary">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-background-muted" />
          未打卡
        </span>
        {[1, 2, 3, 4].map((level) => (
          <span key={level} className="flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded-sm", `cal-l${level}`)} />
            {["轻度", "常态", "勤奋", "爆表"][level - 1]}
          </span>
        ))}
      </div>
    </div>
  );
}
