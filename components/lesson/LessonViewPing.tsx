"use client";

import { useEffect } from "react";

/** 同一次页面会话内每章只上报一次，避免 StrictMode 双调用与重复导航 */
const fired = new Set<string>();

/**
 * 讲义阅读上报：进入章节即 POST 一次。
 * 服务端负责建立/复用身份并幂等写入 lesson_views，客户端只发不管回执。
 */
export default function LessonViewPing({
  skill,
  moduleSlug,
}: {
  skill: string;
  moduleSlug: string;
}) {
  useEffect(() => {
    const key = `${skill}:${moduleSlug}`;
    if (fired.has(key)) return;
    fired.add(key);
    fetch("/api/engagement/lesson-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skill, moduleSlug }),
      keepalive: true,
    }).catch(() => {});
  }, [skill, moduleSlug]);

  return null;
}
