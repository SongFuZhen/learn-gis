/** 常用权威引用 + 地理/瓦片数学工具 */
import type { Ref } from "./helpers";

export const REF = {
  epsg4326: { title: "EPSG:4326", url: "https://epsg.io/4326" },
  epsg3857: { title: "EPSG:3857", url: "https://epsg.io/3857" },
  epsg4490: { title: "EPSG:4490", url: "https://epsg.io/4490" },
  utm: {
    title: "UTM 坐标系统",
    url: "https://en.wikipedia.org/wiki/Universal_Transverse_Mercator_coordinate_system",
  },
  gaussKruger: {
    title: "Gauss-Kruger 投影",
    url: "https://en.wikipedia.org/wiki/Gauss%E2%80%93Kr%C3%BCger_coordinate_system",
  },
  greatCircle: {
    title: "大圆距离",
    url: "https://en.wikipedia.org/wiki/Great-circle_distance",
  },
  dms: {
    title: "地理坐标转换（度分秒 ↔ 十进制）",
    url: "https://en.wikipedia.org/wiki/Geographic_coordinate_conversion",
  },
  tilenames: {
    title: "OSM Slippy map tilenames",
    url: "https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames",
  },
  quadkey: {
    title: "Bing Maps Tile System",
    url: "https://learn.microsoft.com/en-us/bingmaps/articles/bing-maps-tile-system",
  },
  geojson: { title: "GeoJSON RFC 7946", url: "https://www.rfc-editor.org/rfc/rfc7946" },
  wms: { title: "OGC WMS", url: "https://www.ogc.org/standard/wms/" },
  wmts: { title: "OGC WMTS", url: "https://www.ogc.org/standard/wmts/" },
  wfs: { title: "OGC WFS", url: "https://www.ogc.org/standard/wfs/" },
  geopackage: { title: "OGC GeoPackage", url: "https://www.ogc.org/standard/geopackage/" },
  shapefile: {
    title: "GDAL Shapefile 驱动文档",
    url: "https://gdal.org/en/latest/drivers/vector/shapefile.html",
  },
  postgis: { title: "PostGIS 官方文档", url: "https://postgis.net/documentation/" },
  postgisDistance: {
    title: "PostGIS ST_Distance",
    url: "https://postgis.net/docs/ST_Distance.html",
  },
  postgisArea: { title: "PostGIS ST_Area", url: "https://postgis.net/docs/ST_Area.html" },
  postgisRelation: {
    title: "PostGIS 空间关系函数",
    url: "https://postgis.net/docs/reference.html#spatial_relationships",
  },
  gisWiki: {
    title: "GIS - Wikipedia",
    url: "https://en.wikipedia.org/wiki/Geographic_information_system",
  },
  topology: {
    title: "拓扑关系（GIS）",
    url: "https://en.wikipedia.org/wiki/Topological_data_structure",
  },
  mercator: {
    title: "Web Mercator 投影",
    url: "https://en.wikipedia.org/wiki/Web_Mercator_projection",
  },
  scale: { title: "地图比例尺", url: "https://en.wikipedia.org/wiki/Scale_(map)" },
  vectorTiles: {
    title: "OGC 矢量瓦片（Mapbox Vector Tile）",
    url: "https://www.ogc.org/standard/mvt/",
  },
} satisfies Record<string, Ref>;

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

/** Web 墨卡托（EPSG:3857）瓦片公式：返回 z 级下的瓦片 x/y 与边长片数 */
export function tileXY(lon: number, lat: number, z: number): { x: number; y: number; n: number } {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(lat * DEG) + 1 / Math.cos(lat * DEG)) / Math.PI) / 2) * n,
  );
  return { x, y, n };
}

/** 瓦片左上角经纬度 */
export function tileTopLeft(x: number, y: number, z: number): { lat: number; lng: number } {
  const n = 2 ** z;
  const lng = (x / n) * 360 - 180;
  const lat = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * RAD;
  return { lat, lng };
}

/** haversine 大圆距离（km），R = 6371 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * DEG;
  const dLng = (lng2 - lng1) * DEG;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** quadkey：瓦片 x/y/z 的四叉树键（保留前导零，z=0 返回 "0"） */
export function quadkey(x: number, y: number, z: number): string {
  let key = "";
  for (let i = z - 1; i >= 0; i -= 1) {
    let digit = 0;
    const mask = 1 << i;
    if ((y & mask) !== 0) digit += 2;
    if ((x & mask) !== 0) digit += 1;
    key += String(digit);
  }
  return key || "0";
}

/** EPSG:3857 z 级赤道处地面分辨率（米/像素，256px 瓦片） */
export function tileResolutionM(z: number): number {
  return 156543.03392 / 2 ** z;
}
