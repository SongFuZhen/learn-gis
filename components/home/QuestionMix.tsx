import { GIS_MODULES } from "@/content/gis/modules";
import { getQuestionFile } from "@/lib/content";
import MasteryDonut from "@/components/home/MasteryDonut";

const TYPE_META = [
  { key: "single", label: "单选", color: "hsl(var(--brand-primary))" },
  { key: "truefalse", label: "判断", color: "hsl(var(--brand-cyan))" },
  { key: "numeric", label: "计算", color: "hsl(var(--brand-gold))" },
  { key: "short", label: "短答", color: "hsl(var(--brand-violet))" },
  { key: "map", label: "点图", color: "hsl(var(--info))" },
  { key: "multi", label: "多选", color: "hsl(var(--success))" },
] as const;

const DIFF_META = [
  { level: 1, label: "入门", color: "hsl(var(--brand-cyan))" },
  { level: 2, label: "进阶", color: "hsl(var(--brand-primary))" },
  { level: 3, label: "挑战", color: "hsl(var(--brand-gold))" },
] as const;

/** 题库构成：题型环图 + 难度数字块（新访客首页用，服务端直算） */
export default function QuestionMix() {
  const all = GIS_MODULES.flatMap(
    (m) => getQuestionFile("gis", m.slug).questions,
  );
  const total = all.length;

  const typeCounts = TYPE_META.map((t) => ({
    ...t,
    count: all.filter((q) => q.type === t.key).length,
  }));
  const diffCounts = DIFF_META.map((d) => ({
    ...d,
    count: all.filter((q) => q.difficulty === d.level).length,
  }));

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6">
      {/* 题型分布：环图 + 图例 */}
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-foreground-secondary">
          题型分布
        </p>
        <div
          role="img"
          aria-label={typeCounts
            .map((t) => `${t.label} ${t.count} 题`)
            .join("，")}
          className="mt-3 flex justify-center sm:justify-start"
        >
          <MasteryDonut
            stackOnMobile
            segments={typeCounts.map((t) => ({
              value: t.count,
              color: t.color,
              label: t.label,
            }))}
            centerValue={String(total)}
            centerLabel="总题量"
          />
        </div>
      </div>

      {/* 难度分布：三块数字卡（窄屏纵排，sm 起横排） */}
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-foreground-secondary">
          难度分布
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {diffCounts.map((d) => (
            <div
              key={d.level}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-background-subtle px-3 py-2 sm:block sm:p-3 sm:text-center"
            >
              <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground-tertiary">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: d.color }}
                />
                {d.label}
              </span>
              <span className="sm:mt-1.5 sm:block">
                <span className="tabular text-[15px] font-semibold tracking-tight sm:text-[22px]">
                  {d.count}
                </span>
                <span className="ml-0.5 text-[10px] font-medium text-foreground-tertiary sm:text-[11px]">
                  题
                </span>
                <span className="ml-1.5 text-[10px] tabular text-foreground-tertiary sm:ml-0 sm:mt-0.5 sm:block">
                  {Math.round((d.count / total) * 100)}%
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
