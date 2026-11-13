import Link from "next/link";
import { notFound } from "next/navigation";
import {
  chapterNo,
  getModules,
  getQuestionFile,
  getSkill,
  SKILLS,
} from "@/lib/content";
import { SKILL_REGISTRY } from "@/content/registry";

export function generateStaticParams() {
  return SKILLS.map((skill) => ({ skill: skill.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ skill: string }>;
}) {
  const { skill: skillId } = await params;
  const skill = getSkill(skillId);
  if (!skill) return {};
  return { title: skill.title, description: skill.description };
}

export default async function SkillPage({
  params,
}: {
  params: Promise<{ skill: string }>;
}) {
  const { skill: skillId } = await params;
  const skill = getSkill(skillId);
  if (!skill) notFound();

  const modules = getModules(skillId);
  const registration = SKILL_REGISTRY.find((r) => r.id === skillId);
  const plannedModules = registration?.plannedModules ?? [];

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand-ink">
        Skill pack · {skillId}
      </p>
      <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.02em] sm:text-[32px] lg:text-[36px]">
        {skill.title}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-secondary sm:text-[15px]">
        {skill.description}
      </p>

      <ol className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((moduleMeta) => {
          const count = getQuestionFile(skillId, moduleMeta.slug).questions.length;
          return (
            <li key={moduleMeta.slug} className="min-w-0">
              <Link
                href={`/s/${skillId}/${moduleMeta.slug}`}
                className="flex h-full min-w-0 items-start gap-4 rounded-md border border-border bg-card p-5 shadow-card transition-colors hover:border-brand/40 hover:bg-background-subtle"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-brand-soft font-mono text-xs text-brand-ink">
                  {chapterNo(moduleMeta.slug)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-medium">{moduleMeta.title}</span>
                    <span className="shrink-0 rounded-sm bg-surface-muted px-1.5 py-0.5 text-[11px] tabular text-foreground-tertiary">
                      {count} 题
                    </span>
                  </span>
                  <span className="mt-1.5 block min-w-0 text-[13px] leading-relaxed text-foreground-tertiary [overflow-wrap:anywhere]">
                    {moduleMeta.summary}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        {plannedModules.map((m) => (
          <li
            key={m.slug}
            className="flex items-center gap-3 rounded-md border border-dashed border-border px-4 py-3 text-[13px] text-foreground-tertiary"
          >
            <span className="font-mono text-[11px] text-foreground-muted">
              {chapterNo(m.slug)}
            </span>
            {m.title}
            <span className="ml-auto text-[11px]">即将上线</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
