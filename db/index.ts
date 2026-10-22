import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// Neon 使用连接池器（pooler），并发握手偶发 ECONNRESET。
// 收紧 pool 规模 + 开启 keepAlive，避免空闲连接被池器掐断后整体 500。
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

export const db = drizzle(pool, { schema });
