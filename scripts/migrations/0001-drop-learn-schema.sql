-- 一次性迁移：v1 把进度表放在 learn schema（learn.module_progress / learn.review_cards /
-- learn.attempts），v1.5 起统一迁到 gis schema。旧的 learn schema 不会被 drizzle-kit
-- push 自动清理（drizzle.config.ts 的 schemaFilter 只认 gis），需在首次部署到已有数据库时
-- 手动执行本文件一次，清掉历史残留表。
--
-- 用法（任选其一）：
--   psql "$DATABASE_URL" -f scripts/migrations/0001-drop-learn-schema.sql
--   drizzle-kit push 之后，再单独跑本文件
--
-- 幂等：learn schema 不存在时静默跳过，可重复执行。

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.schemata
    WHERE schema_name = 'learn'
  ) THEN
    DROP SCHEMA learn CASCADE;
  END IF;
END
$$;
