import { SKILL_REGISTRY } from "@/content/registry";
import { getQuestionFile } from "@/lib/content";

export type SearchHit = {
  key: string;
  skill: string;
  skillTitle: string;
  module: string;
  chapterTitle: string;
  where: "chapter" | "question";
  title: string;
  snippet: string;
  href: string;
};

export const MAX_SEARCH_HITS = 8;

/** 跨课程检索章节标题/摘要与题干；少于 2 个字符时不展开建议 */
export function searchContent(query: string): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];

  const hits: SearchHit[] = [];
  for (const registration of SKILL_REGISTRY) {
    for (const chapter of registration.modules) {
      const chapterHaystack = `${chapter.title} ${chapter.summary}`.toLowerCase();
      if (chapterHaystack.includes(needle)) {
        hits.push({
          key: `${registration.id}:${chapter.slug}:chapter`,
          skill: registration.id,
          skillTitle: registration.title,
          module: chapter.slug,
          chapterTitle: chapter.title,
          where: "chapter",
          title: chapter.title,
          snippet: chapter.summary,
          href: `/s/${registration.id}/${chapter.slug}`,
        });
      }

      const questions = getQuestionFile(registration.id, chapter.slug).questions;
      for (const question of questions) {
        if (!question.stem.toLowerCase().includes(needle)) continue;
        hits.push({
          key: question.id,
          skill: registration.id,
          skillTitle: registration.title,
          module: chapter.slug,
          chapterTitle: chapter.title,
          where: "question",
          title: "题目",
          snippet: question.stem,
          href: `/s/${registration.id}/${chapter.slug}/quiz`,
        });
        if (hits.length >= 40) break;
      }
      if (hits.length >= 40) break;
    }
    if (hits.length >= 40) break;
  }

  return hits
    .sort((a, b) => {
      if (a.where !== b.where) return a.where === "chapter" ? -1 : 1;
      return a.skillTitle.localeCompare(b.skillTitle, "zh-CN");
    })
    .slice(0, MAX_SEARCH_HITS);
}
