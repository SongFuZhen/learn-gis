/** GIS 课程大纲与模块元数据 */

export type ModuleMeta = {
  /** 两位数模块号，用作 URL 片段 */
  slug: string;
  /** 文件名前缀，如 01-basics */
  file: string;
  title: string;
  summary: string;
};

/**
 * 已上线章节（14 章布局）：
 * 坐标直觉 → 数据模型 → 制图表达 → 数据获取 → 空间分析 → 存储运算 → 服务与开发。
 * 未交付章节在 PLANNED_MODULES，逐批转正。
 */
export const GIS_MODULES: ModuleMeta[] = [
  {
    slug: "00",
    file: "00-geo-math",
    title: "坐标、角度与经纬度（数学打底）",
    summary:
      "零基础起步：一个点为什么是一组数字、平面直角坐标的三种 x/y 约定、度分秒与弧度换算、经纬度是什么以及「一度有多长」。",
  },
  {
    slug: "01",
    file: "01-basics",
    title: "地球、椭球与基准面",
    summary:
      "用旋转椭球近似不规则的地球，并用基准面规定椭球怎么摆；为什么同一经纬度换个基准面就差上百米。",
  },
  {
    slug: "02",
    file: "02-projection",
    title: "地图投影：变形与取舍",
    summary:
      "球面为什么不能无变形地铺平，等角/等积/等距怎么选，以及你天天在用的 Web 墨卡托做了什么简化。",
  },
  {
    slug: "03",
    file: "03-crs-epsg",
    title: "坐标参考系实战：EPSG、分带与重投影",
    summary:
      "地理坐标 vs 投影坐标、EPSG 编码体系、轴序与单位陷阱、UTM/高斯分带与基准面转换。",
  },
  {
    slug: "04",
    file: "04-vector-raster",
    title: "矢量与栅格：空间数据模型",
    summary:
      "点线面与属性表、拓扑、像元与分辨率、重采样，以及矢量与栅格各自的适用场景。",
  },
  {
    slug: "05",
    file: "05-cartography",
    title: "地图制图：符号、配色与数据分级",
    summary:
      "从数据到图：视觉变量、顺序/发散/类别配色、四种分级方法、比例尺与综合，以及地图为什么会说谎。",
  },
  {
    slug: "06",
    file: "06-formats-tiles",
    title: "数据格式与瓦片",
    summary:
      "GeoJSON / Shapefile / GeoPackage / GeoTIFF / COG，瓦片金字塔、MVT 矢量瓦片与 PMTiles。",
  },
  {
    slug: "07",
    file: "07-gis-tools",
    title: "QGIS 与 GDAL/OGR 工具链",
    summary:
      "打开 QGIS 认识界面，用 ogrinfo/gdalinfo 体检数据，用 ogr2ogr/gdalwarp 做转换、重投影与裁剪。",
  },
  {
    slug: "08",
    file: "08-data-quality",
    title: "数据采集与数据质量",
    summary:
      "GNSS 原理与 RTK、地图数字化、OSM 与开放数据、质量六维、accuracy vs precision、元数据与溯源。",
  },
  {
    slug: "09",
    file: "09-spatial-analysis",
    title: "空间分析 I：缓冲、叠置与邻域",
    summary:
      "缓冲区、叠置分析（交/并/差）、空间连接、近邻与网格统计、可达性入门——GIS 的核心生产力。",
  },
  {
    slug: "10",
    file: "10-terrain",
    title: "空间分析 II：插值、DEM 与地形",
    summary:
      "IDW/样条/克里金怎么选、DEM 从哪来、nDSM 减法、坡度坡向山体阴影、水文四步与流域。",
  },
  {
    slug: "12",
    file: "12-spatial-db",
    title: "空间运算与空间数据库",
    summary:
      "Buffer/Intersect/Distance、GiST 索引与 KNN，Turf.js 与 PostGIS 各自的正确用法。",
  },
  {
    slug: "13",
    file: "13-webgis",
    title: "OGC 服务与 WebGIS 实战",
    summary:
      "WMS / WMTS / WFS / WCS / OGC API，Leaflet、MapLibre、OpenLayers 的分工与性能取舍。",
  },
];

/** 已规划但尚未交付的章节（全部交付后应为空） */
export const PLANNED_MODULES: { slug: string; title: string }[] = [
  { slug: "11", title: "遥感基础" },
];
