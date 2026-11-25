-- 会话版本：修改密码时 +1，使其他设备上的旧会话 cookie 立即失效
ALTER TABLE gis.users
  ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;
