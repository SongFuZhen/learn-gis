import { notFound } from "next/navigation";
import QuizRunner from "@/components/quiz/QuizRunner";
import { SKILLS, getModule, getModules, getQuestions } from "@/lib/content";

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
  return {
    title: `测验 · ${moduleMeta.title}`,
    description: `${moduleMeta.title} 章节测验：逐题判卷、错题讲解与复习排期。`,
  };
}

export default async function QuizPage({
  params,
}: {
  params: Promise<{ skill: string; module: string }>;
}) {
  const { skill: skillId, module: moduleSlug } = await params;
  const moduleMeta = getModule(skillId, moduleSlug);
  if (!moduleMeta) notFound();

  const questions = getQuestions(skillId, moduleSlug);

  return (
    <QuizRunner
      skill={skillId}
      moduleSlug={moduleSlug}
      moduleTitle={moduleMeta.title}
      questions={questions}
    />
  );
}
