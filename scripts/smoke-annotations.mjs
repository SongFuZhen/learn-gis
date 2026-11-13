// 冒烟验收：讲义划线笔记全链路（选区→三色划线→弹窗附言→刷新持久化→侧栏定位→删除）。
// 不依赖数据库：page.route 拦截 /api/annotations，用内存数组模拟 GET/POST/PATCH/DELETE。
// 用法：先 `npm run dev`，再 `npm run smoke:annotations`（BASE_URL / SKILL / MODULE 可覆盖）
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:25000";
const SKILL = process.env.SKILL ?? "gis";
const MODULE = process.env.MODULE ?? "01";
const PAGE = `${BASE}/s/${SKILL}/${MODULE}`;

const failures = [];
function check(ok, label, detail = "") {
  if (ok) {
    console.log(`✓ ${label}`);
  } else {
    failures.push(label);
    console.log(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** 内存假后端：持久于 node 侧，页面刷新后数据仍在 */
function installMockApi(page) {
  const rows = [];
  return page.route(/\/api\/annotations(\/|$|\?)/, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const json = () => {
      try {
        return req.postDataJSON();
      } catch {
        return null;
      }
    };

    if (method === "GET") {
      const skill = url.searchParams.get("skill") ?? "gis";
      const moduleSlug = url.searchParams.get("module") ?? "";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          annotations: rows.filter(
            (r) => r.skill === skill && r.moduleSlug === moduleSlug,
          ),
        }),
      });
      return;
    }

    if (method === "POST") {
      const body = await json();
      const now = new Date().toISOString();
      const row = { id: uuid(), createdAt: now, updatedAt: now, ...body };
      rows.push(row);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ annotation: row }),
      });
      return;
    }

    const id = url.pathname.split("/").pop();
    const idx = rows.findIndex((r) => r.id === id);

    if (method === "PATCH") {
      if (idx < 0) {
        await route.fulfill({ status: 404, body: JSON.stringify({ error: "not found" }) });
        return;
      }
      const body = await json();
      rows[idx] = { ...rows[idx], ...body, updatedAt: new Date().toISOString() };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ annotation: rows[idx] }),
      });
      return;
    }

    if (method === "DELETE") {
      if (idx < 0) {
        await route.fulfill({ status: 404, body: JSON.stringify({ error: "not found" }) });
        return;
      }
      rows.splice(idx, 1);
      await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
    }
  });
}

/** 在 article 内挑选第 n 个足够长的文本节点，选中其中 3 个汉字，返回选中文字 */
async function selectTextInArticle(page, nth) {
  return page.evaluate((index) => {
    const article = document.querySelector("article.prose-lesson");
    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    const candidates = [];
    let node = walker.nextNode();
    while (node) {
      if ((node.textContent ?? "").trim().length >= 8) candidates.push(node);
      node = walker.nextNode();
    }
    const target = candidates[index];
    if (!target) return null;
    const range = document.createRange();
    range.setStart(target, 2);
    range.setEnd(target, 5);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    article.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    return selection.toString();
  }, nth);
}

