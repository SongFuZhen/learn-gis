import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, HEAD } from "./route";

const HOST = "cloudflare-imgbed-91r.pages.dev";
const AUDIO_URL = `https://${HOST}/file/chapter.mp3`;

function request(
  url: string | null = AUDIO_URL,
  init: { headers?: Record<string, string>; signal?: AbortSignal; method?: string } = {},
) {
  const query = url === null ? "" : `?url=${encodeURIComponent(url)}`;
  return new NextRequest(`http://localhost:25000/api/audio/stream${query}`, {
    method: init.method,
    headers: init.headers,
    signal: init.signal,
  });
}

/** 真实 fetch 的 Response.url 由实现写入，构造的 Response 没有；用自有属性覆盖只读 getter */
function upstream(
  body: BodyInit | null,
  init: {
    status?: number;
    headers?: Record<string, string>;
    url?: string;
  } = {},
) {
  const res = new Response(body, {
    status: init.status ?? 200,
    headers: { "content-type": "audio/mpeg", ...init.headers },
  });
  Object.defineProperty(res, "url", { value: init.url ?? AUDIO_URL });
  return res;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("远程音频流式代理", () => {
  it("缺少或非法的 url 返回 400，且不请求上游", async () => {
    expect((await GET(request(null))).status).toBe(400);
    expect((await GET(request("not-a-url"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["http 明文", `http://${HOST}/a.mp3`],
    ["未登记的域名", "https://evil.example.com/a.mp3"],
    ["带用户名", `https://user@${HOST}/a.mp3`],
    ["带密码", `https://user:pass@${HOST}/a.mp3`],
  ])("拒绝 %s 返回 403", async (_name, url) => {
    const res = await GET(request(url));
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("把 Range 透传给上游，且不携带 Referer", async () => {
    fetchMock.mockResolvedValue(
      upstream("0123456789", {
        status: 206,
        headers: {
          "content-range": "bytes 0-9/100",
          "content-length": "10",
          "accept-ranges": "bytes",
          etag: '"abc"',
        },
      }),
    );
    const req = request(AUDIO_URL, { headers: { range: "bytes=0-9" } });
    const res = await GET(req);

    const [target, init] = fetchMock.mock.calls[0]!;
    expect(String(target)).toBe(AUDIO_URL);
    expect((init.headers as Headers).get("Range")).toBe("bytes=0-9");
    expect(init.referrerPolicy).toBe("no-referrer");
    expect(init.cache).toBe("no-store");
    expect(init.redirect).toBe("follow");
    expect(init.signal).toBe(req.signal);

    expect(res.status).toBe(206);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect(res.headers.get("content-range")).toBe("bytes 0-9/100");
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect(res.headers.get("etag")).toBe('"abc"');
    expect(res.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(await res.text()).toBe("0123456789");
  });

  it("HEAD 透传上游头但不返回 body（上游仍按 GET 取流）", async () => {
    fetchMock.mockResolvedValue(
      upstream("audio-bytes", { headers: { "content-length": "11", "accept-ranges": "bytes" } }),
    );
    const res = await HEAD(request(AUDIO_URL, { method: "HEAD" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-length")).toBe("11");
    expect(res.body).toBeNull();
  });

  it("上游返回非音频内容时拦截为 502", async () => {
    fetchMock.mockResolvedValue(
      upstream("<html>403</html>", { headers: { "content-type": "text/html" } }),
    );
    const res = await GET(request());
    expect(res.status).toBe(502);
    expect(await res.text()).toBe("Upstream did not return audio");
  });

  it("上游 302 跳到未登记域名时拦截为 502", async () => {
    fetchMock.mockResolvedValue(
      upstream("x", { url: "https://evil.example.com/a.mp3" }),
    );
    const res = await GET(request());
    expect(res.status).toBe(502);
    expect(await res.text()).toBe("Redirected audio host is not allowed");
  });

  it("上游非 2xx 时按原状态透传", async () => {
    fetchMock.mockResolvedValue(upstream(null, { status: 404 }));
    const res = await GET(request());
    expect(res.status).toBe(404);
  });

  it("上游请求失败返回 502", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const res = await GET(request());
    expect(res.status).toBe(502);
  });

  it("客户端中断请求返回 499，不记错误日志", async () => {
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockRejectedValue(new Error("aborted"));
    const res = await GET(request(AUDIO_URL, { signal: controller.signal }));
    expect(res.status).toBe(499);
    expect(console.error).not.toHaveBeenCalled();
  });
});
