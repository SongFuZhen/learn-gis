/**
 * learn-gis 只读 MCP 服务（stdio）。
 * 五个工具：list_skills / list_chapters / get_chapter / get_quiz / search。
 * 纯工具函数与 stdio 装配分离：vitest 直接 import 函数，不启动传输层。
 * 不写文件、不连数据库、无鉴权面。
 */
import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CURRICULUM, getCurriculumSkill } from "../content/curriculum";
import { getSkillRegistration } from "../content/registry";
import { questionFileSchema } from "../content/schema";

const CONTENT_ROOT = path.join(process.cwd(), "content");

function requireSkill(skillId: string) {
  const skill = getCurriculumSkill(skillId);
  if (!skill) {
    throw new Error(`未知技能 id：${skillId}（可选：${CURRICULUM.map((s) => s.id).join(", ")}）`);
  }
  return skill;
}

function requireChapter(skillId: string, moduleSlug: string) {
  const skill = requireSkill(skillId);
  const chapter = skill.chapters.find((c) => c.slug === moduleSlug);
  if (!chapter) {
    throw new Error(
      `技能 ${skillId} 下无章节 ${moduleSlug}（可选：${skill.chapters.map((c) => c.slug).join(", ")}）`,
    );
  }
  return { skill, chapter };
}

/** 工具 1：课程清单（轨道、章数、题数、前置依赖） */
export function listSkills() {
  return CURRICULUM.map((s) => ({
    id: s.id,
    title: s.title,
    track: s.track,
    trackLabel: s.trackLabel,
    description: s.description,
    prerequisites: s.prerequisites,
    chapterCount: s.chapterCount,
    totalQuestions: s.totalQuestions,
  }));
}

/** 工具 2：某门课的章节清单 */
export function listChapters(skillId: string) {
  const skill = requireSkill(skillId);
  return skill.chapters.map((c) => ({
    slug: c.slug,
    file: c.file,
    title: c.title,
    summary: c.summary,
    questionCount: c.questionCount,
    lessonUrl: `/s/${skill.id}/${c.slug}`,
  }));
}

/** 工具 3：讲义原文（MDX 文本）+ 章节元数据 */
export function getChapter(skillId: string, moduleSlug: string) {
  const { skill, chapter } = requireChapter(skillId, moduleSlug);
  const registration = getSkillRegistration(skillId);
  if (!registration) throw new Error(`注册表缺失：${skillId}`);
  const mdxPath = path.join(
    CONTENT_ROOT,
    registration.dir,
    `${chapter.file}.mdx`,
  );
  if (!fs.existsSync(mdxPath)) throw new Error(`讲义文件不存在：${mdxPath}`);
  return {
    skill: { id: skill.id, title: skill.title },
    chapter: {
      slug: chapter.slug,
      title: chapter.title,
      summary: chapter.summary,
    },
    mdx: fs.readFileSync(mdxPath, "utf8"),
  };
}

/** 工具 4：章节题库；withAnswers=false（默认）隐去 answer/explanation/hint */
export function getQuiz(
  skillId: string,
  moduleSlug: string,
  limit?: number,
  withAnswers = false,
) {
  const { skill, chapter } = requireChapter(skillId, moduleSlug);
  const registration = getSkillRegistration(skillId);
  if (!registration) throw new Error(`注册表缺失：${skillId}`);
  const parsed = questionFileSchema.parse(
    registration.rawQuestionsFor(moduleSlug),
  );
  const rows =
    typeof limit === "number" && limit > 0
      ? parsed.questions.slice(0, limit)
      : parsed.questions;
  const questions = rows.map((q) => {
    if (withAnswers) return q;
    const options =
      q.type === "single" || q.type === "multi"
        ? q.options.map((o) => ({ key: o.key, text: o.text }))
        : undefined;
    return {
      id: q.id,
      skill: q.skill,
      module: q.module,
      difficulty: q.difficulty,
      type: q.type,
      stem: q.stem,
      refs: q.refs,
      options,
    };
  });
  return {
    skill: skill.id,
    module: moduleSlug,
    chapterTitle: chapter.title,
    withAnswers,
    count: questions.length,
    questions,
  };
}

type SearchHit = {
  skill: string;
  module: string;
  chapterTitle: string;
  where: "chapter" | "question";
  questionId?: string;
  snippet: string;
};

/** 工具 5：跨章标题/摘要/题干检索（可选限定技能） */
export function search(query: string, skillId?: string): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) throw new Error("query 不能为空");
  const skills = skillId ? [requireSkill(skillId)] : CURRICULUM;
  const hits: SearchHit[] = [];
  for (const skill of skills) {
    for (const chapter of skill.chapters) {
      const hayChapter = `${chapter.title} ${chapter.summary}`.toLowerCase();
      if (hayChapter.includes(needle)) {
        hits.push({
          skill: skill.id,
          module: chapter.slug,
          chapterTitle: chapter.title,
          where: "chapter",
          snippet: chapter.summary,
        });
      }
      const registration = getSkillRegistration(skill.id);
      if (!registration) continue;
      const parsed = questionFileSchema.parse(
        registration.rawQuestionsFor(chapter.slug),
      );
      for (const q of parsed.questions) {
        if (q.stem.toLowerCase().includes(needle)) {
          hits.push({
            skill: skill.id,
            module: chapter.slug,
            chapterTitle: chapter.title,
            where: "question",
            questionId: q.id,
            snippet: q.stem,
          });
        }
      }
    }
  }
  return hits;
}

function text(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

export function createServer(): McpServer {
  const server = new McpServer({ name: "learn-gis", version: "0.1.0" });

  server.tool(
    "list_skills",
    "列出全部课程：id、轨道、章数、题数与前置依赖",
    {},
    async () => text(listSkills()),
  );

  server.tool(
    "list_chapters",
    "列出指定课程的章节（slug、标题、摘要、题量）",
    { skill: z.string().describe("技能 id，如 gis / cesium / turf / three / harmony") },
    async ({ skill }) => text(listChapters(skill)),
  );

  server.tool(
    "get_chapter",
    "读取某章讲义的原始 MDX 文本与元数据",
    {
      skill: z.string(),
      module: z.string().describe("两位章节 slug，如 00"),
    },
    async ({ skill, module }) => text(getChapter(skill, module)),
  );

  server.tool(
    "get_quiz",
    "读取某章题库；默认隐去答案与解析，withAnswers=true 才返回",
    {
      skill: z.string(),
      module: z.string(),
      limit: z.number().int().positive().optional(),
      withAnswers: z.boolean().optional().default(false),
    },
    async ({ skill, module, limit, withAnswers }) =>
      text(getQuiz(skill, module, limit, withAnswers)),
  );

  server.tool(
    "search",
    "跨课程检索章节标题/摘要与题干，可选用 skill 限定范围",
    {
      query: z.string().min(1),
      skill: z.string().optional(),
    },
    async ({ query, skill }) => text(search(query, skill)),
  );

  return server;
}

/** 仅在被 tsx 直接运行时启动 stdio；被 vitest import 时不启动 */
const entry = process.argv[1]?.replace(/\\/g, "/");
if (entry?.endsWith("mcp/server.ts")) {
  const transport = new StdioServerTransport();
  void createServer().connect(transport);
}
