"use client";

import { useState } from "react";

type Result =
  | { state: "idle" }
  | { state: "ok"; x: number; y: number }
  | { state: "error"; message: string };

/**
 * 浏览器内重投影小实验台：输入 proj4 源/目标定义与经纬度，实时转换。
 * proj4 动态 import，不进首屏 bundle；仅在讲义 01/03 章使用。
 */
export default function ProjPlayground({
  defaultFrom = "EPSG:4326",
  defaultTo = "+proj=utm +zone=50 +datum=WGS84 +units=m +no_defs",
  defaultLon = 116.4,
  defaultLat = 39.9,
}: {
  defaultFrom?: string;
  defaultTo?: string;
  defaultLon?: number;
  defaultLat?: number;
}) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [lon, setLon] = useState(String(defaultLon));
  const [lat, setLat] = useState(String(defaultLat));
  const [result, setResult] = useState<Result>({ state: "idle" });
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const proj4 = (await import("proj4")).default;
      const lonN = Number(lon);
      const latN = Number(lat);
      if (!Number.isFinite(lonN) || !Number.isFinite(latN)) {
        throw new Error("经纬度必须是数字");
      }
      const [x, y] = proj4(from, to, [lonN, latN]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new Error("转换结果不是有限数值，检查投影定义");
      }
      setResult({ state: "ok", x, y });
    } catch (error) {
      setResult({
        state: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-sm border border-border bg-background px-2 py-1.5 font-mono text-[12px] text-foreground outline-none focus:border-brand";

  return (
    <div className="my-4 rounded-md border border-border bg-background p-4">
      <p className="text-[13px] font-semibold text-foreground">
        重投影实验台
        <span className="ml-2 font-normal text-foreground-muted">
          proj4 在浏览器内运行
        </span>
      </p>
      <div className="mt-3 grid gap-3">
        <label className="grid gap-1 text-[12px] text-foreground-secondary">
          源坐标系（proj4 定义或 EPSG 码）
          <input
            className={inputCls}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            spellCheck={false}
          />
        </label>
        <label className="grid gap-1 text-[12px] text-foreground-secondary">
          目标坐标系（proj4 定义或 EPSG 码）
          <input
            className={inputCls}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            spellCheck={false}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-[12px] text-foreground-secondary">
            经度 lon
            <input
              className={inputCls}
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              inputMode="decimal"
            />
          </label>
          <label className="grid gap-1 text-[12px] text-foreground-secondary">
            纬度 lat
            <input
              className={inputCls}
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              inputMode="decimal"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="mt-1 w-fit rounded-sm bg-brand-gradient px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          {busy ? "转换中…" : "转换"}
        </button>
        {result.state === "ok" && (
          <output className="rounded-sm bg-brand-soft px-3 py-2 font-mono text-[13px] text-brand-ink">
            x = {result.x.toFixed(2)}　y = {result.y.toFixed(2)}
          </output>
        )}
        {result.state === "error" && (
          <p className="rounded-sm bg-warning-light px-3 py-2 text-[13px] text-warning">
            {result.message}
          </p>
        )}
      </div>
    </div>
  );
}
