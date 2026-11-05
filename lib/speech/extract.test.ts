import { describe, expect, it } from "vitest";
import { extractSpeechSegments } from "@/lib/speech/extract";

/** 取全部段文本，方便断言 */
const texts = (mdx: string) => extractSpeechSegments(mdx).map((s) => s.text);

describe("extractSpeechSegments 整块跳过（TTS.md §3.1）", () => {
  it("代码块不读", () => {
    const out = texts(
      `前文一句。

\`\`\`bash
gdalwarp -t_srs EPSG:4326 in.tif out.tif
\`\`\`

后文一句。`,
    );
    expect(out).toEqual(["前文一句。", "后文一句。"]);
  });

  it("表格替换为占位提示", () => {
    const out = texts(
      `表格前。

| 名称 | 值 |
| --- | --- |
| WGS84 | EPSG:4326 |

表格后。`,
    );
    expect(out).toEqual([
      "表格前。",
      "（本节含表格，建议查看原文）",
      "表格后。",
    ]);
  });

  it("交互组件（ProjPlayground/EmbedMap）整块跳过", () => {
    const out = texts(
      `介绍。

<ProjPlayground initialCrs="EPSG:4326" />

<EmbedMap src="https://example.com/map" />

结论。`,
    );
    expect(out).toEqual(["介绍。", "结论。"]);
  });

  it("Callout 内部文本保留", () => {
    const out = texts(
      `<Callout type="must" title="必背">
- 大地水准面：重力等位面
- 基准面：规定椭球怎么摆
</Callout>`,
    );
    expect(out).toEqual(["大地水准面：重力等位面", "基准面：规定椭球怎么摆"]);
  });

  it("分隔线 thematicBreak 不产出段落", () => {
    expect(texts("甲。\n\n---\n\n乙。")).toEqual(["甲。", "乙。"]);
  });
});

describe("extractSpeechSegments 行内净化（TTS.md §3.2）", () => {
  it("注音块：IPA 与谐音拐杖都删除，保留术语与中文释义", () => {
    const out = texts(
      "这就是**椭球**（Ellipsoid，/ɪˈlɪpsɔɪd/，「伊-利普-扫伊德」）和**基准面**。",
    );
    // 现状（与已生成音频一致）：/.../ 与「谐音」都删；加粗节点间保留空格
    expect(out).toEqual(["这就是 椭球 （Ellipsoid）和 基准面 。"]);
  });

  it("普通斜杠（sin/cos/tan、路径）不误删", () => {
    expect(texts("用 `sin/cos/tan` 三个比值。")).toEqual([
      "用 sin、cos、tan 三个比值。",
    ]);
    expect(texts("打开 fishnet/grid 工具。")).toEqual([
      "打开 fishnet/grid 工具。",
    ]);
  });

  it("行内 code 的公式整体保留", () => {
    expect(texts("换算式 `π/180` 不要读成分数。")).toEqual([
      "换算式 π/180 不要读成分数。",
    ]);
  });

  it("markdown 强调符号删除、箭头与约等号转词", () => {
    // 现状：行内节点（加粗等）拼接时以空格分隔
    expect(texts("**必须**绑定基准面 → 否则 ≈ 不唯一，误差 ±50m。")).toEqual([
      "必须 绑定基准面 到 否则 约等于 不唯一，误差 正负50m。",
    ]);
  });

  it("装饰性 emoji 删除", () => {
    // 现状：emoji 删除后残留单个空格（cleanText 只折叠不删除）
    expect(texts("🗺️ 这是一张地图 🧭。")).toEqual(["这是一张地图 。"]);
  });
});

describe("extractSpeechSegments 段落结构（TTS.md §3）", () => {
  it("标题/段落/列表项的 kind 正确", () => {
    const out = extractSpeechSegments(
      `## 本章你会学到

一段正文。

- 第一点
- 第二点`,
    );
    expect(out.map((s) => s.kind)).toEqual([
      "heading",
      "paragraph",
      "list-item",
      "list-item",
    ]);
    expect(out[0]).toMatchObject({ text: "本章你会学到", headingLevel: 2 });
  });

  it("MDX 导入语句与 frontmatter 不进入朗读流", () => {
    const out = texts(
      `---
title: 测试
---

import Callout from "@/components/mdx/Callout";

正文。`,
    );
    expect(out).toEqual(["正文。"]);
  });
});
