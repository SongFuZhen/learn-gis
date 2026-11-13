/** HarmonyOS / ArkTS 课程大纲与模块元数据 */

import type { ModuleMeta } from "../types";

/**
 * 已上线章节（8 章）。
 * 平台开发轨：生态认知 → 工程结构 → 声明式 UI → 状态管理 →
 * 路由 → 网络异步 → 持久化与生命周期 → 性能安全综合实战。
 * 来源：HarmonyOS_Chat 闯关路线图（8 关）归并改写。
 */
export const HARMONY_MODULES: ModuleMeta[] = [
  {
    slug: "00",
    file: "00-cognitive-map",
    title: "认知地图：鸿蒙生态、Stage 模型与 ArkTS",
    summary:
      "HarmonyOS 技术栈全貌、ArkTS 作为 TypeScript 严格子集的约束、Stage 模型与 ArkUI/ArkData 全景，建立 React 视角的概念映射。",
  },
  {
    slug: "01",
    file: "01-env-project",
    title: "环境与工程结构：DevEco Studio 与 Stage 工程",
    summary:
      "DevEco Studio 起步、AppScope/app.json5 与 module.json5 职责、entry 模块目录、hvigor 构建与 ohpm 包管理、资源目录与权限声明。",
  },
  {
    slug: "02",
    file: "02-arkui-declarative",
    title: "ArkUI 声明式 UI：组件、布局与构建函数",
    summary:
      "@Component struct 与 build()、Column/Row/Stack 布局、基础组件与事件、ForEach/List 列表渲染、@Builder 构建函数，与 React/Compose 类比。",
  },
  {
    slug: "03",
    file: "03-state-management",
    title: "状态管理 V1/V2：装饰器与不刷新排查",
    summary:
      "@State/@Prop/@Link/@Provide/@Consume 与 AppStorage，V2 的 @Local/@Param/@Event/@ObservedV2/@Trace，状态不刷新高频坑与排查路径。",
  },
  {
    slug: "04",
    file: "04-navigation",
    title: "页面路由 Navigation：NavPathStack 与转场",
    summary:
      "Navigation + NavDestination 架构、NavPathStack 栈操作与参数传递、路由转场动画、组件/页面生命周期，router 已不推荐的原因。",
  },
  {
    slug: "05",
    file: "05-network-async",
    title: "网络与异步：HTTP、WebSocket 与 TaskPool",
    summary:
      "@ohos.net.http 请求与权限声明、WebSocket 长连接、Promise/async 约定、TaskPool 与 Worker 并发选型、超时与取消。",
  },
  {
    slug: "06",
    file: "06-persistence-lifecycle",
    title: "数据持久化与 UIAbility 生命周期",
    summary:
      "Preferences 键值存储、RDB 关系型数据库选型与事务、UIAbility 生命周期回调、上下文 Context、PersistenceV2 与状态持久化。",
  },
  {
    slug: "07",
    file: "07-polish-practice",
    title: "性能、安全、动画、测试与综合实战",
    summary:
      "LazyForEach 长列表、动画与媒体、安全实践（证书校验/权限最小化）、测试体系、九大高频坑复盘，综合闯关 App 架构蓝图。",
  },
];

/** 已规划但尚未交付的章节 */
export const PLANNED_MODULES: { slug: string; title: string }[] = [];
