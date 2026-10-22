import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import EmbedMap from "@/components/EmbedMap";

/**
 * MDX 全局组件映射（@next/mdx App Router 约定文件）。
 * 讲义里可以直接用 <Callout>、<KeyPoint> 之类的自定义块，在这里统一登记。
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // 讲义里可写 <MapExample lat={39.9} lng={116.4} label="北京" /> 内嵌地图
    MapExample: EmbedMap,
    a: ({ href = "", ...props }) => {
      const isInternal = href.startsWith("/");
      if (isInternal) {
        return <Link href={href} {...props} />;
      }
      return (
        <a href={href} target="_blank" rel="noreferrer noopener" {...props} />
      );
    },
    // 多列宽表在手机上横向滑动；移动端给一句滑动提示
    table: (props) => (
      <div className="mdx-table">
        <div className="mdx-table-wrap">
          <table {...props} />
        </div>
        <p className="mdx-table-hint">← 左右滑动查看完整表格 →</p>
      </div>
    ),
    ...components,
  };
}
