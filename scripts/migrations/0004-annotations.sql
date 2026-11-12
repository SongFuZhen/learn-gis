-- 一次性迁移：讲义划线标注表。
-- 与 0001~0003 同理：drizzle-kit push 也会自动应用；本文件供手动执行，可重复运行。
--
-- 用法：psql "$DATABASE_URL" -f scripts/migrations/0004-annotations.sql

CREATE TABLE IF NOT EXISTS gis.annotations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES gis.users(id) ON DELETE CASCADE,
  skill        text NOT NULL DEFAULT 'gis',
  module_slug  text NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('note', 'record', 'question')),
  quote        text NOT NULL,
  -- 定位锚点：{"start":120,"end":128,"prefix":"…","suffix":"…"}
  anchor       jsonb NOT NULL,
  note         text NOT NULL DEFAULT '',
  created_at   timestamp NOT NULL DEFAULT now(),
  updated_at   timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_annot_user_module
  ON gis.annotations (user_id, skill, module_slug);
