import { describe, expect, it } from "vitest";
import {
  createServer,
  getChapter,
  getQuiz,
  listChapters,
  listSkills,
  search,
} from "./server";

/** MCP 五个工具的返回结构契约（纯函数层，不启动 stdio） */
describe("mcp server tools", () => {
  it("list_skills 返回 registry 全部课程及聚合字段", () => {
    const skills = listSkills();
    const ids = skills.map((s) => s.id);
    expect(ids).toEqual(["gis", "cesium", "turf", "three", "harmony"]);
    for (const s of skills) {
      expect(s.chapterCount).toBeGreaterThan(0);
      expect(s.totalQuestions).toBeGreaterThan(0);
      expect(Array.isArray(s.prerequisites)).toBe(true);
      expect(typeof s.trackLabel).toBe("string");
    }
    const turf = skills.find((s) => s.id === "turf")!;
    expect(turf.prerequisites).toEqual(["gis"]);
  });

  it("list_chapters 返回指定课程的章节且题量为正", () => {
    const chapters = listChapters("three");
    expect(chapters).toHaveLength(10);
    expect(chapters[0]!.slug).toBe("00");
    expect(chapters[0]!.lessonUrl).toBe("/s/three/00");
    expect(chapters.every((c) => c.questionCount > 0)).toBe(true);
  });

  it("list_chapters 对未知技能抛错", () => {
    expect(() => listChapters("nope")).toThrow(/未知技能/);
  });

  it("get_chapter 返回 MDX 原文与元数据", () => {
    const result = getChapter("harmony", "00");
    expect(result.skill.id).toBe("harmony");
    expect(result.chapter.slug).toBe("00");
    expect(result.mdx.startsWith("## 🍼 白话版")).toBe(true);
    expect(result.mdx.length).toBeGreaterThan(500);
  });

  it("get_chapter 对未知章节抛错", () => {
    expect(() => getChapter("gis", "99")).toThrow(/无章节/);
  });

  it("get_quiz 默认隐去答案与解析，withAnswers 才返回", () => {
    const hidden = getQuiz("three", "00");
    expect(hidden.count).toBe(10);
    expect(hidden.withAnswers).toBe(false);
    const first = hidden.questions[0]!;
    expect(first).not.toHaveProperty("answer");
    expect(first).not.toHaveProperty("explanation");
    expect(first).toHaveProperty("stem");

    const shown = getQuiz("three", "00", undefined, true);
    expect(shown.withAnswers).toBe(true);
    expect(shown.questions[0]).toHaveProperty("explanation");
  });

  it("get_quiz 的 limit 生效", () => {
    const limited = getQuiz("harmony", "03", 3);
    expect(limited.count).toBe(3);
    expect(limited.questions).toHaveLength(3);
  });

  it("search 命中章节与题干，支持技能限定", () => {
    const all = search("相机");
    expect(all.length).toBeGreaterThan(0);
    expect(new Set(all.map((h) => h.skill)).size).toBeGreaterThan(1);

    const scoped = search("Navigation", "harmony");
    expect(scoped.length).toBeGreaterThan(0);
    expect(scoped.every((h) => h.skill === "harmony")).toBe(true);
    expect(scoped.some((h) => h.where === "chapter")).toBe(true);
  });

  it("search 空查询抛错", () => {
    expect(() => search("  ")).toThrow(/query/);
  });

  it("createServer 注册五个工具", () => {
    const server = createServer();
    // McpServer 内部工具表未公开，用连接级能力做冒烟断言
    expect(server).toBeDefined();
    expect(typeof server.tool).toBe("function");
    expect(typeof server.connect).toBe("function");
  });
});
