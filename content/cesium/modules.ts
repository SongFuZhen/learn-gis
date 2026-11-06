/** Cesium 课程大纲与模块元数据 */

import type { ModuleMeta } from "../types";

/**
 * 已上线章节（Phase 1：00-03）。
 * 从零到一学会 CesiumJS：环境 → 相机坐标系 → 影像 → 地形 → 实体 → 时间动态 →
 * 3D Tiles → 拾取交互 → 空间量算 → 性能与实战收官。
 */
export const CESIUM_MODULES: ModuleMeta[] = [
  {
    slug: "00",
    file: "00-cesium-intro",
    title: "初见 CesiumJS：三维地球与第一个 Viewer",
    summary:
      "Cesium 和 Leaflet/MapLibre 的本质区别（3D + 时间）、Vite 环境准备、用 OSM 底图创建第一个 Viewer，以及所有人都会踩的默认 ion 影像 401 坑。",
  },
  {
    slug: "01",
    file: "01-camera-coords",
    title: "相机与坐标系：经纬度变成三维坐标",
    summary:
      "把 GIS 课的经纬度翻译成 Cesium 的 Cartesian3 笛卡尔坐标，相机六大操作，heading/pitch/roll 怎么读怎么用。",
  },
  {
    slug: "02",
    file: "02-imagery-layers",
    title: "影像图层：瓦片金字塔与多图层叠加",
    summary:
      "ImageryProvider 家族与瓦片金字塔（衔接 GIS 课的瓦片章节），多图层叠加、透明度与层级，UrlTemplateImageryProvider 接自定义瓦片服务。",
  },
  {
    slug: "03",
    file: "03-terrain",
    title: "地形：影像之外的第二层",
    summary:
      "影像和地形为什么是两层东西，EllipsoidTerrainProvider 的默认平地行为，quantized-mesh 概念与真实地形数据的来路。",
  },
];

/** 已规划但尚未交付的章节（04-09 随 Phase 2 转正） */
export const PLANNED_MODULES: { slug: string; title: string }[] = [
  { slug: "04", title: "Entity 可视化与 GeoJSON" },
  { slug: "05", title: "CZML 与时间动态" },
  { slug: "06", title: "3D Tiles：三维瓦片与城市" },
  { slug: "07", title: "拾取与交互事件" },
  { slug: "08", title: "空间量算：距离、面积与贴地线" },
  { slug: "09", title: "性能优化与实战收官" },
];
