import type { Metadata } from "next";
import Link from "next/link";
import SpeechBar from "@/components/lesson/SpeechBar";
import { GIS_MODULES } from "@/content/gis/modules";

export const metadata: Metadata = {
  title: "讲义音频",
};

export default function AudioPage() {
  return (
    <div className="w-full px-4 pb-8 pt-5 sm:px-6 lg:px-8 lg:pt-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
          讲义音频
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-foreground-secondary">
          全部章节的朗读音频，点「朗读本节」从开头播放。想边听边看正文、按段落跳播，点章节标题进入对应讲义页。
        </p>

        <ol className="mt-5 flex flex-col gap-4">
          {GIS_MODULES.map((m, i) => (
            <li
              key={m.slug}
              className="rounded-lg border border-border bg-card p-4 shadow-card"
            >
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  href={`/s/gis/${m.slug}`}
                  className="text-[15px] font-medium leading-snug hover:text-brand"
                >
                  第 {i + 1} 章 · {m.title}
                </Link>
                <span className="shrink-0 text-[12px] tabular text-foreground-tertiary">
                  {m.file}
                </span>
              </div>
              <SpeechBar slug={m.file} compact />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
