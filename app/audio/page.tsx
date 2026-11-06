import type { Metadata } from "next";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Headphones } from "lucide-react";
import SpeechBar from "@/components/lesson/SpeechBar";
import { GIS_MODULES } from "@/content/gis/modules";
import { chapterNo } from "@/lib/content";

export const metadata: Metadata = {
  title: "讲义音频",
};

/** 从预生成 manifest 统计已生成的段落总数（读不到时静默为 0） */
function countSegments(): number {
  try {
    const dir = path.join(process.cwd(), "public", "audio");
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .reduce((sum, d) => {
        try {
          const m = JSON.parse(
            readFileSync(path.join(dir, d.name, "manifest.json"), "utf8"),
          ) as { segmentCount?: number };
          return sum + (m.segmentCount ?? 0);
        } catch {
          return sum;
        }
      }, 0);
  } catch {
    return 0;
  }
}

export default function AudioPage() {
  const totalSegments = countSegments();

  return (
    <div className="w-full px-4 pb-8 pt-5 sm:px-6 lg:px-8 lg:pt-10">
      {/* 页头：标题 + 统计 */}
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
              讲义音频
            </h1>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-foreground-secondary">
              全部章节的朗读音频，点「朗读本节」从开头播放。想边听边看正文、按段落跳播，点章节标题进入对应讲义页。
            </p>
          </div>
          <p className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] tabular text-foreground-tertiary shadow-card">
            <Headphones className="h-3.5 w-3.5" strokeWidth={1.8} />
            {GIS_MODULES.length} 章 · {totalSegments} 段 · 统一音色
          </p>
        </div>

        {/* 章节卡片网格：窄屏单列，md 起双列 */}
        <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {GIS_MODULES.map((m, i) => (
            <li
              key={m.slug}
              className="flex flex-col rounded-lg border border-border bg-card p-4 shadow-card"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-brand-soft font-mono text-xs text-brand-ink">
                  {chapterNo(m.slug)}
                </span>
                <Link
                  href={`/s/gis/${m.slug}`}
                  className="min-w-0 flex-1 truncate text-[15px] font-medium leading-snug hover:text-brand"
                  title={m.title}
                >
                  {m.title}
                </Link>
              </div>
              <div className="mt-3 flex-1">
                <SpeechBar slug={m.file} compact />
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-5 text-center text-[12px] text-foreground-muted">
          CesiumJS 课的朗读音频尚未录制，上线后会出现在这里。
        </p>
      </div>
    </div>
  );
}
