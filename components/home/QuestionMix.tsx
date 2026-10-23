import { GIS_MODULES } from "@/content/gis/modules";
import { getQuestionFile } from "@/lib/content";

const TYPE_META = [
  { key: "single", label: "单选", color: "hsl(var(--brand-primary))" },
  { key: "multi", label: "多选", color: "hsl(var(--brand-violet))" },
  { key: "short", label: "短答", color: "hsl(var(--brand-cyan))" },
  { key: "numeric", label: "计算", color: "hsl(var(--brand-gold))" },
  { key: "truefalse", label: "判断", color: "hsl(var(--success))" },
] as const;

const DIFF_META = [
  { level: 1, label: "入门", color: "hsl(var(--brand-cyan))" },
  { level: 2, label: "进阶", color: "hsl(var(--brand-primary))" },
  { level: 3, label: "挑战", color: "hsl(var(--brand-gold))" },
] as const;

/** 题库构成：题型比例条 + 难度分布条（新访客首页用，服务端直算） */
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
  const maxDiff = Math.max(...diffCounts.map((d) => d.count), 1);

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {/* 题型比例 */}
      <div>
        <p className="text-[12px] font-medium text-foreground-secondary">
          题型分布
        </p>
        <div
          className="mt-2 flex h-2.5 overflow-hidden rounded-full"
          role="img"
          aria-label={typeCounts.map((t) => `${t.label} ${t.count} 题`).join("，")}
        >
          {typeCounts.map((t) => (
            <span
              key={t.key}
              style={{
                width: `${(t.count / total) * 100}%`,
                background: t.color,
              }}
            />
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {typeCounts.map((t) => (
            <li
              key={t.key}
              className="flex items-center gap-1.5 text-[11px] text-foreground-tertiary"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: t.color }}
              />
              {t.label}
              <span className="tabular font-medium text-foreground-secondary">
                {t.count}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* 难度分布 */}
      <div>
        <p className="text-[12px] font-medium text-foreground-secondary">
          难度分布
        </p>
        <ul className="mt-2 space-y-1.5">
          {diffCounts.map((d) => (
            <li key={d.level} className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-[11px] text-foreground-tertiary">
                {d.label}
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-brand-soft">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${(d.count / maxDiff) * 100}%`,
                    background: d.color,
                  }}
                />
              </span>
              <span className="w-7 shrink-0 text-right text-[11px] tabular text-foreground-secondary">
                {d.count}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
