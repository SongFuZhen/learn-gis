/**
 * 路由级加载骨架：服务端组件取数期间立即渲染，避免导航时整页无反馈。
 * 纯灰块脉冲，不模拟具体布局，各页面通用。
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="加载中"
      className="w-full animate-pulse px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
    >
      <div className="h-7 w-40 rounded-md bg-background-muted" />
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-background-muted" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="h-64 rounded-lg bg-background-muted lg:col-span-2" />
        <div className="h-64 rounded-lg bg-background-muted" />
      </div>
      <div className="mt-7 h-5 w-28 rounded-md bg-background-muted" />
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-44 rounded-lg bg-background-muted" />
        ))}
      </div>
    </div>
  );
}
