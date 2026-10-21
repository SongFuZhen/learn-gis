import {
  pgSchema,
  uuid,
  text,
  integer,
  real,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/** 所有表放在 learn 模式下，不污染 public（与 ink_template 的 ink schema 同一实例共存） */
export const learn = pgSchema("learn");

/**
 * 学习进度：以匿名设备 ID 为维度（v1 无账号体系）。
 * deviceId 由浏览器生成并持久化，迁移到账号时把 deviceId 并入 userId 即可。
 */
export const moduleProgress = learn.table(
  "module_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceId: text("device_id").notNull(),
    skill: text("skill").notNull(),
    moduleSlug: text("module_slug").notNull(),
    bestScore: real("best_score").notNull().default(0),
    lastScore: real("last_score").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("module_progress_device_idx").on(t.deviceId, t.skill, t.moduleSlug)],
);

/** 间隔复习卡片（SM-2 简化版），一条记录对应一道题在某个设备上的复习状态 */
export const reviewCards = learn.table(
  "review_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceId: text("device_id").notNull(),
    questionId: text("question_id").notNull(),
    ease: real("ease").notNull().default(2.5),
    intervalDays: integer("interval_days").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull().defaultNow(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  },
  (t) => [index("review_cards_due_idx").on(t.deviceId, t.dueAt)],
);

/** 答题流水，用于掌握度统计与后续难度校准 */
export const attempts = learn.table(
  "attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceId: text("device_id").notNull(),
    questionId: text("question_id").notNull(),
    moduleSlug: text("module_slug").notNull(),
    correct: boolean("correct").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("attempts_device_idx").on(t.deviceId, t.createdAt)],
);
