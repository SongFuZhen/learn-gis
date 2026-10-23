/** GIS 课程大纲与模块元数据 */

export type ModuleMeta = {
  /** 两位数模块号，用作 URL 片段 */
  slug: string;
  /** 文件名前缀，如 01-basics */
  file: string;
  title: string;
  summary: string;
};

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
    title: "地图投影与 Web 墨卡托",
    summary:
      "球面为什么不能无变形地铺平，等角/等积/等距怎么选，以及你天天在用的 Web 墨卡托做了什么简化。",
  },
  {
    slug: "03",
    file: "03-crs-epsg",
    title: "坐标参考系与 EPSG",
    summary:
      "地理坐标 vs 投影坐标、EPSG 编码体系、轴序与单位陷阱、UTM/高斯分带与基准面转换。",
  },
  {
    slug: "04",
    file: "04-vector-raster",
    title: "矢量与栅格数据模型",
    summary:
      "点线面与属性表、拓扑、像元与分辨率、重采样，以及矢量与栅格各自的适用场景。",
  },
  {
    slug: "05",
    file: "05-formats-tiles",
    title: "数据格式与矢量瓦片",
    summary:
      "GeoJSON / Shapefile / GeoPackage / GeoTIFF / COG，瓦片金字塔、MVT 矢量瓦片与 PMTiles。",
  },
  {
    slug: "06",
    file: "06-ogc-webmap",
    title: "OGC 服务与前端地图库",
    summary:
      "WMS / WMTS / WFS / WCS / OGC API，Leaflet、MapLibre、OpenLayers 的分工与性能取舍。",
  },
  {
    slug: "07",
    file: "07-spatial-postgis",
    title: "空间运算与 PostGIS",
    summary:
      "Buffer/Intersect/Distance、GiST 索引与 KNN，Turf.js 与 PostGIS 各自的正确用法。",
  },
];

/** 已规划但尚未交付的章节（全部交付后应为空） */
export const PLANNED_MODULES: { slug: string; title: string }[] = [];
