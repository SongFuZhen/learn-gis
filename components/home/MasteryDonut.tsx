import { cn } from "@/lib/utils";

type Props = {
  /** 各分段数量（顺序固定：通关 / 学习中 / 未开始） */
  segments: { value: number; color: string; label: string }[];
  /** 中心主数字 */
  centerValue: string;
  centerLabel: string;
  /** stack：图例移到环图下方（窄列用），sm 起恢复右侧 */
  stackOnMobile?: boolean;
};

/** 章节通关分布环形图（conic-gradient 实现，无客户端 JS） */
export default function MasteryDonut({
  segments,
  centerValue,
  centerLabel,
  stackOnMobile = false,
}: Props) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  const stops = segments
    .map((s) => {
      const from = total === 0 ? 0 : (acc / total) * 360;
      acc += s.value;
      const to = total === 0 ? 360 : (acc / total) * 360;
      return `${s.color} ${from}deg ${to}deg`;
    })
    .join(", ");
  const gradient =
    total === 0
      ? `hsl(var(--foreground-disabled)) 0deg 360deg`
      : stops;

  return (
    <div
      className={cn(
        "flex items-center gap-4",
        stackOnMobile && "w-full flex-col gap-3 sm:flex-row sm:gap-4",
      )}
    >
      <div
        className="relative h-24 w-24 shrink-0 rounded-full sm:h-28 sm:w-28"
        role="img"
        aria-label={segments.map((s) => `${s.label} ${s.value}`).join("，")}
        style={{ background: `conic-gradient(${gradient})` }}
      >
        <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full bg-card">
          <span className="tabular text-[18px] font-semibold leading-none sm:text-[20px]">
            {centerValue}
          </span>
          <span className="mt-1 text-[10px] text-foreground-tertiary">
            {centerLabel}
          </span>
        </div>
      </div>
      <ul
        className={cn(
          "min-w-0 flex-1 space-y-1.5",
          stackOnMobile &&
            "grid w-full grid-cols-2 gap-x-3 gap-y-1 space-y-0 sm:flex sm:flex-col sm:gap-0 sm:space-y-1.5",
        )}
      >
        {segments.map((s) => (
          <li
            key={s.label}
            className={cn(
              "flex items-center gap-2 text-[12px]",
              stackOnMobile && "text-[11px] sm:text-[12px]",
            )}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            <span className="min-w-0 flex-1 truncate text-foreground-secondary">
              {s.label}
            </span>
            <span className="tabular font-medium">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
