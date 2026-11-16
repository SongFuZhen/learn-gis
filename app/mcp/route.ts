/**
 * 远程 MCP 入口（Streamable HTTP，stateless）。
 * 复用 mcp/server.ts 的五个只读工具，部署后对外暴露 https://<host>/mcp，
 * 供任意支持 MCP 的 AI 客户端（Claude Desktop / Cursor 等）以 URL 方式接入。
 *
 * 无状态：每个请求新建 server + transport，不保留会话，天然适配 serverless。
 * 内容全部来自仓库公开讲义/题库，只读、无鉴权面，CORS 全开放。
 */
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "@/mcp/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id",
};

export async function POST(request: Request) {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const server = createServer();
  await server.connect(transport);
  // stateless：transport 随请求结束自然回收，不能提前 close，
  // 否则 SSE 响应体尚未 flush 就被掐断（客户端收到 200 空 body）
  const response = await transport.handleRequest(request);
  // 透传 transport 生成的状态/内容类型，仅补 CORS
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
