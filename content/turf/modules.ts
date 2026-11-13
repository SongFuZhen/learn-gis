/** Turf.js 课程大纲与模块元数据 */

import type { ModuleMeta } from "../types";

/**
 * 已上线章节（全部 10 章）。
 * 二维地图应用的几何引擎：定位 → 量测 → 方位 → 缓冲变换 → 空间判断 →
 * 点面实战 → 聚合 → 插值采样 → 地图框架集成 → 数据工程与性能收官。
 */
export const TURF_MODULES: ModuleMeta[] = [
  {
    slug: "00",
    file: "00-turf-intro",
    title: "初见 Turf：浏览器里的几何引擎",
    summary:
      "Turf 是什么、与 GIS 理论课和 Cesium 的分工，GeoJSON 作为唯一输入输出，Vite/CDN 两种接入方式，第一个 area 面积计算。",
  },
  {
    slug: "01",
    file: "01-measurement",
    title: "量测全家桶：距离、长度、面积与沿线取点",
    summary:
      "distance、length、area、along、pointToLineDistance 的单位与适用面，对比 Cesium 的弦长/大圆/贴地三种三维量算。",
  },
  {
    slug: "02",
    file: "02-bearing-destination",
    title: "方位角与目的地：在椭球面上推演坐标",
    summary:
      "bearing 与 rhumbBearing 的区别、destination 反解目的地、中点与圆心计算，对比 Cesium Ellipsoid 经纬网 API。",
  },
  {
    slug: "03",
    file: "03-buffer-transform",
    title: "缓冲与变换：buffer、circle 与仿射操作",
    summary:
      "buffer 缓冲区分割线/面的差异、circle 离散圆、transformRotate/transformScale/transformTranslate 与 bbox 系列工具。",
  },
  {
    slug: "04",
    file: "04-boolean-joins",
    title: "空间判断与叠置：boolean 系列与交并差",
    summary:
      "booleanPointInPolygon、booleanContains/Within/Overlap 的语义边界，intersect/union/difference 叠置运算与 Multi 几何处理。",
  },
  {
    slug: "05",
    file: "05-point-polygon-voronoi",
    title: "点面分析实战：归属判断、等值面与泰森多边形",
    summary:
      "批量点归属到行政区、isobands 等值面生成、voronoi 泰森多边形的 Delaunay 底子与业务用法（服务区/邻域）。",
  },
  {
    slug: "06",
    file: "06-aggregation",
    title: "聚合统计：collect、聚类与网格计数",
    summary:
      "collect 属性收集、clustersDbscan/clustersKmeans 两种聚类、hexGrid/rectangleGrid 网格 + pointCount 热力底表。",
  },
  {
    slug: "07",
    file: "07-interpolation-random",
    title: "插值与采样：interpolate、随机数据与 sample",
    summary:
      "interpolate 线性插值做分段渲染、randomPoint/randomLine/randomPolygon 测试数据生成、sample 沿线采样的工程用途。",
  },
  {
    slug: "08",
    file: "08-leaflet-maplibre",
    title: "接入地图框架：Leaflet / MapLibre 里跑 Turf",
    summary:
      "GeoJSON 在 Turf 与地图库之间的双向流、鼠标绘制 + 实时 buffer 闭环、MapLibre GL 数据源与 Turf 结果的更新模式。",
  },
  {
    slug: "09",
    file: "09-performance-data",
    title: "数据工程与性能：清洗、拍平与 Web Worker",
    summary:
      "flatten/explode/combine、rewind 环方向、cleanCoords 修坐标，大数组 benchmark 方法论与 Web Worker 卸载主线程。",
  },
];

/** 已规划但尚未交付的章节 */
export const PLANNED_MODULES: { slug: string; title: string }[] = [];
