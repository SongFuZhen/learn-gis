import type { Metadata } from "next";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { Headphones } from "lucide-react";
import AudioCourseList, {
  type AudioCourse,
} from "@/components/audio/AudioCourseList";
import { SKILL_REGISTRY } from "@/content/registry";

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

/** 某技能已有音频 manifest 的章节数（生成中的课程用于页内提示） */
function countManifests(dirName: string): number {
  try {
    const reg = SKILL_REGISTRY.find((r) => r.id === dirName);
    if (!reg) return 0;
    return reg.modules.filter((m) =>
      existsSync(
        path.join(process.cwd(), "public", "audio", m.file, "manifest.json"),
      ),
    ).length;
  } catch {
    return 0;
  }
}

export default function AudioPage() {
  const totalSegments = countSegments();
  const courses: AudioCourse[] = SKILL_REGISTRY.map((reg) => ({
    id: reg.id,
    title: reg.title,
    icon: reg.icon,
    moduleCount: reg.modules.length,
    readyCount: countManifests(reg.id),
  }));

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {/* 页头：标题 + 统计 */}
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
              讲义音频
            </h1>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-foreground-secondary">
              按课程折叠收纳，展开后再播放章节朗读。想边听边看正文、按段落跳播，点章节标题进入对应讲义页。
            </p>
          </div>
          <p className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] tabular text-foreground-tertiary shadow-card">
            <Headphones className="h-3.5 w-3.5" strokeWidth={1.8} />
            {SKILL_REGISTRY.reduce((n, r) => n + r.modules.length, 0)} 章 ·{" "}
            {totalSegments} 段 · 统一音色
          </p>
        </div>

        <AudioCourseList courses={courses} />
      </div>
    </div>
  );
}
