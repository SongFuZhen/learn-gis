import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnotationItem } from "./store";

/** 每个用例重新加载模块，拿到干净的单例 state */
async function freshStore() {
  vi.resetModules();
  return await import("./store");
}

function item(over: Partial<AnnotationItem> = {}): AnnotationItem {
  return {
    id: "synthetic-id",
    skill: "gis",
    moduleSlug: "00",
    kind: "note",
    quote: "示例原文",
    anchor: { start: 0, end: 4, prefix: "", suffix: "" },
    note: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn(async () => body),
  } as unknown as Response;
}

/** 模拟组件挂载：先加载章节，置好 currentKey，create 落地守卫才会放行 */
async function loadChapter(store: Awaited<ReturnType<typeof freshStore>>) {
  vi.mocked(fetch).mockImplementationOnce(async () =>
    jsonResponse({ annotations: [] }),
  );
  await store.loadChapter("gis", "00");
}

describe("annotations store 竞态与回滚", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loadChapter：旧章响应晚到必须丢弃，不能覆盖当前章", async () => {
    const store = await freshStore();
    const fetchMock = vi.mocked(fetch);

    let resolveOld: (v: Response) => void = () => {};
    const oldPending = new Promise<Response>((r) => {
      resolveOld = r;
    });
    // 第一次（旧章 A）请求挂起；第二次（新章 B）立即返回
    fetchMock
      .mockImplementationOnce(() => oldPending)
      .mockImplementationOnce(async () =>
        jsonResponse({ annotations: [item({ id: "b-item", moduleSlug: "01" })] }),
      );

    void store.loadChapter("gis", "00");
    void store.loadChapter("gis", "01");
    await Promise.resolve();
    await Promise.resolve();

    // 旧章 A 的响应此时才落地
    resolveOld(jsonResponse({ annotations: [item({ id: "a-item", moduleSlug: "00" })] }));
    await oldPending;
    await Promise.resolve();

    const ids = store.getSnapshot().items.map((it) => it.id);
    expect(ids).toEqual(["b-item"]);
    expect(store.getSnapshot().loading).toBe(false);
  });

  it("createAnnotation：POST 失败时乐观条目回滚", async () => {
    const store = await freshStore();
    await loadChapter(store);
    vi.mocked(fetch).mockImplementation(async () => ({
      ok: false,
      status: 500,
    }) as Response);

    await store.createAnnotation({
      skill: "gis",
      moduleSlug: "00",
      kind: "note",
      quote: "示例原文",
      anchor: { start: 0, end: 4, prefix: "", suffix: "" },
    });

    expect(store.getSnapshot().items).toHaveLength(0);
  });

  it("createAnnotation：成功后 temp 条目被服务端记录替换", async () => {
    const store = await freshStore();
    await loadChapter(store);
    vi.mocked(fetch).mockImplementation(async () =>
      jsonResponse({ annotation: item({ id: "server-id" }) }),
    );

    await store.createAnnotation({
      skill: "gis",
      moduleSlug: "00",
      kind: "record",
      quote: "示例原文",
      anchor: { start: 0, end: 4, prefix: "", suffix: "" },
    });

    const items = store.getSnapshot().items;
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("server-id");
    expect(items[0]?.id.startsWith("temp-")).toBe(false);
  });

  it("removeAnnotation：DELETE 失败时条目回滚", async () => {
    const store = await freshStore();
    await loadChapter(store);
    const fetchMock = vi.mocked(fetch);
    // 先让一次创建成功，预置一条服务端记录
    fetchMock.mockImplementationOnce(async () =>
      jsonResponse({ annotation: item({ id: "keep-id" }) }),
    );
    await store.createAnnotation({
      skill: "gis",
      moduleSlug: "00",
      kind: "note",
      quote: "示例原文",
      anchor: { start: 0, end: 4, prefix: "", suffix: "" },
    });
    fetchMock.mockImplementationOnce(async () => ({
      ok: false,
      status: 500,
    }) as Response);

    await store.removeAnnotation("keep-id");

    expect(store.getSnapshot().items.map((it) => it.id)).toEqual(["keep-id"]);
  });

  it("removeAnnotation：切章后失败回滚不得污染新章列表", async () => {
    const store = await freshStore();
    await loadChapter(store);
    const fetchMock = vi.mocked(fetch);
    // 预置旧章记录
    fetchMock.mockImplementationOnce(async () =>
      jsonResponse({ annotation: item({ id: "old-item", moduleSlug: "00" }) }),
    );
    await store.createAnnotation({
      skill: "gis",
      moduleSlug: "00",
      kind: "note",
      quote: "示例原文",
      anchor: { start: 0, end: 4, prefix: "", suffix: "" },
    });

    let failDelete: () => void = () => {};
    const deletePending = new Promise<Response>((_, reject) => {
      failDelete = () => reject(new Error("network down"));
    });
    fetchMock.mockImplementationOnce(() => deletePending);
    const removal = store.removeAnnotation("old-item");

    // 删除进行中切到新章并加载新数据
    fetchMock.mockImplementationOnce(async () =>
      jsonResponse({ annotations: [item({ id: "new-item", moduleSlug: "01" })] }),
    );
    void store.loadChapter("gis", "01");
    await Promise.resolve();
    await Promise.resolve();

    failDelete();
    await removal.catch(() => {});
    await Promise.resolve();

    expect(store.getSnapshot().items.map((it) => it.id)).toEqual(["new-item"]);
  });
});
