import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIO_HOSTS = new Set(
  (process.env.AUDIO_REMOTE_HOSTS ?? "cloudflare-imgbed-91r.pages.dev")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean),
);

/**
 * 同源转发远程音频，避免图床把跨站 Referer 拦成 403 图片。
 * 只传 Range，并直接返回上游 body，保留边下边播与整章 seek。
 */
async function streamAudio(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  let target: URL;
  try {
    target = new URL(rawUrl ?? "");
  } catch {
    return new Response("Invalid audio URL", { status: 400 });
  }
  if (
    target.protocol !== "https:" ||
    !AUDIO_HOSTS.has(target.hostname) ||
    target.username ||
    target.password
  ) {
    return new Response("Audio host is not allowed", { status: 403 });
  }

  const headers = new Headers();
  const range = request.headers.get("range");
  if (range) headers.set("Range", range);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers,
      // Next 的服务端 fetch 默认继承页面 Referer；图床会因此返回防盗链 403 图片。
      referrer: "",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      redirect: "follow",
      signal: request.signal,
    });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    console.error("Remote audio fetch failed", error);
    return new Response("Remote audio unavailable", { status: 502 });
  }

  if (!upstream.url || new URL(upstream.url).protocol !== "https:" || !AUDIO_HOSTS.has(new URL(upstream.url).hostname)) {
    await upstream.body?.cancel();
    return new Response("Redirected audio host is not allowed", { status: 502 });
  }
  const contentType = upstream.headers.get("content-type") ?? "";
  if (
    upstream.ok &&
    (!contentType.toLowerCase().startsWith("audio/") || !upstream.body)
  ) {
    await upstream.body?.cancel();
    return new Response("Upstream did not return audio", { status: 502 });
  }

  const responseHeaders = new Headers();
  for (const name of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
  ]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  responseHeaders.set("Cache-Control", "private, max-age=3600");

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest) {
  return streamAudio(request);
}

export async function HEAD(request: NextRequest) {
  return streamAudio(request);
}
