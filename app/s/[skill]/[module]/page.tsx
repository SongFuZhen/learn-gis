import Link from "next/link";
import { notFound } from "next/navigation";
import { getLesson, getModule, getQuestions, getSkill } from "@/lib/content";

export function generateStaticParams() {
  return [{ skill: "gis", module: "01" }];
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
    <div className="mx-auto w-full max-w-content">
      <div className="px-4 py-5 sm:px-6 sm:py-8">
        <nav className="text-[11px] text-foreground-tertiary">
          <Link href={`/s/${skillId}`} className="hover:text-foreground">
            {skill.title}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="font-mono">{moduleMeta.slug}</span>
        </nav>

        <header className="mt-3">
          <h1 className="text-[22px] font-semibold leading-snug tracking-tight sm:text-3xl">
            {moduleMeta.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-foreground-secondary sm:text-base">
            {moduleMeta.summary}
          </p>
          <div className="mt-4">
            <Link
              href={`/s/${skillId}/${moduleSlug}/quiz`}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover sm:inline-flex sm:w-auto"
            >
              开始测验 · {count} 题
            </Link>
            <p className="mt-2 text-[11px] text-foreground-tertiary">
              答错的题会自动进入复习队列，隔几天再回来看
            </p>
          </div>
        </header>

        <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-10">
          <article className="prose-lesson max-w-2xl">
            {Lesson ? <Lesson /> : <p>讲义正在编写中。</p>}
          </article>

          {/* 桌面端右栅格：把通栏空白变成可操作的信息 */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 rounded-xl border border-border bg-surface p-4">
              <p className="text-[11px] uppercase tracking-wider text-foreground-muted">
                本章
              </p>
              <p className="mt-1 text-sm font-medium">{moduleMeta.title}</p>
              <p className="mt-1 text-[13px] text-foreground-tertiary">
                讲义 1 篇 · {count} 道题
              </p>
              <Link
                href={`/s/${skillId}/${moduleSlug}/quiz`}
                className="mt-3 flex h-10 items-center justify-center rounded-lg bg-accent text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
              >
                开始测验
              </Link>
              <p className="mt-3 border-t border-border-subtle pt-3 text-[11px] leading-relaxed text-foreground-tertiary">
                答错先讲为什么错；掌握度低于 80% 建议重读后重练。
              </p>
            </div>
          </aside>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-5 sm:flex-row">
          <Link
            href={`/s/${skillId}/${moduleSlug}/quiz`}
            className="flex h-12 items-center justify-center rounded-lg bg-accent px-5 text-[15px] font-medium text-accent-foreground transition-colors hover:bg-accent-hover sm:h-11 sm:text-sm"
          >
            读完了，去做题
          </Link>
          <Link
            href={`/s/${skillId}`}
            className="flex h-12 items-center justify-center rounded-lg border border-border-strong px-5 text-[15px] transition-colors hover:bg-surface-hover sm:h-11 sm:text-sm"
          >
            返回章节列表
          </Link>
        </div>
      </div>
    </div>
  );
}
