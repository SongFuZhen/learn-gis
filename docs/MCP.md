# MCP 接入说明

站点对外提供只读 MCP 服务，任何支持 MCP 的 AI 客户端都能查询五门课的讲义与题库。

- 远程入口（部署后）：`https://gis.ason.top/mcp`
- 传输：Streamable HTTP，无状态（每请求独立，无 session id）
- 数据范围：公开课程内容，只读；不接数据库、不暴露用户数据、无需鉴权
- 本地源码：`mcp/server.ts`（工具实现）、`app/mcp/route.ts`（HTTP 装配）

## 工具清单

| 工具 | 入参 | 说明 |
| --- | --- | --- |
| `list_skills` | 无 | 五门课 id、轨道、章数、题量、前置依赖 |
| `list_chapters` | `skill` | 指定课的章节 slug、标题、摘要、题量 |
| `get_chapter` | `skill`, `module` | 读取某章 MDX 原文 |
| `get_quiz` | `skill`, `module`, `limit?`, `withAnswers?` | 章节题库；默认隐去答案与解析 |
| `search` | `query`, `skill?` | 跨课检索章节摘要与题干 |

`skill` 取值：`gis / cesium / turf / three / harmony`；`module` 为两位 slug（如 `00`）。

## 客户端配置

### Claude Desktop / 任意 mcp.json 兼容客户端

```json
{
  "mcpServers": {
    "learn-gis": {
      "url": "https://gis.ason.top/mcp"
    }
  }
}
```

### Cursor

Settings → MCP → Add new server，类型选 HTTP/URL，填 `https://gis.ason.top/mcp`。

### 本地开发（stdio，不走 HTTP）

仓库根目录已带 `.mcp.json`，Claude Code 在本仓库内 `/mcp` 批准即可；手动启动：

```bash
npm run mcp:server
```

## 协议注意

- 请求头必须带 `Accept: application/json, text/event-stream`（MCP 规范要求，响应通常为 SSE 流）。
- 服务端开启 CORS 全开放（`Access-Control-Allow-Origin: *`），浏览器内客户端可直连。
- 无鉴权：内容本就公开，若日后需要限流，在 `app/mcp/route.ts` 按 IP 加网关层控制即可。

## 本地验证

```bash
npm run dev
curl -i -X POST http://localhost:25000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
```

返回 `event: message` + `serverInfo.name = learn-gis` 即成功。

## 部署注意

- 路由固定 `runtime = "nodejs"`（依赖 fs 读取 MDX）。
- `next.config.mjs` 的 `outputFileTracingIncludes` 已把 `content/**/*.mdx` 纳入 serverless 产物追踪，否则线上 `get_chapter` 会找不到文件。
- 题库 JSON 走模块静态 import，会被 Next 自动打包，无需额外配置。
