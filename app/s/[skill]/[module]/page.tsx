import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getLesson,
  getModule,
  getModules,
  getQuestions,
  getSkill,
} from "@/lib/content";

export function generateStaticParams() {
  return getModules("gis").map((m) => ({ skill: "gis", module: m.slug }));
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

  return (
    <div className="w-full px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <nav className="text-[12px] text-foreground-muted">
        <Link href={`/s/${skillId}`} className="hover:text-brand">
          {skill.title}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="font-mono">{moduleMeta.slug}</span>
      </nav>

      <header className="mt-3 max-w-3xl">
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
      </header>

      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12 lg:items-start">
        <article className="prose-lesson max-w-3xl">
          {Lesson ? <Lesson /> : <p>讲义正在编写中。</p>}
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-8 rounded-md border border-border bg-card p-4 shadow-card">
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
            <p className="mt-3 border-t border-border-subtle pt-3 text-[12px] leading-relaxed text-foreground-tertiary">
              答错先讲为什么错；掌握度低于 80% 建议重读后重练。
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-8 flex flex-col gap-2 border-t border-border pt-5 sm:flex-row">
        <Link
          href={`/s/${skillId}/${moduleSlug}/quiz`}
          className="flex h-12 items-center justify-center rounded-sm bg-brand-gradient px-5 text-[15px] font-medium text-white shadow-brand transition-opacity hover:opacity-95 sm:h-11 sm:text-sm"
        >
          读完了，去做题
        </Link>
        <Link
          href={`/s/${skillId}`}
          className="flex h-12 items-center justify-center rounded-sm border border-border-strong bg-card px-5 text-[15px] font-medium transition-colors hover:bg-background-hover sm:h-11 sm:text-sm"
        >
          返回章节列表
        </Link>
      </div>
    </div>
  );
}
