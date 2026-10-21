import { SITE_NAME } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-content flex-col gap-2 px-4 py-6 text-xs text-foreground-tertiary sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          {SITE_NAME} · 内容以仓库内 MDX / JSON 为准，欢迎 PR 纠错
        </p>
        <p>地图与标准引用见 docs/RESOURCES.md</p>
      </div>
    </footer>
  );
}
