import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

type Db = NodePgDatabase<typeof schema>;

let cached: Db | null = null;

/**
 * 惰性连接：build / 静态渲染阶段不触碰数据库，缺少 DATABASE_URL 也能构建。
 * 只在真正读写进度时调用 getDb()。
 */
export async function getDb(): Promise<Db> {
  if (cached) return cached;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "缺少 DATABASE_URL：进度读写需要 Neon/Postgres 连接串（见 .env.example）",
    );
  }

  const [{ Pool }, { drizzle }] = await Promise.all([
    import("pg"),
    import("drizzle-orm/node-postgres"),
  ]);

  const pool = new Pool({ connectionString: url });
  cached = drizzle(pool, { schema });
  return cached;
}
