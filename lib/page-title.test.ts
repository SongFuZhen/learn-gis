import { describe, expect, it } from "vitest";
import { getModule } from "@/lib/content";
import { pageTitle } from "./page-title";

describe("pageTitle", () => {
  it("返回首页与静态页面标题", () => {
    expect(pageTitle("/")).toBe("首页");
    expect(pageTitle("/learn")).toBe("学习");
    expect(pageTitle("/review")).toBe("今日复习");
    expect(pageTitle("/progress")).toBe("学习进度");
    expect(pageTitle("/checkin")).toBe("打卡");
    expect(pageTitle("/annotations")).toBe("我的划线");
    expect(pageTitle("/audio")).toBe("讲义音频");
    expect(pageTitle("/rank")).toBe("学习积分榜");
    expect(pageTitle("/docs/mcp")).toBe("MCP 接入");
    expect(pageTitle("/settings")).toBe("设置");
  });

  it("优先匹配更具体的考试路由", () => {
    expect(pageTitle("/exam/daily")).toBe("每日一考");
    expect(pageTitle("/exam/mock")).toBe("综合考试");
    expect(pageTitle("/exam")).toBe("考试");
  });

  it("返回课程、章节与测验标题", () => {
    const chapter = getModule("gis", "01");
    expect(pageTitle("/s/gis")).toBe("GIS 基础");
    expect(pageTitle("/s/gis/01")).toBe(chapter?.title);
    expect(pageTitle("/s/gis/01/quiz")).toBe(`测验 · ${chapter?.title}`);
  });

  it("未知路径回退站点名而非首页", () => {
    expect(pageTitle("/unknown")).toBe("ASoN 学社");
  });
});
