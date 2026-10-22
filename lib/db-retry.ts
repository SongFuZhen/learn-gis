// 识别 Neon 池器偶发的瞬时连接错误：握手被掐断、连接被回收、池满等。
// 这些不应直接 500，重试一次（新连接）通常就能成功。
const TRANSIENT = /ECONNRESET|ECONNREFUSED|ETIMEDOUT|57P01|08006|08001|08004|53300|Connection terminated|Client network socket disconnected|server closed the connection/i;

function isTransient(e: unknown): boolean {
  if (!e) return false;
  const msg = e instanceof Error ? e.message : String(e);
  const code = (e as { code?: string }).code ?? "";
  return TRANSIENT.test(msg + " " + code);
}

/** 包裹一次 DB 操作，瞬时连接错误最多重试 maxAttempts-1 次。 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!isTransient(e)) throw e;
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}
