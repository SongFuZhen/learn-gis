import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatIssues, questionFileSchema } from "./schema";

const CONTENT_DIR = path.resolve(__dirname, "gis");

function questionFiles(): string[] {
  return readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".questions.json"));
}

describe("content/gis 题库", () => {
  const files = questionFiles();

  it("至少存在一个题库文件", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s 通过 schema 校验", (file) => {
    const raw: unknown = JSON.parse(
      readFileSync(path.join(CONTENT_DIR, file), "utf8"),
    );
    const parsed = questionFileSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`${file}\n${formatIssues(parsed.error)}`);
    }
    expect(parsed.success).toBe(true);
  });

  it.each(files)("%s 的题干与解析非空且题目数量合理", (file) => {
    const parsed = questionFileSchema.parse(
      JSON.parse(readFileSync(path.join(CONTENT_DIR, file), "utf8")),
    );
    expect(parsed.questions.length).toBeGreaterThanOrEqual(1);
    for (const question of parsed.questions) {
      expect(question.stem.trim().length).toBeGreaterThan(0);
      expect(question.explanation.trim().length).toBeGreaterThan(0);
    }
  });

  it("题目 id 全局唯一", () => {
    const ids = files.flatMap((file) => {
      const parsed = questionFileSchema.parse(
        JSON.parse(readFileSync(path.join(CONTENT_DIR, file), "utf8")),
      );
      return parsed.questions.map((q) => q.id);
    });
    expect(new Set(ids).size).toBe(ids.length);
  });
});
