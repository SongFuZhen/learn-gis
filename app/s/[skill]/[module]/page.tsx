import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import ModulePager from "@/components/ModulePager";
import FloatingToc from "@/components/FloatingToc";
import SpeechBar from "@/components/lesson/SpeechBar";
import AnnotationLayer from "@/components/lesson/annotations/AnnotationLayer";
import AnnotationPanel from "@/components/lesson/annotations/AnnotationPanel";
import { SKILLS,
  getLesson,
  getModule,
  getModules,
  getQuestions,
  getSkill,
} from "@/lib/content";
import { PASS_LINE } from "@/lib/quiz/exam";
import { extractToc } from "@/lib/toc";

export function generateStaticParams() {
  return SKILLS.flatMap((s) =>
    getModules(s.id).map((m) => ({ skill: s.id, module: m.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ skill: string; module: string }>;
}) {
  const { skill, module: moduleSlug } = await params;
  const moduleMeta = getModule(skill, moduleSlug);
  if (!moduleMeta) return {};
  return { title: moduleMeta.title, description: moduleMeta.summary };
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ skill: string; module: string }>;
}) {
  const { skill: skillId, module: moduleSlug } = await params;
  const skill = getSkill(skillId);
  const moduleMeta = getModule(skillId, moduleSlug);
  if (!skill || !moduleMeta) notFound();

  const Lesson = await getLesson(skillId, moduleSlug);
  const count = getQuestions(skillId, moduleSlug).length;

  // 从 MDX 源码提取 h2 目录（id 生成规则与 mdx-components 的 h2 一致）
  const toc = extractToc(
    readFileSync(
      path.join(process.cwd(), "content", skillId, `${moduleMeta.file}.mdx`),
      "utf8",
    ),
  );

  // 连续阅读：按 GIS_MODULES 顺序取前后章节
  const modules = getModules(skillId);
  const idx = modules.findIndex((m) => m.slug === moduleSlug);
  const prev = idx > 0 ? (modules[idx - 1] ?? null) : null;
  const next =
    idx >= 0 && idx < modules.length - 1 ? (modules[idx + 1] ?? null) : null;

  return (
    <div className="w-full px-4 py-5 sm:px-6 sm:py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-12 lg:px-8 lg:py-10">
      <div className="min-w-0">
        <nav className="truncate text-[12px] text-foreground-muted">
          <Link href={`/s/${skillId}`} className="hover:text-brand">
            {skill.title}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground-secondary">
            第 {idx + 1} / {modules.length} 章
          </span>
          <span className="mx-1.5 text-foreground-disabled">·</span>
          <span className="text-foreground-tertiary">{moduleMeta.title}</span>
        </nav>

        <header className="mt-3 max-w-3xl lg:max-w-none">
          <h1 className="text-[24px] font-semibold leading-snug tracking-[-0.02em] sm:text-[30px] lg:text-[32px]">
            {moduleMeta.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-foreground-secondary sm:text-[15px]">
            {moduleMeta.summary}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={`/s/${skillId}/${moduleSlug}/quiz`}
              className="inline-flex h-11 items-center justify-center rounded-sm bg-brand-gradient px-5 text-sm font-medium text-white shadow-brand transition-opacity hover:opacity-95"
            >
              开始测验 · {count} 题
            </Link>
            <span className="text-[12px] text-foreground-tertiary">
              答错的题会自动进入复习队列
            </span>
          </div>

          {/* 音频 manifest 以章节文件名（file）为目录，而非 URL slug */}
          <SpeechBar slug={moduleMeta.file} />
        </header>

        <AnnotationLayer skill={skillId} moduleSlug={moduleSlug}>
          <article className="prose-lesson mt-8 max-w-[42rem] lg:max-w-none">
            {Lesson ? <Lesson /> : <p>讲义正在编写中。</p>}
          </article>
        </AnnotationLayer>

        <div className="mt-8 border-t border-border pt-5">
          <Link
            href={`/s/${skillId}/${moduleSlug}/quiz`}
            className="flex h-12 w-full items-center justify-center rounded-sm bg-brand-gradient px-5 text-[15px] font-medium text-white shadow-brand transition-opacity hover:opacity-95 sm:w-auto sm:text-sm"
          >
            读完了，去做题
          </Link>
        </div>

        {/* 连续阅读：上一章 / 下一章 */}
        <div className="mt-6">
          <ModulePager skillId={skillId} prev={prev} next={next} />
        </div>
      </div>

      {/* 桌面目录从页面顶部开始吸附，滚动讲义时始终留在原位 */}
      <aside className="hidden lg:sticky lg:top-10 lg:block">
        <div className="rounded-md border border-border bg-card p-4 shadow-card">
          <p className="text-[11px] uppercase tracking-wider text-foreground-muted">
            本章
          </p>
          <p className="mt-1 text-sm font-medium">{moduleMeta.title}</p>
          <p className="mt-1 text-[13px] text-foreground-tertiary">
            讲义 1 篇 · {count} 道题
          </p>
          <Link
            href={`/s/${skillId}/${moduleSlug}/quiz`}
            className="mt-3 flex h-10 items-center justify-center rounded-sm bg-brand-gradient text-sm font-medium text-white transition-opacity hover:opacity-95"
          >
            开始测验
          </Link>
          {toc.length > 0 && (
            <nav
              aria-label="本章目录"
              className="mt-3 border-t border-border-subtle pt-3"
            >
              <p className="text-[11px] uppercase tracking-wider text-foreground-muted">
                本章目录
              </p>
              <ul className="mt-2 max-h-[38vh] space-y-0.5 overflow-y-auto">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="block truncate text-[13px] leading-relaxed text-foreground-secondary transition-colors hover:text-brand"
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <AnnotationPanel />
          <div className="mt-3 border-t border-border-subtle pt-3">
            <p className="text-[12px] leading-relaxed text-foreground-tertiary">
              答错先讲为什么错；掌握度低于 {PASS_LINE}% 建议重读后重练。
            </p>
          </div>
        </div>
      </aside>

      {/* 移动端悬浮本章目录 */}
      <FloatingToc items={toc} />
    </div>
  );
}
