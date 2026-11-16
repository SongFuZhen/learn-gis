import Link from "next/link";
import { ArrowRight, Braces } from "lucide-react";

/**
 * 首页 MCP 入口：浅色克制卡片，引导到 /docs/mcp 查看端点与客户端配置。
 * 新访客 Intro 与回访 Dashboard 共用。
 */
export default function McpEntry() {
  return (
    <Link
      href="/docs/mcp"
      className="group flex h-full items-center gap-4 rounded-lg border border-brand/25 p-5 shadow-card transition-colors hover:border-brand/50 sm:px-6"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--brand-primary) / 0.14) 0%, hsl(var(--brand-primary) / 0.05) 100%)",
      }}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <Braces className="h-5 w-5" strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium group-hover:text-brand">
          MCP 接入：让 AI 直接查询课程
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] text-foreground-tertiary">
          五个只读工具，讲义与题库随取随用，一个 URL 接入任意 MCP 客户端
        </span>
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-foreground-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
        strokeWidth={1.8}
      />
    </Link>
  );
}
