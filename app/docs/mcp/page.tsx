import type { Metadata } from "next";
import { Braces } from "lucide-react";
import CopyButton from "@/components/mcp/CopyButton";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "MCP 接入",
  description:
    "把 learn-gis 五门课的讲义与题库接入任意 MCP 客户端：端点地址、配置 JSON、工具清单与本地验证。",
};

const MCP_URL = `${SITE_URL}/mcp`;

const CLIENT_CONFIG = `{
  "mcpServers": {
    "learn-gis": {
      "url": "${MCP_URL}"
    }
  }
}`;

const CURL_SNIPPET = `curl -i -X POST ${MCP_URL} \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'`;

const TOOLS = [
  {
    name: "list_skills",
    params: "无",
    desc: "五门课 id、轨道、章数、题量、前置依赖",
  },
  {
    name: "list_chapters",
    params: "skill",
    desc: "指定课的章节 slug、标题、摘要、题量",
  },
  {
    name: "get_chapter",
    params: "skill, module",
    desc: "读取某章 MDX 讲义原文",
  },
  {
    name: "get_quiz",
    params: "skill, module, limit?, withAnswers?",
    desc: "章节题库；默认隐去答案与解析",
  },
  {
    name: "search",
    params: "query, skill?",
    desc: "跨课检索章节摘要与题干",
  },
];

export default function McpDocsPage() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-3xl">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Braces className="h-5 w-5" strokeWidth={1.7} />
        </span>
        <h1 className="mt-4 text-[24px] font-semibold tracking-[-0.02em] sm:text-[28px]">
          MCP 接入
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-foreground-secondary">
          站点对外提供只读 MCP 服务（Model Context Protocol，模型上下文协议）。
          任何支持 MCP 的 AI 客户端配一个 URL，就能查询五门课的讲义与题库，
          回答基于站内真实内容而非模型记忆。
        </p>

        {/* 端点 */}
        <section className="mt-7 rounded-lg border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="text-[15px] font-medium">服务端点</h2>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-border bg-background-subtle px-4 py-3">
            <code className="min-w-0 truncate font-mono text-[13px] text-brand-ink">
              {MCP_URL}
            </code>
            <CopyButton text={MCP_URL} label="复制地址" />
          </div>
          <ul className="mt-4 space-y-1.5 text-[13px] leading-relaxed text-foreground-secondary">
            <li>传输：Streamable HTTP，无状态（每请求独立，无 session id）</li>
            <li>数据范围：公开课程内容，只读；不接数据库、不暴露用户数据</li>
            <li>鉴权：无需 token；CORS 全开放，浏览器内客户端可直连</li>
          </ul>
        </section>

        {/* 客户端配置 */}
        <section className="mt-5 rounded-lg border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="text-[15px] font-medium">客户端配置</h2>
          <p className="mt-1.5 text-[13px] text-foreground-tertiary">
            Claude Desktop 或任意 mcp.json 兼容客户端，写入：
          </p>
          <div className="relative mt-3">
            <pre className="overflow-x-auto rounded-md border border-border bg-background-subtle p-4 pr-24 font-mono text-[12.5px] leading-relaxed text-foreground">
              {CLIENT_CONFIG}
            </pre>
            <div className="absolute right-3 top-3">
              <CopyButton text={CLIENT_CONFIG} />
            </div>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-foreground-secondary">
            Cursor：Settings → MCP → Add new server，类型选 HTTP/URL，填
            <code className="mx-1 rounded bg-background-subtle px-1.5 py-0.5 font-mono text-[12px]">
              {MCP_URL}
            </code>
            。
          </p>
        </section>

        {/* 工具清单 */}
        <section className="mt-5 rounded-lg border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="text-[15px] font-medium">工具清单</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-[12px] text-foreground-tertiary">
                  <th className="py-2 pr-4 font-medium">工具</th>
                  <th className="py-2 pr-4 font-medium">入参</th>
                  <th className="py-2 font-medium">说明</th>
                </tr>
              </thead>
              <tbody>
                {TOOLS.map((tool) => (
                  <tr
                    key={tool.name}
                    className="border-b border-border-subtle last:border-0"
                  >
                    <td className="py-2.5 pr-4 align-top">
                      <code className="font-mono text-[12.5px] font-medium text-brand-ink">
                        {tool.name}
                      </code>
                    </td>
                    <td className="py-2.5 pr-4 align-top">
                      <code className="font-mono text-[12px] text-foreground-secondary">
                        {tool.params}
                      </code>
                    </td>
                    <td className="py-2.5 align-top text-foreground-secondary">
                      {tool.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-foreground-tertiary">
            <code className="font-mono">skill</code> 取值：
            <code className="font-mono">gis / cesium / turf / three / harmony</code>
            ；<code className="font-mono">module</code> 为两位 slug（如
            <code className="font-mono">00</code>）。
          </p>
        </section>

        {/* 本地验证 */}
        <section className="mt-5 rounded-lg border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="text-[15px] font-medium">本地验证</h2>
          <p className="mt-1.5 text-[13px] text-foreground-tertiary">
            请求头必须带{" "}
            <code className="font-mono text-[12px]">
              Accept: application/json, text/event-stream
            </code>
            （MCP 规范要求，响应为 SSE 流）。
          </p>
          <div className="relative mt-3">
            <pre className="overflow-x-auto rounded-md border border-border bg-background-subtle p-4 font-mono text-[12px] leading-relaxed text-foreground">
              {CURL_SNIPPET}
            </pre>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-foreground-secondary">
            返回 <code className="font-mono text-[12px]">event: message</code> 且
            <code className="mx-1 font-mono text-[12px]">
              serverInfo.name = learn-gis
            </code>
            即成功。
          </p>
        </section>
      </div>
    </div>
  );
}
