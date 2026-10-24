import type { ReactNode } from "react";

export type ExerciseTool =
  | "calc"
  | "proj4"
  | "qgis"
  | "gdal"
  | "leaflet"
  | "sql";

const TOOL_LABELS: Record<ExerciseTool, string> = {
  calc: "心算",
  proj4: "proj4js",
  qgis: "QGIS",
  gdal: "GDAL",
  leaflet: "Leaflet",
  sql: "SQL",
};

/**
 * 章节实操练习块：
 * <Exercise tool="gdal" title="练习：查看数据元信息">
 *   练习描述……
 *   <ExerciseSolution>参考答案……</ExerciseSolution>
 * </Exercise>
 *
 * 纯服务端组件：外层 details 展开练习内容，答案用嵌套 details
 * 二次折叠，先自己动手再对答案。零客户端 JS，SSG 友好。
 */
export default function Exercise({
  tool,
  title,
  children,
}: {
  tool?: ExerciseTool;
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="my-5 rounded-md border border-brand/30 bg-brand-soft/60 open:bg-brand-soft">
      <summary className="flex cursor-pointer select-none items-center gap-2.5 px-4 py-3 text-[0.9375rem] font-semibold text-brand-ink marker:content-['']">
        {tool ? (
          <span className="rounded-sm bg-brand/15 px-1.5 py-0.5 font-mono text-[11px] font-medium text-brand-ink">
            {TOOL_LABELS[tool]}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">{title}</span>
        <span
          className="text-[11px] font-normal text-foreground-muted"
          aria-hidden="true"
        >
          展开
        </span>
      </summary>
      <div className="exercise-body border-t border-brand/20 px-4 pb-4 pt-3 text-[0.9375rem] leading-relaxed text-foreground-secondary">
        {children}
      </div>
    </details>
  );
}

/** 练习的参考答案：嵌套 details，先动手再对答案 */
export function ExerciseSolution({ children }: { children: ReactNode }) {
  return (
    <details className="mt-3 rounded-sm border border-border/60 bg-background/60">
      <summary className="cursor-pointer select-none px-3 py-2 text-[13px] font-semibold text-foreground-muted marker:content-['']">
        查看参考答案
      </summary>
      <div className="px-3 pb-3 text-[0.9375rem] text-foreground-secondary">
        {children}
      </div>
    </details>
  );
}
