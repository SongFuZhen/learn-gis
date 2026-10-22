import type { Config } from "drizzle-kit";

export default {
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // 项目所有表都在 gis schema（非 public），不加 schemaFilter 时 push 会「No changes detected」
  schemaFilter: ["gis"],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
