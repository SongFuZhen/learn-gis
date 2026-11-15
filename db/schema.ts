import {
  pgSchema,
  uuid,
  text,
  integer,
  real,
  timestamp,
  unique,
  uniqueIndex,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// 所有表统一放在 gis schema 下（同 ../ink_template 的 ink schema 做法）
export const gis = pgSchema("gis");

/**
 * 用户表：匿名访客行（username/passwordHash 为 null）与注册账号共存。
 * 注册 = 给当前匿名行就地补上账号字段，不新建行，业务表外键天然不变。
 */
export const users = gis.table(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    /** 登录名，统一存小写；匿名行为 null（PG 唯一索引允许多个 null） */
    username: text("username"),
    /** scrypt 串：scrypt$N$r$p$saltHex$hashHex */
    passwordHash: text("password_hash"),
  },
  (table) => [uniqueIndex("uq_users_username").on(table.username)],
);

/** 认证尝试：限流计数 + 安全审计（注册/登录都记，失败也落库） */
export const authAttempts = gis.table(
  "auth_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ip: text("ip").notNull(),
    /** 尝试的用户名（登录失败也记，用于账号级锁定） */
    username: text("username"),
    kind: text("kind", { enum: ["register", "login"] }).notNull(),
    success: boolean("success").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_auth_ip_time").on(table.ip, table.createdAt),
    index("idx_auth_user_time").on(table.username, table.createdAt),
  ],
);

/** 章节进度：每章的掌握度、答题量、错题量 */
export const moduleProgress = gis.table("module_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  moduleSlug: text("module_slug").notNull(),
  /** 所属技能：gis / cesium / …（同 slug 跨技能互不干扰） */
  skill: text("skill").notNull().default("gis"),
  /** 掌握度（0~100）：章节测验成绩滚动平均 */
  mastery: real("mastery").notNull().default(0),
  /** 已完成章节测验次数（mastery 平均的权重） */
  quizCount: integer("quiz_count").notNull().default(0),
  totalAttempts: integer("total_attempts").notNull().default(0),
  wrongCount: integer("wrong_count").notNull().default(0),
  /** 「不知道，跳过」次数：跳过按答错计入 wrongCount，此处单独计数用于统计展示 */
  skippedCount: integer("skipped_count").notNull().default(0),
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
  /** SM-2 卡状态 */
  ease: real("ease").notNull().default(2.5),
  intervalDays: integer("interval_days").notNull().default(0),
  reps: integer("reps").notNull().default(0),
  lapses: integer("lapses").notNull().default(0),
  /** 下次复习到期时间；null = 立即到期（新错或刚重置） */
  dueAt: timestamp("due_at"),
  /** 答对足够多次后毕业，移出队列；null = 仍在队列 */
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
  /** 跳过题数（不会而主动跳过，按错题处理但单列统计） */
  skipped: integer("skipped").notNull().default(0),
  mastery: real("mastery").notNull(),
  /** 每日卷去重键 YYYY-MM-DD；综合卷为 null */
  dateKey: text("date_key"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  // 每日一卷去重：同一用户同一天只保留一条（date_key 为 null 的综合卷不受限）
  unique("uq_exam_user_datekey").on(table.userId, table.dateKey),
]);

/** 讲义划线标注：备注 / 记录 / 疑问，锚定章节正文中的一段选中文字 */
export const annotations = gis.table("annotations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** 所属技能：gis / cesium / … */
  skill: text("skill").notNull().default("gis"),
  moduleSlug: text("module_slug").notNull(),
  /** note=备注 record=记录 question=疑问 */
  kind: text("kind", { enum: ["note", "record", "question"] }).notNull(),
  /** 选中的原文，用于侧栏摘录与锚点兜底匹配 */
  quote: text("quote").notNull(),
  /**
   * 定位锚点（合成示例）：
   * { start: 120, end: 128, prefix: "…前文24字", suffix: "后文24字…" }
   * start/end 为 article 全文 TextNode 拼接后的字符偏移；prefix/suffix 供讲义改版后兜底搜索。
   */
  anchor: jsonb("anchor").$type<{
    start: number;
    end: number;
    prefix: string;
    suffix: string;
  }>().notNull(),
  /** 附言，可为空字符串（纯划线） */
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  // 按用户 + 章节拉取本章全部标注
  index("idx_annot_user_module").on(table.userId, table.skill, table.moduleSlug),
]);

/** 签到记录：当天首次提交测验/考试自动写入，一人一天一行 */
export const checkIns = gis.table("check_ins", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** 本地时区日期 YYYY-MM-DD，复用 lib/quiz/exam 的 dateKey() */
  dateKey: text("date_key").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  // 一人一天唯一，冲突即代表今天已签到
  unique("uq_checkin_user_date").on(table.userId, table.dateKey),
  index("idx_checkin_user_day").on(table.userId, table.dateKey),
]);
