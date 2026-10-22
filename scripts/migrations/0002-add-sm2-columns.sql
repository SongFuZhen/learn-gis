-- 一次性迁移：M3 给复习卡补上 SM-2 字段，并补齐 exam_sessions 的每日去重唯一约束。
-- 与 0001 同理：drizzle-kit push 也会自动应用这些变更；本文件仅供「不想跑 push、想手动执行」时备用，
-- 且全部用 IF NOT EXISTS / 存在性判断包过，可重复执行。
--
-- 用法：psql "$DATABASE_URL" -f scripts/migrations/0002-add-sm2-columns.sql

ALTER TABLE gis.wrong_answers
  ADD COLUMN IF NOT EXISTS ease real NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS interval_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reps integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lapses integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_at timestamp;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_exam_user_datekey'
  ) THEN
    ALTER TABLE gis.exam_sessions
      ADD CONSTRAINT uq_exam_user_datekey UNIQUE (user_id, date_key);
  END IF;
END
$$;
