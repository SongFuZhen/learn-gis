import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("合并重复的 tailwind 类时后者胜出", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("忽略 falsy 值", () => {
    expect(cn("text-sm", false, undefined, null, "font-medium")).toBe(
      "text-sm font-medium",
    );
  });
});
