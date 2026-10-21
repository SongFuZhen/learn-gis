import createMDX from "@next/mdx";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // 允许 app/ 与 content/ 下直接写 .mdx 讲义
  pageExtensions: ["ts", "tsx", "mdx"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    // Turbopack 只接受「可序列化」的插件配置：这里必须写插件名字符串，
    // 传函数会报 "loader does not have serializable options"（见 Next MDX 文档）
    remarkPlugins: ["remark-gfm"],
  },
});

export default withMDX(nextConfig);
