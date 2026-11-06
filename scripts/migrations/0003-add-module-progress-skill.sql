-- 一次性迁移：多技能课程 —— module_progress 增加 skill 列，区分 gis / cesium 的同名章节号。
-- 与 0001/0002 同理：drizzle-kit push 也会自动应用；本文件供手动执行，可重复运行。
--
-- 用法：psql "$DATABASE_URL" -f scripts/migrations/0003-add-module-progress-skill.sql

ALTER TABLE gis.module_progress
  ADD COLUMN IF NOT EXISTS skill text NOT NULL DEFAULT 'gis';

-- 普通索引（不加 UNIQUE：历史数据可能存在 (user_id, module_slug) 重复行，先去重才能上唯一约束）
CREATE INDEX IF NOT EXISTS idx_module_progress_user_skill_slug
  ON gis.module_progress (user_id, skill, module_slug);
