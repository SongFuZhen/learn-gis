import { z } from "zod";

/** 引用：题目必须给出可核查的权威来源 */
export const refSchema = z.object({
  title: z.string().min(1),
  url: z.url(),
});

const difficultySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

const baseQuestionShape = {
  id: z
    .string()
    .regex(/^[a-z]+-\d{2}-\d{3}$/, "id 形如 gis-01-001"),
  skill: z.string().min(1),
  module: z.string().min(1),
  difficulty: difficultySchema,
  stem: z.string().min(6, "题干过短"),
  explanation: z.string().min(10, "解析过短：必须解释为什么"),
  refs: z.array(refSchema).min(1, "至少一条权威引用"),
};

export const optionSchema = z.object({
  key: z.string().min(1),
  text: z.string().min(1),
  /** 选中该项时给出的针对性解释（干扰项级反馈） */
  hint: z.string().optional(),
});
export type QuizOption = z.infer<typeof optionSchema>;

/** 单选 / 多选 */
export const choiceQuestionSchema = z
  .object({
    ...baseQuestionShape,
    type: z.enum(["single", "multi"]),
    options: z.array(optionSchema).min(2).max(6),
    /** 正确答案的选项 key；单选长度必须为 1，多选至少 2 */
    answer: z.array(z.string().min(1)).min(1),
  })
  .refine(
    (q) => new Set(q.options.map((o) => o.key)).size === q.options.length,
    { message: "option key 重复", path: ["options"] },
  )
  .refine((q) => q.answer.every((k) => q.options.some((o) => o.key === k)), {
    message: "answer 中存在不在 options 里的 key",
    path: ["answer"],
  })
  .refine((q) => new Set(q.answer).size === q.answer.length, {
    message: "answer 存在重复 key",
    path: ["answer"],
  })
  .refine(
    (q) => (q.type === "single" ? q.answer.length === 1 : q.answer.length >= 2),
    { message: "single 必须 1 个答案，multi 至少 2 个", path: ["answer"] },
  );

/** 短答题（可接受答案数组，判卷前做规范化） */
export const shortQuestionSchema = z.object({
  ...baseQuestionShape,
  type: z.literal("short"),
  accepted: z.array(z.string().min(1)).min(1, "至少一个可接受答案"),
  placeholder: z.string().optional(),
});

export const questionSchema = z.union([
  choiceQuestionSchema,
  shortQuestionSchema,
]);

export type ChoiceQuestion = z.infer<typeof choiceQuestionSchema>;
export type ShortQuestion = z.infer<typeof shortQuestionSchema>;
export type Question = z.infer<typeof questionSchema>;

/** 一个模块一个题库文件 */
export const questionFileSchema = z
  .object({
    skill: z.string().min(1),
    module: z.string().min(1),
    version: z.number().int().positive(),
    questions: z.array(questionSchema).min(1),
  })
  .superRefine((file, ctx) => {
    const seen = new Set<string>();
    file.questions.forEach((q, i) => {
      if (seen.has(q.id)) {
        ctx.addIssue({
          code: "custom",
          message: `题目 id 重复：${q.id}`,
          path: ["questions", i, "id"],
        });
      }
      seen.add(q.id);

      if (q.skill !== file.skill) {
        ctx.addIssue({
          code: "custom",
          message: `skill 与题库文件不一致：${q.skill} != ${file.skill}`,
          path: ["questions", i, "skill"],
        });
      }
      if (q.module !== file.module) {
        ctx.addIssue({
          code: "custom",
          message: `module 与题库文件不一致：${q.module} != ${file.module}`,
          path: ["questions", i, "module"],
        });
      }
    });
  });

export type QuestionFile = z.infer<typeof questionFileSchema>;

/** 便于脚本输出友好错误 */
export function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}
