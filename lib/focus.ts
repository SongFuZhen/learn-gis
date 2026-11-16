/**
 * 专注模式偏好：仅存「手动开关」状态。
 * 测验/考试的强制沉浸由调用方结合 isFocusMode(pathname) 计算，不写进偏好。
 */
export const FOCUS_STORAGE_KEY = "learn-gis:focus-mode";

/** SSR、无 localStorage 或脏值一律按关闭处理 */
export function readFocusPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(FOCUS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** 隐私模式等场景写入可能抛错，偏好失效不应打断学习流程 */
export function writeFocusPref(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FOCUS_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore storage failure
  }
}
