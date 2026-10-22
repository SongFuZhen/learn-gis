import {
  pgSchema,
  uuid,
  text,
  integer,
  real,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// 所有表统一放在 gis schema 下（同 ../ink_template 的 ink schema 做法）
export const gis = pgSchema("gis");

/** 用户表：当前为访客制（cookie 里的匿名 id），后续接登录再扩展 */
export const users = gis.table("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});

/** 章节进度：每章的掌握度、答题量、错题量 */
export const moduleProgress = gis.table("module_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  moduleSlug: text("module_slug").notNull(),
  /** 掌握度（0~100）：章节测验成绩滚动平均 */
  mastery: real("mastery").notNull().default(0),
  /** 已完成章节测验次数（mastery 平均的权重） */
  quizCount: integer("quiz_count").notNull().default(0),
  totalAttempts: integer("total_attempts").notNull().default(0),
  wrongCount: integer("wrong_count").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
});

/** 错题记录：每道题做错时追加一条，复习时按 questionId 聚合 */
export const wrongAnswers = gis.table("wrong_answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  questionId: text("question_id").notNull(),
  moduleSlug: text("module_slug").notNull(),
  /** 答对（复习）后标记消除；null = 仍在复习队列 */
  clearedAt: timestamp("cleared_at"),
  wrongAt: timestamp("wrong_at").notNull().defaultNow(),
}, (table) => [
  // 同一题每用户只保留一条未消除记录，避免重做时复习队列出现重复
  unique("uq_wrong_user_question").on(table.userId, table.questionId),
]);

/** 考试记录：每日一考 / 综合考试的成绩 */
export const examSessions = gis.table("exam_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  mode: text("mode", { enum: ["daily", "mock"] }).notNull(),
  size: integer("size").notNull(),
  correct: integer("correct").notNull(),
  mastery: real("mastery").notNull(),
  /** 每日卷去重键 YYYY-MM-DD；综合卷为 null */
  dateKey: text("date_key"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  // 每日一卷去重：同一用户同一天只保留一条（date_key 为 null 的综合卷不受限）
  unique("uq_exam_user_datekey").on(table.userId, table.dateKey),
]);
