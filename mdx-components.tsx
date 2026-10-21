import type { MDXComponents } from "mdx/types";
import Link from "next/link";

/**
 * MDX 全局组件映射（@next/mdx App Router 约定文件）。
 * 讲义里可以直接用 <Callout>、<KeyPoint> 之类的自定义块，在这里统一登记。
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: ({ href = "", ...props }) => {
      const isInternal = href.startsWith("/");
      if (isInternal) {
        return <Link href={href} {...props} />;
      }
      return (
        <a href={href} target="_blank" rel="noreferrer noopener" {...props} />
      );
    },
    ...components,
  };
}
