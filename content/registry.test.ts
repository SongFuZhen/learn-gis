import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GIS_MODULES, PLANNED_MODULES } from "@/content/gis/modules";
import { rawQuestionsFor } from "@/content/gis/questions";
import { LESSON_FILES } from "@/content/gis/lessons";
import { questionFileSchema } from "@/content/schema";

/** 内容注册表与文件系统的一致性：防止「加了章节却忘加讲义/题库」 */
describe("content registry", () => {
  it("每个已上线模块都有题库且通过 schema", () => {
    for (const moduleMeta of GIS_MODULES) {
      const parsed = questionFileSchema.safeParse(rawQuestionsFor(moduleMeta.slug));
      expect(parsed.success, `题库 ${moduleMeta.slug} 校验失败`).toBe(true);
    }
  });

  it("每个已上线模块都在讲义注册表里，且文件真实存在", () => {
    for (const moduleMeta of GIS_MODULES) {
      expect(LESSON_FILES, `讲义未注册：${moduleMeta.file}`).toContain(
        moduleMeta.file,
      );
      const file = path.resolve(__dirname, "gis", `${moduleMeta.file}.mdx`);
      expect(existsSync(file), `讲义文件缺失：${moduleMeta.file}.mdx`).toBe(true);
      expect(readFileSync(file, "utf8").length).toBeGreaterThan(500);
    }
  });

  it("题库文件的 module 与目录章节号一致", () => {
    for (const moduleMeta of GIS_MODULES) {
      const parsed = questionFileSchema.parse(rawQuestionsFor(moduleMeta.slug));
      expect(parsed.module).toBe(moduleMeta.slug);
      expect(moduleMeta.file.startsWith(moduleMeta.slug)).toBe(true);
    }
  });

  it("已上线 + 待上线章节号不重复且连续", () => {
    const slugs = [...GIS_MODULES, ...PLANNED_MODULES].map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    // 从第一章（00 = 预备章节，01 = 地球与投影）起必须连续、不跳号
    const first = Number(GIS_MODULES[0]?.slug);
    expect(GIS_MODULES.map((m) => m.slug)).toEqual(
      Array.from({ length: GIS_MODULES.length }, (_, i) =>
        String(first + i).padStart(2, "0"),
      ),
    );
  });

  it("题目 id 前缀与所属章节一致", () => {
    for (const moduleMeta of GIS_MODULES) {
      const parsed = questionFileSchema.parse(rawQuestionsFor(moduleMeta.slug));
      for (const q of parsed.questions) {
        expect(q.id.startsWith(`gis-${moduleMeta.slug}-`)).toBe(true);
      }
    }
  });
});
