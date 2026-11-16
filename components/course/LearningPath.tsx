import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SKILL_REGISTRY } from "@/content/registry";
import { getCourseTheme } from "@/content/course-theme";
import { getSkillIcon } from "@/content/icons";

/**
 * 学习路径链：GIS 基础 → Turf/Cesium（并列进阶）→ three.js → HarmonyOS。
 * 移动端横向滚动，桌面端整链铺开。节点配色取自课程主题。
 */
const STAGES: string[][] = [
  ["gis"],
  ["turf", "cesium"],
  ["three"],
  ["harmony"],
];

export default function LearningPath() {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7">
      <h2 className="text-[15px] font-medium">学习路径</h2>
      <p className="mt-1 text-[13px] text-foreground-tertiary">
        按顺序学习门槛最低；Turf.js 与 CesiumJS 可二选一或并行。
      </p>

      <ol className="mt-5 flex items-stretch gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:gap-0">
        {STAGES.map((stage, stageIdx) => (
          <li key={stage.join("-")} className="flex shrink-0 items-center gap-2 sm:gap-0">
            <div className="flex flex-col gap-2.5">
              {stage.map((id) => {
                const reg = SKILL_REGISTRY.find((r) => r.id === id);
                if (!reg) return null;
                const theme = getCourseTheme(id);
                const Icon = getSkillIcon(reg.icon);
                return (
                  <Link
                    key={id}
                    href={`/s/${id}`}
                    className="group flex items-center gap-3 rounded-lg border border-border-subtle bg-background-subtle px-4 py-3 transition-colors hover:border-brand/40"
                  >
                    <span
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{
                        background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))`,
                      }}
                    >
                      <Icon className="h-[22px] w-[22px]" strokeWidth={1.7} />
                    </span>
                    <span className="min-w-0">
                      <span className="block whitespace-nowrap text-[14px] font-medium group-hover:text-brand">
                        {reg.title}
                      </span>
                      <span className="mt-0.5 block whitespace-nowrap text-[12px] text-foreground-tertiary">
                        {reg.difficulty} · 约 {reg.estimatedHours}h
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
            {stageIdx < STAGES.length - 1 && (
              <ChevronRight
                className="mx-1.5 h-5 w-5 shrink-0 text-foreground-disabled"
                strokeWidth={1.7}
              />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
