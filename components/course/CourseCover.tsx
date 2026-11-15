import { createElement, type CSSProperties } from "react";
import { getCourseTheme } from "@/content/course-theme";
import { getSkillIcon } from "@/content/icons";
import { cn } from "@/lib/utils";

/**
 * 课程几何封面：纯内联 SVG，无图片资源。
 * 亮色变量走 inline style，暗色走 Tailwind arbitrary property 覆盖（dark: 前缀），
 * 不向 globals.css 新增变量。
 */
export default function CourseCover({
  skillId,
  icon,
  size = "card",
  className,
}: {
  skillId: string;
  icon: Parameters<typeof getSkillIcon>[0];
  size?: "card" | "banner";
  className?: string;
}) {
  const theme = getCourseTheme(skillId);
  const iconClasses = cn(
    "absolute right-4 top-1/2 -translate-y-1/2 text-white/25 dark:text-white/15",
    size === "card" ? "h-16 w-16 sm:h-20 sm:w-20" : "h-24 w-24",
  );

  const style = {
    "--cover-from": `hsl(${theme.from})`,
    "--cover-to": `hsl(${theme.to})`,
    "--cover-line": `hsl(${theme.line})`,
  } as CSSProperties;

  const darkVars = [
    `dark:[--cover-from:hsl(${theme.darkFrom.replace(/ /g, "_")})]`,
    `dark:[--cover-to:hsl(${theme.darkTo.replace(/ /g, "_")})]`,
    `dark:[--cover-line:hsl(${theme.darkLine.replace(/ /g, "_")})]`,
  ].join(" ");

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        size === "card" ? "h-28 sm:h-32" : "h-36 sm:h-44",
        darkVars,
        className,
      )}
      style={style}
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          <linearGradient id={`cover-bg-${skillId}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--cover-from)" />
            <stop offset="100%" stopColor="var(--cover-to)" />
          </linearGradient>
        </defs>
        <rect
          width="400"
          height="200"
          fill={`url(#cover-bg-${skillId})`}
        />
        <Pattern pattern={theme.pattern} />
      </svg>
      {createElement(getSkillIcon(icon), {
        className: iconClasses,
        strokeWidth: 1.2,
      })}
    </div>
  );
}

/** 按主题图案渲染几何线条，统一在 400×200 画布内 */
function Pattern({ pattern }: { pattern: ReturnType<typeof getCourseTheme>["pattern"] }) {
  const stroke = "var(--cover-line)";
  switch (pattern) {
    case "grid":
      return (
        <g fill="none" stroke={stroke} strokeWidth="1">
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="200" strokeOpacity="0.18" />
          ))}
          {Array.from({ length: 5 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 50} x2="400" y2={i * 50} strokeOpacity="0.18" />
          ))}
          <circle cx="120" cy="90" r="26" strokeOpacity="0.55" />
          <circle cx="120" cy="90" r="4" fill={stroke} stroke="none" fillOpacity="0.7" />
          <path d="M250 150 l18 -34 l18 34 z" strokeOpacity="0.5" />
        </g>
      );
    case "polygons":
      return (
        <g fill="none" stroke={stroke} strokeWidth="1.2">
          <circle cx="140" cy="100" r="22" strokeOpacity="0.6" />
          <circle cx="140" cy="100" r="42" strokeOpacity="0.35" />
          <circle cx="140" cy="100" r="62" strokeOpacity="0.18" />
          <polygon points="250,52 310,78 300,140 240,142 218,86" strokeOpacity="0.55" />
          <polygon points="268,4 316,20 308,60 262,58 248,22" strokeOpacity="0.3" />
        </g>
      );
    case "globe":
      return (
        <g fill="none" stroke={stroke} strokeWidth="1.1">
          <circle cx="150" cy="100" r="66" strokeOpacity="0.55" />
          <ellipse cx="150" cy="100" rx="30" ry="66" strokeOpacity="0.35" />
          <ellipse cx="150" cy="100" rx="52" ry="66" strokeOpacity="0.25" />
          <line x1="84" y1="100" x2="216" y2="100" strokeOpacity="0.4" />
          <ellipse cx="268" cy="96" rx="90" ry="26" strokeOpacity="0.3" transform="rotate(-18 268 96)" />
          <circle cx="330" cy="62" r="4" fill={stroke} stroke="none" fillOpacity="0.7" />
        </g>
      );
    case "cube":
      return (
        <g stroke={stroke} strokeWidth="1.2" strokeLinejoin="round">
          <polygon points="150,40 210,74 150,108 90,74" fillOpacity="0.14" fill={stroke} strokeOpacity="0.6" />
          <polygon points="90,74 150,108 150,176 90,142" fillOpacity="0.28" fill={stroke} strokeOpacity="0.55" />
          <polygon points="210,74 150,108 150,176 210,142" fillOpacity="0.08" fill={stroke} strokeOpacity="0.5" />
          <polygon points="268,118 300,136 268,154 236,136" fillOpacity="0.2" fill={stroke} strokeOpacity="0.4" />
        </g>
      );
    case "hex":
      return (
        <g fill="none" stroke={stroke} strokeWidth="1.1">
          {HexGrid().map((points, i) => (
            <polygon
              key={i}
              points={points}
              strokeOpacity={i % 3 === 0 ? "0.5" : "0.22"}
              fill={i % 3 === 0 ? stroke : "none"}
              fillOpacity={i % 3 === 0 ? "0.12" : 0}
            />
          ))}
        </g>
      );
  }
}

/** 蜂窝六边形顶点（半径 22，横向 3 排） */
function HexGrid(): string[] {
  const r = 22;
  const w = Math.sqrt(3) * r;
  const h = 2 * r;
  const cells: string[] = [];
  for (let row = -1; row <= 2; row += 1) {
    for (let col = -1; col <= 5; col += 1) {
      const cx = col * w + (row % 2 ? w / 2 : 0) + 40;
      const cy = row * h * 0.75 + 90;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 180) * (60 * i - 30);
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      });
      cells.push(pts.join(" "));
    }
  }
  return cells;
}
