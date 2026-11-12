-- 一次性迁移：答题「不知道，跳过」统计列。
-- 与 0001~0004 同理：drizzle-kit push 也会自动应用；本文件供手动执行，可重复运行。
--
-- 用法：psql "$DATABASE_URL" -f scripts/migrations/0005-skip-columns.sql

-- 章节累计跳过次数（跳过同时计入 wrong_count，此列仅用于单列展示）
ALTER TABLE gis.module_progress
  ADD COLUMN IF NOT EXISTS skipped_count integer NOT NULL DEFAULT 0;

-- 单次考试/测验卷内的跳过题数
ALTER TABLE gis.exam_sessions
  ADD COLUMN IF NOT EXISTS skipped integer NOT NULL DEFAULT 0;
