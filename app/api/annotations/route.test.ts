import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const ANNO_ID = "22222222-2222-4222-8222-222222222222";

vi.mock("@/lib/api/user", () => ({
  getOrCreateUserId: vi.fn(async () => "11111111-1111-4111-8111-111111111111"),
}));

/** 终结方法返回值在每个用例里通过 setResult 控制；vi.hoisted 保证 mock 工厂引用先于初始化 */
const { dbMock, setTerminalResult } = vi.hoisted(() => {
  let terminalResult: unknown = [];
  const terminal = vi.fn(async () => terminalResult);
  const chainNode = {
    from: vi.fn(() => chainNode),
    where: vi.fn(() => chainNode),
    // GET 链以 orderBy 结尾并被 await，必须返回 promise（调用 terminal()）而非函数本身
    orderBy: vi.fn(() => terminal()),
    values: vi.fn(() => chainNode),
    set: vi.fn(() => chainNode),
    returning: terminal,
  };
  const dbMock = {
    select: vi.fn(() => chainNode),
    insert: vi.fn(() => chainNode),
    update: vi.fn(() => chainNode),
    delete: vi.fn(() => chainNode),
  };
  return { dbMock, setTerminalResult: (v: unknown) => (terminalResult = v) };
});
vi.mock("@/db", () => ({ db: dbMock }));

import { GET, POST } from "./route";
import { PATCH, DELETE } from "./[id]/route";

const validBody = {
  skill: "gis",
  moduleSlug: "01",
  kind: "note",
  quote: "大地线",
  anchor: { start: 11, end: 14, prefix: "", suffix: "测量" },
  note: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  setTerminalResult([]);
});

describe("GET /api/annotations", () => {
  it("缺少 module 查询参数返回 400", async () => {
    const req = new NextRequest("http://localhost/api/annotations?skill=gis");
    expect((await GET(req)).status).toBe(400);
  });

  it("合法查询返回标注列表", async () => {
    setTerminalResult([{ id: ANNO_ID, ...validBody }]);
    const req = new NextRequest(
      "http://localhost/api/annotations?skill=gis&module=01",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect((await res.json()).annotations).toHaveLength(1);
  });
});

describe("POST /api/annotations", () => {
  it("非法 JSON 返回 400", async () => {
    const req = new NextRequest("http://localhost/api/annotations", {
      method: "POST",
      body: "not-json",
    });
    expect((await POST(req)).status).toBe(400);
  });

  it("kind 非法 / 缺 quote / 锚点反转均返回 400", async () => {
    const cases = [
      { ...validBody, kind: "bad" },
      { ...validBody, quote: "" },
      { ...validBody, anchor: { ...validBody.anchor, end: 1 } },
    ];
    for (const body of cases) {
      const req = new NextRequest("http://localhost/api/annotations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      expect((await POST(req)).status).toBe(400);
    }
  });

  it("合法 body 创建并返回 201", async () => {
    setTerminalResult([{ id: ANNO_ID, ...validBody }]);
    const req = new NextRequest("http://localhost/api/annotations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect((await res.json()).annotation.id).toBe(ANNO_ID);
  });
});

describe("[id] PATCH/DELETE", () => {
  it("PATCH 非法 uuid 返回 400", async () => {
    const req = new NextRequest("http://localhost/api/annotations/nope", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ note: "x" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(400);
  });

  it("PATCH 空 body（无 kind 无 note）返回 400", async () => {
    const req = new NextRequest(
      `http://localhost/api/annotations/${ANNO_ID}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    const res = await PATCH(req, { params: Promise.resolve({ id: ANNO_ID }) });
    expect(res.status).toBe(400);
  });

  it("DELETE 查无记录（越权/不存在）返回 404", async () => {
    setTerminalResult([]);
    const req = new NextRequest(
      `http://localhost/api/annotations/${ANNO_ID}`,
      { method: "DELETE" },
    );
    const res = await DELETE(req, { params: Promise.resolve({ id: ANNO_ID }) });
    expect(res.status).toBe(404);
  });

  it("DELETE 命中返回 200", async () => {
    setTerminalResult([{ id: ANNO_ID }]);
    const req = new NextRequest(
      `http://localhost/api/annotations/${ANNO_ID}`,
      { method: "DELETE" },
    );
    const res = await DELETE(req, { params: Promise.resolve({ id: ANNO_ID }) });
    expect(res.status).toBe(200);
  });
});
