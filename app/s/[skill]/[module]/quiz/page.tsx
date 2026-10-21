import { notFound } from "next/navigation";
import QuizRunner from "@/components/quiz/QuizRunner";
import { getModule, getModules, getQuestions } from "@/lib/content";

export function generateStaticParams() {
  return getModules("gis").map((m) => ({ skill: "gis", module: m.slug }));
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
