import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getModules,
  getQuestionFile,
  getSkill,
  SKILLS,
} from "@/lib/content";

export function generateStaticParams() {
  return SKILLS.map((skill) => ({ skill: skill.id }));
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

  return (
    <div className="mx-auto w-full max-w-content px-4 py-8 sm:px-6 sm:py-10">
      <p className="text-[11px] uppercase tracking-[0.18em] text-accent">
        Skill pack · {skillId}
      </p>
      <h1 className="mt-2 text-[22px] font-semibold tracking-tight sm:text-3xl">
        {skill.title}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-secondary sm:text-base">
        {skill.description}
      </p>

      <ol className="mt-7 flex flex-col gap-2">
        {modules.map((moduleMeta) => {
          const count = getQuestionFile(skillId, moduleMeta.slug).questions.length;
          return (
            <li key={moduleMeta.slug}>
              <Link
                href={`/s/${skillId}/${moduleMeta.slug}`}
                className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-hover"
              >
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 font-mono text-xs text-accent">
                  {moduleMeta.slug}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-medium">
                      {moduleMeta.title}
                    </span>
                    <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] tabular text-foreground-tertiary">
                      {count} 题
                    </span>
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-foreground-tertiary">
                    {moduleMeta.summary}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
