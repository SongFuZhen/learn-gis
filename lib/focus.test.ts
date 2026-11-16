import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FOCUS_STORAGE_KEY,
  readFocusPref,
  writeFocusPref,
} from "./focus";

const store = new Map<string, string>();

const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;

beforeEach(() => {
  store.clear();
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: createMemoryStorage() },
    configurable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: createMemoryStorage(),
    configurable: true,
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    value: originalWindow,
    configurable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: originalLocalStorage,
    configurable: true,
  });
});

function createMemoryStorage() {
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  };
}

describe("专注模式偏好", () => {
  it("无记录默认关闭", () => {
    expect(readFocusPref()).toBe(false);
  });

  it("写入 1 后读回开启，写入 0 后关闭", () => {
    writeFocusPref(true);
    expect(store.get(FOCUS_STORAGE_KEY)).toBe("1");
    expect(readFocusPref()).toBe(true);

    writeFocusPref(false);
    expect(store.get(FOCUS_STORAGE_KEY)).toBe("0");
    expect(readFocusPref()).toBe(false);
  });

  it("脏值不视为开启", () => {
    store.set(FOCUS_STORAGE_KEY, "yes");
    expect(readFocusPref()).toBe(false);
  });
});
