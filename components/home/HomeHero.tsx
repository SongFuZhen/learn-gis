import type { ReactNode } from "react";
import { SKILL_REGISTRY } from "@/content/registry";
import { getCourseTheme } from "@/content/course-theme";

export type HeroStat = {
  value: string | number;
  unit?: string;
  label: string;
};

/** 静态类名映射：Tailwind JIT 无法识别动态拼接的 grid-cols */
const STAT_GRID: Record<number, string> = {
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

/**
 * 首页深色几何横幅：新访客介绍版与回访 Dashboard 版共用。
 * 背景为内联 SVG（经纬网格 + 地球圆弧），右侧叠五门课主题色圆点，
 * 配色全部走 globals.css 既有 HSL 变量与 course-theme，不新增 token。
 */
export default function HomeHero({
  eyebrow,
  title,
  description,
  actions,
  stats,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  actions: ReactNode;
  stats?: HeroStat[];
}) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-border shadow-card">
      {/* 底色 + 品牌色渐变光晕 */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, hsl(170 45% 16%) 0%, hsl(162 55% 20%) 55%, hsl(165 50% 24%) 100%)",
        }}
      />
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 420"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          <radialGradient id="hero-glow" cx="78%" cy="30%" r="70%">
            <stop offset="0%" stopColor="hsl(72 85% 68% / 0.14)" />
            <stop offset="100%" stopColor="hsl(72 85% 68% / 0)" />
          </radialGradient>
        </defs>
        <rect width="1200" height="420" fill="url(#hero-glow)" />
        <g fill="none" stroke="hsl(0 0% 100% / 0.10)" strokeWidth="1">
          {Array.from({ length: 13 }, (_, i) => (
            <line key={`v${i}`} x1={i * 100} y1="0" x2={i * 100} y2="420" />
          ))}
          {Array.from({ length: 5 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 105} x2="1200" y2={i * 105} />
          ))}
        </g>
        {/* 地球圆弧：右侧同心椭圆 + 轨道 */}
        <g
          fill="none"
          stroke="hsl(0 0% 100% / 0.16)"
          strokeWidth="1.2"
        >
          <circle cx="980" cy="180" r="120" strokeOpacity="0.5" />
          <circle cx="980" cy="180" r="80" strokeOpacity="0.35" />
          <ellipse cx="980" cy="180" rx="46" ry="120" strokeOpacity="0.3" />
          <ellipse
            cx="980"
            cy="180"
            rx="160"
            ry="44"
            transform="rotate(-18 980 180)"
            strokeOpacity="0.28"
          />
          <line x1="840" y1="180" x2="1120" y2="180" strokeOpacity="0.25" />
        </g>
        {/* 五门课主题色点缀 */}
        <g>
          {SKILL_REGISTRY.map((reg, i) => {
            const theme = getCourseTheme(reg.id);
            const cx = 760 + i * 78;
            const cy = 340 + (i % 2 === 0 ? 0 : -18);
            return (
              <circle
                key={reg.id}
                cx={cx}
                cy={cy}
                r={i === 0 ? 7 : 5}
                fill={`hsl(${theme.from} / 0.65)`}
              />
            );
          })}
        </g>
      </svg>

      <div className="relative p-5 sm:p-8 lg:p-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
          {eyebrow}
        </p>
        <h1 className="mt-2.5 max-w-3xl text-[26px] font-semibold leading-[1.25] tracking-[-0.02em] text-white sm:text-[32px] lg:text-[36px]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-white/80 sm:text-[15px]">
            {description}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          {actions}
        </div>

        {stats && stats.length > 0 && (
          <dl
            className={`mt-7 grid grid-cols-2 gap-4 border-t border-white/15 pt-5 ${
              STAT_GRID[stats.length] ?? "sm:grid-cols-4"
            }`}
          >
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse">
                <dt className="mt-1 text-[11px] text-white/60 sm:text-[12px]">
                  {s.label}
                </dt>
                <dd className="flex items-baseline gap-1 font-semibold tracking-tight text-white">
                  <span className="tabular text-[22px] sm:text-[26px]">
                    {s.value}
                  </span>
                  {s.unit && (
                    <span className="text-[12px] font-medium text-white/65">
                      {s.unit}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
