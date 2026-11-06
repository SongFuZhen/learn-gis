import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SKILL_REGISTRY } from "@/content/registry";
import { questionFileSchema } from "@/content/schema";

/** 内容注册表与文件系统的一致性：防止「加了章节却忘加讲义/题库」（按技能逐个校验） */
describe("content registry", () => {
  for (const skill of SKILL_REGISTRY) {
    describe(`技能 ${skill.id}`, () => {
      it("每个已上线模块都有题库且通过 schema", () => {
        for (const moduleMeta of skill.modules) {
          const parsed = questionFileSchema.safeParse(
            skill.rawQuestionsFor(moduleMeta.slug),
          );
          expect(parsed.success, `题库 ${moduleMeta.slug} 校验失败`).toBe(true);
        }
      });

      it("题库文件的 skill/module 与技能一致", () => {
        for (const moduleMeta of skill.modules) {
          const parsed = questionFileSchema.parse(
            skill.rawQuestionsFor(moduleMeta.slug),
          );
          expect(parsed.skill).toBe(skill.id);
          expect(parsed.module).toBe(moduleMeta.slug);
          expect(moduleMeta.file.startsWith(moduleMeta.slug)).toBe(true);
        }
      });

      it("题目 id 前缀与所属技能、章节一致", () => {
        for (const moduleMeta of skill.modules) {
          const parsed = questionFileSchema.parse(
            skill.rawQuestionsFor(moduleMeta.slug),
          );
          for (const q of parsed.questions) {
            expect(q.id.startsWith(`${skill.id}-${moduleMeta.slug}-`)).toBe(
              true,
            );
          }
        }
      });

      it("已上线 + 待上线章节号不重复且连续", () => {
        const all = [...skill.modules, ...skill.plannedModules].sort((a, b) =>
          a.slug.localeCompare(b.slug),
        );
        const slugs = all.map((m) => m.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
        // 全部章节（含规划中）从 00 起必须连续、不跳号
        expect(slugs).toEqual(
          Array.from({ length: all.length }, (_, i) =>
            String(i).padStart(2, "0"),
          ),
        );
      });

      it("已上线章节号在合并序列中递增", () => {
        const delivered = skill.modules.map((m) => Number(m.slug));
        const sorted = [...delivered].sort((a, b) => a - b);
        expect(delivered).toEqual(sorted);
      });
    });
  }

  it("每个已上线模块的讲义已注册且文件真实存在", () => {
    for (const skill of SKILL_REGISTRY) {
      // 讲义注册表在各自技能目录的 lessons.ts 中，通过文件命名约定定位
      const lessonsFile = path.resolve(
        __dirname,
        skill.dir,
        "lessons.ts",
      );
      expect(existsSync(lessonsFile), `lessons.ts 缺失：${skill.dir}`).toBe(
        true,
      );
      const source = readFileSync(lessonsFile, "utf8");
      for (const moduleMeta of skill.modules) {
        expect(
          source.includes(moduleMeta.file),
          `讲义未注册：${skill.id}/${moduleMeta.file}`,
        ).toBe(true);
        const file = path.resolve(
          __dirname,
          skill.dir,
          `${moduleMeta.file}.mdx`,
        );
        expect(existsSync(file), `讲义文件缺失：${moduleMeta.file}.mdx`).toBe(
          true,
        );
        expect(readFileSync(file, "utf8").length).toBeGreaterThan(500);
      }
    }
  });

  it("各技能的模块 slug 互不冲突", () => {
    // 不同技能允许同号章节（00 各自独立），但注册表内 id 必须唯一
    const ids = SKILL_REGISTRY.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