/** 选中第一条 mark 内部的文字，制造与已有划线重叠的选区 */
async function selectInsideFirstMark(page) {
  await page.evaluate(() => {
    const mark = document.querySelector("mark.anno-mark");
    const node = mark?.firstChild;
    if (!node) return;
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, Math.min(3, (node.textContent ?? "").length));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
}

let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  await installMockApi(page);

  await page.goto(PAGE, { waitUntil: "networkidle" });
  await page.locator("article.prose-lesson").waitFor();

  // 1) 三类标注各建一条：选区→工具条→按钮→mark 上色
  const kinds = ["note", "record", "question"];
  for (let i = 0; i < kinds.length; i += 1) {
    const quote = await selectTextInArticle(page, i);
    check(Boolean(quote), `第 ${i + 1} 条选区非空`, String(quote));

    const toolbar = page.locator('[role="toolbar"][aria-label="添加划线笔记"]');
    await toolbar.waitFor({ timeout: 5000 });
    await page.locator(`[data-anno-create="${kinds[i]}"]`).click();
    await page
      .locator(`mark.anno-mark.anno-${kinds[i]}[data-annotation-id]`)
      .first()
      .waitFor({ timeout: 5000 });
  }

  for (const kind of kinds) {
    const count = await page.locator(`mark.anno-${kind}`).count();
    check(count >= 1, `生成 ${kind} 划线 mark`, `count=${count}`);
  }

  const probeState = await page.evaluate(() => window.__annoProbe?.state());
  check(probeState?.items.length === 3, "probe 读到 3 条持久化标注", String(probeState?.items.length));
  check(
    (await page.locator("[data-anno-list] [data-anno-item]").count()) === 3,
    "桌面侧栏列出 3 条划线",
  );

  // 2) 点划线弹窗：切换类型 + 写附言（失焦提交 PATCH）
  const firstId = await page
    .locator("mark.anno-mark")
    .first()
    .getAttribute("data-annotation-id");
  await page.locator(`mark.anno-mark[data-annotation-id="${firstId}"]`).click();
  const popover = page.locator(`[data-anno-popover="${firstId}"]`);
  await popover.waitFor({ timeout: 5000 });

  await page.locator('[data-anno-kind="question"]').click();
  await page.locator("[data-anno-note]").fill("smoke 附言：这里要复习");
  await page.keyboard.press("Tab"); // 触发 blur 提交
  await page.waitForFunction(
    (id) => {
      const item = window.__annoProbe.state().items.find((it) => it.id === id);
      return item?.kind === "question" && item?.note === "smoke 附言：这里要复习";
    },
    firstId,
    { timeout: 5000 },
  );
  check(true, "弹窗改类型与附言已提交（probe 状态更新）");
  await page.keyboard.press("Escape");

  // 3) 刷新后划线与附言仍在（假后端在 node 侧持久）
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("mark.anno-mark").first().waitFor({ timeout: 8000 });
  const reloadedCount = await page.locator("mark.anno-mark").count();
  check(reloadedCount === 3, "刷新后 3 条划线重新挂载", `count=${reloadedCount}`);
  const reloaded = await page.evaluate(() =>
    window.__annoProbe.state().items.find((it) => it.note.length > 0),
  );
  check(reloaded?.note === "smoke 附言：这里要复习", "刷新后附言持久化", String(reloaded?.note));

  // 4) 侧栏点击定位：目标 mark 短暂加上 anno-flash
  const targetId = await page
    .locator("[data-anno-list] [data-anno-item]")
    .first()
    .getAttribute("data-anno-item");
  await page.locator(`[data-anno-item="${targetId}"]`).click();
  await page.waitForFunction(
    (id) =>
      document
        .querySelector(`mark[data-annotation-id="${id}"]`)
        ?.classList.contains("anno-flash"),
    targetId,
    { timeout: 5000 },
  );
  check(true, "侧栏点击触发定位闪烁");

  // 5) 弹窗删除：mark 与列表同步消失
  await page.locator(`mark.anno-mark[data-annotation-id="${targetId}"]`).click();
  await page.locator(`[data-anno-popover="${targetId}"] [data-anno-delete]`).click();
  await page.waitForFunction(
    (id) => !document.querySelector(`mark[data-annotation-id="${id}"]`),
    targetId,
    { timeout: 5000 },
  );
  const afterDelete = await page.evaluate(() => window.__annoProbe.state().items.length);
  check(afterDelete === 2, "删除后 probe 剩 2 条", String(afterDelete));
  check(
    (await page.locator("[data-anno-list] [data-anno-item]").count()) === 2,
    "侧栏同步剩 2 条",
  );

  // 6) 重叠/重复选区：不弹工具条，给出冲突提示，mark 数量不变
  const beforeOverlap = await page.locator("mark.anno-mark").count();
  await selectInsideFirstMark(page);
  await page.locator("[data-anno-conflict]").waitFor({ timeout: 5000 });
  check(
    (await page.locator('[role="toolbar"][aria-label="添加划线笔记"]').count()) === 0,
    "重叠选区不弹出划线工具条",
  );
  check(
    (await page.locator("mark.anno-mark").count()) === beforeOverlap,
    "重叠选区不新增 mark",
    `before=${beforeOverlap}`,
  );
  await page.locator("[data-anno-conflict]").waitFor({ state: "detached", timeout: 6000 });

  check(pageErrors.length === 0, "无未捕获页面异常", pageErrors.slice(0, 3).join(" | "));
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  failures.push("脚本异常：" + msg);
  console.log(`✗ 脚本异常：${msg}`);
} finally {
  await browser?.close();
}

console.log(
  failures.length === 0 ? "全部通过" : `失败 ${failures.length} 项：${failures.join("、")}`,
);
process.exit(failures.length === 0 ? 0 : 1);
