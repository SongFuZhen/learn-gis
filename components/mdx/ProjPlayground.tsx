"use client";

import { useState } from "react";

type Result =
  | { state: "idle" }
  | { state: "ok"; x: number; y: number }
  | { state: "error"; message: string };

/**
 * 常用坐标系预设。4326/3857 是 proj4 内置定义；
 * 4490 与 UTM 分带 proj4 不自带，运行时用 def 字符串调 proj4.defs 注册。
 */
const PRESETS = [
  {
    code: "EPSG:4326",
    label: "EPSG:4326 · WGS84 经纬度（GPS / GeoJSON）",
    def: null,
  },
  {
    code: "EPSG:3857",
    label: "EPSG:3857 · Web 墨卡托（在线地图瓦片）",
    def: null,
  },
  {
    code: "EPSG:4490",
    label: "EPSG:4490 · CGCS2000 经纬度（国家大地坐标系）",
    def: "+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs",
  },
  {
    code: "EPSG:32649",
    label: "EPSG:32649 · WGS84 / UTM 49N（西部）",
    def: "+proj=utm +zone=49 +datum=WGS84 +units=m +no_defs",
  },
  {
    code: "EPSG:32650",
    label: "EPSG:32650 · WGS84 / UTM 50N（华北/北京）",
    def: "+proj=utm +zone=50 +datum=WGS84 +units=m +no_defs",
  },
  {
    code: "EPSG:32651",
    label: "EPSG:32651 · WGS84 / UTM 51N（华东）",
    def: "+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs",
  },
] as const;

const CUSTOM = "__custom__";

const inputCls =
  "w-full rounded-sm border border-border bg-background px-2 py-1.5 font-mono text-[12px] text-foreground outline-none focus:border-brand";
const selectCls =
  "w-full rounded-sm border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-brand";

/** 单个坐标系选择单元：常用预设下拉 + 可手写覆盖的输入框（组件须在模块顶层定义，避免重挂载失焦） */
function CrsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const matched = PRESETS.find((p) => p.code === value);
  return (
    <label className="grid gap-1 text-[12px] text-foreground-secondary">
      {label}
      <select
        className={selectCls}
        value={matched ? matched.code : CUSTOM}
        onChange={(e) => {
          if (e.target.value !== CUSTOM) onChange(e.target.value);
        }}
      >
        {PRESETS.map((p) => (
          <option key={p.code} value={p.code}>
            {p.label}
          </option>
        ))}
        <option value={CUSTOM}>自定义（手写 EPSG 码或 proj4 定义）</option>
      </select>
      <input
        className={inputCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        aria-label={`${label}自定义输入`}
      />
    </label>
  );
}

/**
 * 浏览器内重投影小实验台：常用坐标系下拉直选，也可手写 proj4 定义。
 * proj4 动态 import，不进首屏 bundle；仅在讲义 02 章使用。
 */
export default function ProjPlayground({
  defaultFrom = "EPSG:4326",
  defaultTo = "EPSG:3857",
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
      // 非内置预设码先注册定义，否则 proj4 报 "No definition"
      for (const preset of PRESETS) {
        if (preset.def && (from === preset.code || to === preset.code)) {
          proj4.defs(preset.code, preset.def);
        }
      }
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

  return (
    <div className="my-4 rounded-md border border-border bg-background p-4">
      <p className="text-[13px] font-semibold text-foreground">
        重投影实验台
        <span className="ml-2 font-normal text-foreground-muted">
          proj4 在浏览器内运行
        </span>
      </p>
      <div className="mt-3 grid gap-3">
        <CrsField
          label="源坐标系（下拉直选，或在下方手写）"
          value={from}
          onChange={setFrom}
        />
        <CrsField
          label="目标坐标系（下拉直选，或在下方手写）"
          value={to}
          onChange={setTo}
        />
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
