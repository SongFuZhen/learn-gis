import { SITE_NAME } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="hidden border-t border-border lg:block">
      <div className="mx-auto flex w-full items-center justify-between gap-4 px-8 py-5 text-[12px] text-foreground-muted">
        <p>{SITE_NAME} · 内容以仓库内 MDX / JSON 为准，欢迎 PR 纠错</p>
        <p>引用来源见 docs/RESOURCES.md</p>
      </div>
    </footer>
  );
}
