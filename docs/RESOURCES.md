# GIS 学习资料清单（Resources）

> ⚠️ 本文件当前**基于我的知识整理**，链接未做实时可用性校验（站点上线前会在 M2 阶段批量核对）。
> 用途：作为 `content/gis/**` 题目的 `refs` 来源池 + 讲义延伸阅读。

---

## 1. 先建心智模型（建议学习顺序）

1. **地球是球面，地图是平面** → 基准面/椭球（datum）、投影（projection）、CRS。
2. **CRS 与 EPSG 编码**：WGS84（EPSG:4326，经纬度，度）vs Web Mercator（EPSG:3857，米，瓦片地图）。
3. **数据模型**：矢量（点/线/面）vs 栅格（像素网格）；要素属性表。
4. **数据格式**：GeoJSON / Shapefile / GeoPackage / GeoTIFF / MVT 矢量瓦片 / PMTiles。
5. **服务标准（OGC）**：WMS（图片）、WMTS（图片瓦片）、WFS（要素）、WCS（栅格）。
6. **前端如何画地图**：瓦片地图库（Leaflet/MapLibre/OpenLayers）+ 图层 + 交互。
7. **空间运算**：buffer / intersect / within / 距离 / 最近邻 —— 前端 Turf.js，后端 PostGIS。
8. **存储与查询**：PostGIS 的 `geometry` 类型、GiST 索引、`ST_*` 函数。

---

## 2. 权威规范（题目 refs 优先引这些）

| 主题 | 出处 |
|---|---|
| GeoJSON | RFC 7946 — https://datatracker.ietf.org/doc/html/rfc7946 |
| TopoJSON | https://github.com/topojson/topojson-specification |
| OGC 标准总览 | https://www.ogc.org/standards/ |
| WMS / WMTS / WFS | OGC 各自标准页（见上） |
| EPSG 代码查询 | https://epsg.io ；https://spatialreference.org |
| 瓦片地图方案 | https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames ；https://docs.maptiler.com/google-maps-coordinates-tile-bounds-projection/ |
| 矢量瓦片规范 | https://github.com/mapbox/vector-tile-spec |
| CRS 概念 | https://proj.org/usage/projections.html |

---

## 3. 前端地图库（学习内容主线，也是题目来源）

- **Leaflet** — https://leafletjs.com/reference.html · 官方教程 https://leafletjs.com/examples.html
  轻、上手快，适合"第一个地图"。缺点：栅格瓦片为主，3D/大数据弱。
- **MapLibre GL JS** — https://maplibre.org/maplibre-gl-js/docs/
  Mapbox GL v1 的开源分支，矢量瓦片 + WebGL，样式驱动（style spec: https://maplibre.org/maplibre-style-spec/）。
- **OpenLayers** — https://openlayers.org/en/latest/examples/ · API https://openlayers.org/en/latest/apidoc/
  投影/图层模型最严谨，适合需要多 CRS 与专业图层的场景。
- **deck.gl** — https://deck.gl/docs （大数据量、聚合、热力）
- **Cesium** — https://cesium.com/learn/cesiumjs-learn/ （3D 地球）
- **Mapbox GL JS** — https://docs.mapbox.com/mapbox-gl-js/guides/ （商业，需 token）

### 配套工具库
- **Turf.js**（空间运算，前端）— https://turfjs.org/docs/
- **proj4js**（坐标转换）— https://github.com/proj4js/proj4js
- **turf/jsts**、**@turf/boolean-point-in-polygon** 等按需
- **shpjs**（浏览器解析 Shapefile）— https://github.com/calvinmetcalf/shapefile-js
- **pmtiles** — https://docs.protomaps.com/pmtiles/
- **tippecanoe**（生成 MVT）— https://github.com/felt/tippecanoe
- **mapshaper**（格式转换/简化）— https://mapshaper.org

---

## 4. 后端与数据（做项目时用）

- **PostGIS** — https://postgis.net/documentation/ · 手册 https://postgis.net/docs/
  必学：`ST_AsGeoJSON`、`ST_Intersects`、`ST_DWithin`、`ST_Buffer`、GiST 索引。
- **GeoServer** — https://docs.geoserver.org/
- **GDAL/OGR**（数据转换事实标准）— https://gdal.org/
- **QGIS**（桌面端，理解 GIS 全貌最快的方式）— https://docs.qgis.org/latest/en/docs/training_manual/
- **DuckDB spatial**（轻量分析，CSV/Parquet + 空间函数）— https://duckdb.org/docs/extensions/spatial

---

## 5. 数据源（练手用）

- Natural Earth（小比例尺底图）— https://www.naturalearthdata.com/
- OpenStreetMap / Geofabrik 抽取 — https://download.geofabrik.de/
- OSM 官方数据说明 — https://planet.openstreetmap.org/
- USGS / Copernicus / GADM / World Bank Open Data（人口、边界）
- GeoJSON 玩具数据：https://github.com/datasets/geo-countries

---

## 6. 系统课程 / 长文

- QGIS Training Manual（免费、系统）— https://docs.qgis.org/latest/en/docs/training_manual/
- UC Davis GIS Specialization（Coursera，付费）
- Esri MOOC / Learn ArcGIS（免费课程，商业生态视角）
- "GIS Fundamentals" — Paul Bolstad（教材，概念最扎实）
- "PostGIS in Action"（Manning）
- "Web Mapping Illustrated"（较早，但 Web 地图脉络清晰）
- **Mapbox/MapTiler 教程**（实战向）：https://docs.maptiler.com/ · https://docs.mapbox.com/help/tutorials/
- FOSS4G 会议录像（YouTube 搜 "FOSS4G"）— 了解真实工程实践

---

## 7. 社区 / 聚合

- **awesome-gis** — https://github.com/sshuair/awesome-gis
- **awesome-vector-tiles** — https://github.com/mapbox/awesome-vector-tiles
- GIS StackExchange — https://gis.stackexchange.com/
- r/gis
- Observable（地理可视化 notebook 示例）

---

## 8. 题库切入点（第一批 10 题建议覆盖）

1. EPSG:4326 与 EPSG:3857 的区别（度 vs 米，Web 地图用哪个）。
2. Web Mercator 在高纬度为什么会拉伸变形。
3. GeoJSON `Feature` / `FeatureCollection` / `Geometry` 的嵌套关系。
4. GeoJSON 坐标顺序（经度在前，RFC 7946 明确）。
5. WMS 与 WMTS 的区别（按需渲染 vs 预生成瓦片）。
6. 矢量瓦片相比 GeoJSON 的优势（体积/分块/客户端样式）。
7. Leaflet `L.geoJSON()` 与 `L.tileLayer()` 分别做什么。
8. Turf `buffer` 的第三个参数单位是什么（kilometers 等）。
9. PostGIS 中判断两点距离用什么函数（`ST_Distance` / `ST_DWithin`）。
10. 地图上"点击选坐标"时 `e.latlng` 与 `e.containerPoint` 的区别。
