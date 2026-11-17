import { describe, expect, it } from "vitest";
import {
  NAV_ICONS,
  NAV_ITEMS,
  isActive,
  isFocusMode,
} from "./nav";

describe("主导航配置", () => {
  it("只保留四个一级入口且顺序稳定", () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      "/",
      "/learn",
      "/exam",
      "/settings",
    ]);
    expect(NAV_ITEMS.map((item) => item.key)).toEqual([
      "home",
      "learn",
      "exam",
      "settings",
    ]);
    expect(new Set(NAV_ITEMS.map((item) => item.key)).size).toBe(4);
    expect(NAV_ITEMS.every((item) => NAV_ICONS[item.key])).toBe(true);
  });

  it("每个路由最多归属一个一级导航", () => {
    const paths = [
      "/",
      "/learn",
      "/s/gis",
      "/s/gis/01",
      "/s/gis/01/quiz",
      "/review",
      "/progress",
      "/checkin",
      "/annotations",
      "/audio",
      "/rank",
      "/exam",
      "/exam/daily",
      "/exam/mock",
      "/settings",
      "/docs/mcp",
    ];

    for (const path of paths) {
      const active = NAV_ITEMS.filter((item) => isActive(path, item));
      expect(active).toHaveLength(1);
    }
  });

  it("学习相关次级页统一高亮学习", () => {
    const learn = NAV_ITEMS.find((item) => item.key === "learn")!;
    for (const path of [
      "/learn",
      "/s/gis",
      "/s/gis/01",
      "/s/gis/01/quiz",
      "/review",
      "/progress",
      "/checkin",
      "/annotations",
      "/audio",
      "/rank",
    ]) {
      expect(isActive(path, learn)).toBe(true);
    }
  });

  it("考试、设置与首页边界匹配正确", () => {
    const home = NAV_ITEMS.find((item) => item.key === "home")!;
    const exam = NAV_ITEMS.find((item) => item.key === "exam")!;
    const settings = NAV_ITEMS.find((item) => item.key === "settings")!;

    expect(isActive("/", home)).toBe(true);
    expect(isActive("/learn", home)).toBe(false);
    expect(isActive("/exam", exam)).toBe(true);
    expect(isActive("/exam/daily", exam)).toBe(true);
    expect(isActive("/examination", exam)).toBe(false);
    expect(isActive("/settings", settings)).toBe(true);
    expect(isActive("/docs/mcp", settings)).toBe(true);
  });

  it("保留专注模式隐藏规则", () => {
    expect(isFocusMode("/s/gis/01/quiz")).toBe(true);
    expect(isFocusMode("/exam/daily")).toBe(true);
    expect(isFocusMode("/exam/mock")).toBe(true);
    expect(isFocusMode("/learn")).toBe(false);
    expect(isFocusMode("/exam")).toBe(false);
  });
});
