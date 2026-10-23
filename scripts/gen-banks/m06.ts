/** m06 PostGIS：几何计算 50 + 判断 40 + 短答 30 + 单选 30 = 150 题 */
import {
  numeric,
  rint,
  round,
  short,
  single,
  truefalse,
  type Opt,
  type TfTuple,
  tfBatch,
  type Ref,
} from "./helpers";
import { REF } from "./geoutil";

const TF: TfTuple[] = [
  ["geometry 类型的 ST_Distance 返回值单位是坐标单位。", true, "geometry 不看地理语义：4326 下返回「度」，投影系下返回「米」。要米制结果应投影或用 geography。"],
  ["geography 类型的 ST_Distance 默认返回米。", true, "geography 基于椭球（默认 WGS84）计算测地线，单位米，代价是计算更慢。"],
  ["ST_Contains(polygon, point) 当点在多边形边界上时返回 true。", false, "Contains 语义要求完全在内部；边界上的点用 ST_Touches 判定，Contains 返回 false。"],
  ["ST_Within(A, B) 与 ST_Contains(B, A) 等价。", true, "Within/Contains 互为镜像；同时为 true 当且仅当 A 完全位于 B 内部。"],
  ["ST_Intersects(A, B) 只要两几何有任意公共部分即返回 true。", true, "Intersects 是最宽松的空间关系：相交、相接、包含都算 true；Disjoint 是其否定。"],
  ["ST_DWithin(A, B, 100) 表示 A 与 B 距离小于等于 100。", true, "DWithin 是「距离阈值」谓词，配 && 索引能在海量数据下高效判断邻近关系。"],
  ["ST_Disjoint 与 ST_Intersects 互为取反。", true, "两几何没有公共部分即 Disjoint；两者恰好互补，优化器常用 && 索引 + NOT Intersects。"],
  ["geometry 列必须建 Btree 索引才能加速相交查询。", false, "相交查询用 GiST/SP-GiST 空间索引；Btree 只适合一维排序。"],
  ["CREATE INDEX ... USING GIST(geom) 是 PostGIS 空间索引的标准写法。", true, "GiST 基于 R 树思想，把几何包围盒组织成层次结构，配合 && 操作符加速。"],
  ["ST_SRID(geom) 返回几何的坐标参考系代码。", true, "SRID 存储在几何头部；SRID 不同的几何做运算会报错（42883 mixed SRIDs）。"],
  ["ST_Transform(geom, 4490) 可以把几何变换到 CGCS2000。", true, "ST_Transform 依赖 proj 网格与 spatial_ref_sys 表；转换精度受源/目标定义影响。"],
  ["ST_AsText(geom) 返回 WKT 文本。", true, "如 POINT(116.4 39.9)；注意 WKT 中 x 在前（lon lat）按几何轴序输出。"],
  ["ST_GeomFromText('POINT(1 2)', 4326) 创建一个带 SRID 的点。", true, "第二个参数指定 SRID；不指定则 SRID=0（未定义），后续运算易报错。"],
  ["ST_Area 在 EPSG:4326 的 geometry 上返回平方米。", false, "4326 是度，返回「平方度」，无物理意义；面积应投影等积系或用 geography。"],
  ["ST_Length 对 LineString 返回其长度，对 Polygon 返回周长（0 除外）。", true, "多边形的 ST_Length 返回 0；周长请用 ST_Perimeter。"],
  ["ST_Buffer(geom, 100) 在 3857 下生成 100 米缓冲区。", true, "3857 米制坐标下半径即米；但 3857 不是等距投影，高纬地区实地距离会失真，精密计算应换投影或测地线。"],
  ["ST_Centroid 返回几何的质心，可能落在多边形外部。", true, "质心是「质量中心」：C 形/环形多边形的质心可以在形状外面；要「形状内代表点」用 ST_PointOnSurface。"],
  ["ST_Union 可以把多个几何合并成一个。", true, "ST_Union 是聚合函数：合并相邻地块、去重重叠，常配 GROUP BY 使用。"],
  ["ST_Intersection 返回两几何的交集部分。", true, "叠加求交的标准函数；不相交时返回 GEOMETRYCOLLECTION EMPTY。"],
  ["ST_Difference(A, B) 返回 A 中扣除与 B 重叠后的部分。", true, "A - B：裁剪语义，常用于「用地扣除道路」一类计算。"],
  ["ST_Simplify 按容差抽稀折点，但结果可能自相交。", true, "保拓扑版本用 ST_SimplifyPreserveTopology；前者更快但可能产生无效几何。"],
  ["ST_IsValid 检查几何是否满足 OGC 简单要素有效性。", true, "自相交多边形、重复点等都会判 false；修复用 ST_MakeValid。"],
  ["PostGIS 的 && 操作符表示「包围盒相交」。", true, "&& 走 GiST 索引，是最快的粗筛；精确关系再用 ST_Intersects 等复核。"],
  ["ST_MakeValid 可以把自相交多边形修复为有效几何。", true, "PostGIS 3.1+ 提供 method 参数（linework/structure），修复可能拆分几何，返回可能是 MultiPolygon。"],
  ["geography 列建索引时 PostGIS 自动用测地线球面包围盒。", true, "geography 的 GiST 索引基于球面；无需手动投影即可高效过滤。"],
  ["ST_Intersects 两个 SRID 不同的几何会直接报错。", true, "PostGIS 拒绝混合 SRID 运算，防止「静默错位」；先 ST_Transform 统一。"],
  ["ST_AsGeoJSON(geom) 把几何序列化为 GeoJSON 片段。", true, "配合 row_to_json 可以拼出完整 Feature；3.x 支持 options 参数控制精度与坐标顺序。"],
  ["ST_DistanceSphere 返回米，且按正球体近似计算。", true, "近似精度约千分之几；更高精度用 ST_Distance(geography) 或 spheroid 版本 ST_DistanceSpheroid。"],
  ["PostGIS 里 ST_Collect 比 ST_Union 快，因为它不做几何融合。", true, "ST_Collect 只打包成 Multi/Collection 不消除边界；需要真正融合才用 ST_Union。"],
  ["ST_NumGeometries 对 MultiPolygon 返回其中 Polygon 的个数。", true, "简单几何返回 1，EMPTY 返回 0；是遍历集合几何的基本函数。"],
  ["ST_PointOnSurface 保证返回的点在面要素内部。", true, "相比 ST_Centroid，「代表点」语义更强；标签定位常用。"],
  ["PostGIS 的 geography 类型只支持 WGS84（SRID 4326）。", true, "geography 列固定 4326 语义；其他基准请先投影或等待扩展。"],
  ["ST_Azimuth 返回两点连线的方位角。", true, "以正北为 0 顺时针，单位弧度（geometry 下）；导航与视域常用。"],
  ["VACUUM 后需要为空间列 ANALYZE，查询计划器才能更好利用 GiST 索引。", true, "统计信息陈旧会导致计划器低估 && 选择性，明明有索引却走全表扫描。"],
  ["PostGIS 的簇函数 ST_ClusterDBSCAN 可以按密度聚类点。", true, "DBSCAN/KMeans 两种聚类开箱即用，常用于轨迹停留点识别、POI 去重。"],
  ["ST_Subdivide 把大几何切成小块，可显著加速空间连接。", true, "超大边界（省级海岸线）切分后索引选择性提升，JOIN 性能提升可达数量级。"],
  ["ST_Expand(geom, 100) 返回按距离膨胀的包围盒。", true, "常用于构造「先包围盒后精判」的候选集，配合 && 使用。"],
  ["ST_Boundary 返回几何的边界（面的边线、线的端点）。", true, "面→线、线→点（端点集合）、点→空，是拓扑语义的基础函数。"],
  ["PostGIS 支持三维几何（POINT Z）与 M 值。", true, "Z/M 存于坐标中；ST_Z/ST_M 提取，2D 函数自动忽略 Z。"],
  ["ST_HasArc 可检测几何中是否含有圆弧（曲线）。", true, "CIRCULARSTRING/COMPOUNDCURVE 属曲线类型；多数算法需 ST_CurveToLine 转直线段。"],
  ["geography 的 ST_DWithin 用的是欧氏距离。", false, "geography 用椭球测地线距离（米），不是平面欧氏距离。"],
];

const SINGLES: { stem: string; opts: Opt[]; ans: string; exp: string; refs: Ref[] }[] = [
  { stem: "要计算 4326 geometry 两点间的「米制」距离，最推荐的写法是？", ans: "C",
    opts: [
      { key: "A", text: "ST_Distance(g1, g2) 直接算", hint: "返回度，不是米。" },
      { key: "B", text: "ST_Area(g1)", hint: "函数选错了。" },
      { key: "C", text: "ST_Distance(g1::geography, g2::geography)" },
      { key: "D", text: "ST_Length(g1)", hint: "Length 针对线。" },
    ],
    exp: "geometry 下 4326 的距离是「度」。转 geography（或 ST_Transform 到米制投影）才能得到米；geography 用椭球测地线，精度最高。",
    refs: [REF.postgisDistance] },
  { stem: "海量点中筛选「距地铁站 500 米内」的小区，最合适的 SQL 谓词是？", ans: "B",
    opts: [
      { key: "A", text: "ST_Distance(...) <= 500", hint: "能对但会全表计算距离，未利用索引。" },
      { key: "B", text: "ST_DWithin(a.geom, b.geom, 500)" },
      { key: "C", text: "ST_Intersects(...)", hint: "Intersects 是接触判断，无阈值语义。" },
      { key: "D", text: "ST_Contains(...)", hint: "包含语义不符。" },
    ],
    exp: "ST_DWithin 语义即「距离 ≤ d」，且展开包围盒走 && 索引：大数据量下比 ST_Distance 逐对计算快数量级。",
    refs: [REF.postgisRelation] },
  { stem: "ST_Intersects 与 ST_Contains 的关键区别是？", ans: "A",
    opts: [
      { key: "A", text: "Intersects 只要相交即可（含相接）；Contains 要求完全包含且不相接边界" },
      { key: "B", text: "没有区别", hint: "边界语义不同。" },
      { key: "C", text: "Contains 更宽松", hint: "恰好相反。" },
      { key: "D", text: "Intersects 只用于点", hint: "任意几何皆可。" },
    ],
    exp: "DE-9IM 语义：Intersects = 有公共点即 true；Contains 要求 B 完全在 A 内（边界接触不满足）。相接场景用 ST_Touches。",
    refs: [REF.postgisRelation] },
  { stem: "下列哪个函数能把 WKT 文本转为几何？", ans: "B",
    opts: [
      { key: "A", text: "ST_AsText", hint: "方向反了，那是输出。" },
      { key: "B", text: "ST_GeomFromText" },
      { key: "C", text: "ST_SRID", hint: "查坐标系代码。" },
      { key: "D", text: "ST_Transform", hint: "坐标系变换。" },
    ],
    exp: "输入：ST_GeomFromText/ST_GeomFromGeoJSON/ST_GeogFromText；输出：ST_AsText/ST_AsGeoJSON/ST_AsBinary。",
    refs: [REF.postgis] },
  { stem: "3857 下的 ST_Buffer(geom, 500) 语义是？", ans: "B",
    opts: [
      { key: "A", text: "500 度缓冲", hint: "3857 是米。" },
      { key: "B", text: "500 米缓冲（图上坐标系意义下）" },
      { key: "C", text: "500 平方米面积", hint: "Buffer 是邻域面。" },
      { key: "D", text: "无法执行", hint: "完全可执行。" },
    ],
    exp: "3857 单位是米，半径即 500「投影米」；高纬地区该距离对应的实地长度被放大（cos φ 缩小），精密分析应换等距投影或用 geography。",
    refs: [REF.postgis, REF.epsg3857] },
  { stem: "要把省份大边界与百万级 POI 做空间连接，显著提速的做法是？", ans: "C",
    opts: [
      { key: "A", text: "把所有数据转 WKT 存文本列", hint: "丢失索引与类型。" },
      { key: "B", text: "删掉空间索引", hint: "反向操作。" },
      { key: "C", text: "先 ST_Subdivide 切碎大边界，再建 GiST 索引 JOIN" },
      { key: "D", text: "全部用 geography", hint: "geography 计算更慢，此处无测地需求。" },
    ],
    exp: "大几何包围盒互相重叠导致索引选择性差；Subdivide 切块后候选集骤减，JOIN 提速可达一个数量级。",
    refs: [REF.postgisRelation] },
  { stem: "下列哪个函数返回多边形周长？", ans: "D",
    opts: [
      { key: "A", text: "ST_Length", hint: "对 Polygon 返回 0。" },
      { key: "B", text: "ST_Area", hint: "那是面积。" },
      { key: "C", text: "ST_Distance", hint: "两几何间距。" },
      { key: "D", text: "ST_Perimeter" },
    ],
    exp: "Polygon 的 ST_Length 为 0；ST_Perimeter 才是周长（含内环）。线用 ST_Length/ST_LengthSpheroid。",
    refs: [REF.postgisArea] },
  { stem: "要给「面的内部」找一个保证落在形状内的标注点，应该用？", ans: "B",
    opts: [
      { key: "A", text: "ST_Centroid", hint: "C 形面质心可能在外。" },
      { key: "B", text: "ST_PointOnSurface" },
      { key: "C", text: "ST_StartPoint", hint: "线函数。" },
      { key: "D", text: "ST_Collect", hint: "聚合函数。" },
    ],
    exp: "ST_PointOnSurface 返回保证在面内的代表点；Centroid 是几何质心（可在外部）。标注、缩略图常用前者。",
    refs: [REF.postgisRelation] },
  { stem: "PostGIS 中「&&」操作符的含义是？", ans: "B",
    opts: [
      { key: "A", text: "几何完全相等", hint: "那是 ST_Equals。" },
      { key: "B", text: "包围盒相交（索引级粗筛）" },
      { key: "C", text: "距离为 0", hint: "无此语义。" },
      { key: "D", text: "按位与", hint: "SQL 位运算另有 &。" },
    ],
    exp: "&& 基于 2D 包围盒：WHERE a.geom && b.geom 走 GiST，是所有空间 JOIN 的第一步粗筛。",
    refs: [REF.postgisRelation] },
  { stem: "下列哪个查询会把「 mixed SRIDs 」错误抛出？", ans: "A",
    opts: [
      { key: "A", text: "4326 几何与 3857 几何直接 ST_Intersects" },
      { key: "B", text: "两个 4326 几何 ST_Intersects", hint: "SRID 一致即可。" },
      { key: "C", text: "geography 与 geography 的 ST_Distance", hint: "同 4326 语义。" },
      { key: "D", text: "ST_AsText(geom)", hint: "单目输出函数。" },
    ],
    exp: "PostGIS 拒绝 SRID 不同的几何互算（ERROR: ST_Intersects: Operation on mixed SRIDs），必须先 ST_Transform 统一。",
    refs: [REF.postgisRelation] },
  { stem: "下列哪个函数可以把几何写到任意目标 SRID？", ans: "C",
    opts: [
      { key: "A", text: "ST_SetSRID", hint: "只改元数据不换算坐标！" },
      { key: "B", text: "ST_SRID", hint: "读取函数。" },
      { key: "C", text: "ST_Transform" },
      { key: "D", text: "ST_Translate", hint: "平移函数。" },
    ],
    exp: "ST_Transform 做真正的坐标换算；ST_SetSRID 只修改标签（常用于「数据自带但未标注 SRID」的修正），误用会导致坐标错位。",
    refs: [REF.postgis] },
  { stem: "要按「省→市」聚合地块并融合边界，最合适的聚合函数是？", ans: "B",
    opts: [
      { key: "A", text: "ST_Collect", hint: "只打包不融合，边界还在。" },
      { key: "B", text: "ST_Union", },
      { key: "C", text: "ST_Boundary", hint: "取边界。" },
      { key: "D", text: "ST_Difference", hint: "求差。" },
    ],
    exp: "SELECT ST_Union(geom) FROM parcels GROUP BY city 会把组内地块融合成单一（Multi）Polygon；只要打包不融合用 ST_Collect（更快）。",
    refs: [REF.postgisRelation] },
  { stem: "ST_DistanceSphere 与 ST_Distance(geography) 的关系是？", ans: "C",
    opts: [
      { key: "A", text: "完全相同", hint: "球面 vs 椭球。" },
      { key: "B", text: "后者用正球近似", hint: "反了。" },
      { key: "C", text: "前者按正球体近似（快、略糙），后者按椭球测地线（准、略慢）" },
      { key: "D", text: "前者单位是度", hint: "两者都返回米。" },
    ],
    exp: "Sphere 版本 R=6371008 常数近似，误差可达 0.5%；geography 版用 Andoyer/Karney 椭球算法，亚毫米级。业务选型按精度需求。",
    refs: [REF.postgisDistance] },
  { stem: "下列哪种列类型适合存「全球经纬度、直接算米制距离」？", ans: "B",
    opts: [
      { key: "A", text: "geometry(POINT, 3857)", hint: "需先投影，且 3857 距离失真。" },
      { key: "B", text: "geography(POINT, 4326)" },
      { key: "C", text: "geometry(POINT, 4326)", hint: "距离单位是度。" },
      { key: "D", text: "TEXT 列存 WKT", hint: "无空间能力。" },
    ],
    exp: "geography(4326) 原生支持测地线距离/缓冲（米）并自动球面索引；geometry(4326) 快但角度单位。",
    refs: [REF.postgisDistance] },
  { stem: "下列关于 GiST 索引的说法，错误的是？", ans: "D",
    opts: [
      { key: "A", text: "基于包围盒的层次结构", hint: "R 树思想。" },
      { key: "B", text: "加速 && 与 ST_DWithin 等谓词", hint: "常用路径。" },
      { key: "C", text: "对 geography 同样有效", hint: "球面包围盒。" },
      { key: "D", text: "建好后无需 ANALYZE 也能保证最优计划", hint: "统计信息缺失会让计划器弃用索引。" },
    ],
    exp: "GiST + 定期 ANALYZE 才能保证计划器正确估算选择性；「有索引但全表扫」多数是统计过期或类型不匹配（如函数包裹列）。",
    refs: [REF.postgis] },
  { stem: "下列哪个函数可以检测并报告几何无效的原因？", ans: "B",
    opts: [
      { key: "A", text: "ST_IsValid", hint: "只给布尔。" },
      { key: "B", text: "ST_IsValidReason" },
      { key: "C", text: "ST_MakeValid", hint: "修复而非诊断。" },
      { key: "D", text: "ST_NPoints", hint: "点数统计。" },
    ],
    exp: "ST_IsValidReason 返回「Self-intersection at or near point ...」等诊断文本；配 ST_IsValidDetail 可拿定位。",
    refs: [REF.postgis] },
  { stem: "关于 ST_Union 与 ST_Collect 的性能，正确的是？", ans: "A",
    opts: [
      { key: "A", text: "Collect 只打包不计算拓扑融合，明显快于 Union" },
      { key: "B", text: "Union 更快", hint: "融合要做拓扑运算。" },
      { key: "C", text: "两者完全一样", hint: "语义不同。" },
      { key: "D", text: "Collect 更慢", hint: "相反。" },
    ],
    exp: "需要真正消边界用 Union；只是「装成一包」传输/计数用 Collect。可视化整包下载常用 Collect。",
    refs: [REF.postgisRelation] },
  { stem: "以下哪个 SQL 能正确统计每个行政区的 POI 数量？", ans: "B",
    opts: [
      { key: "A", text: "SELECT * FROM poi JOIN region", hint: "没有聚合与空间条件。" },
      { key: "B", text: "SELECT r.name, COUNT(*) FROM poi p JOIN region r ON ST_Intersects(p.geom, r.geom) GROUP BY r.name" },
      { key: "C", text: "SELECT COUNT(*) FROM poi WHERE geom IS NOT NULL", hint: "没有空间关联。" },
      { key: "D", text: "SELECT ST_Union(geom) FROM poi", hint: "几何聚合不是计数。" },
    ],
    exp: "空间连接模板：JOIN ... ON ST_Intersects/ST_Within + GROUP BY。确保两表 geom 列都有 GiST 索引，大表先 Subdivide。",
    refs: [REF.postgisRelation] },
  { stem: "对 4326 的 geometry 用 ST_Area 得到的数值，正确的解读是？", ans: "C",
    opts: [
      { key: "A", text: "平方米", hint: "米制才有 m²。" },
      { key: "B", text: "平方公里", hint: "无此语义。" },
      { key: "C", text: "平方度（随纬度变化，无直接物理意义）" },
      { key: "D", text: "公顷", hint: "无此语义。" },
    ],
    exp: "「平方度」面积在赤道约 12364 km²、在 60° 纬度只有约 3091 km²。正确做法：等积投影或 g::geography 面积（米²）。",
    refs: [REF.postgisArea] },
  { stem: "PostGIS 中 row_to_json + ST_AsGeoJSON 组合的用途是？", ans: "B",
    opts: [
      { key: "A", text: "压缩数据库", hint: "与存储无关。" },
      { key: "B", text: "把查询行拼成 GeoJSON Feature，供 API 直接返回" },
      { key: "C", text: "建空间索引", hint: "DDL 操作。" },
      { key: "D", text: "修复无效几何", hint: "ST_MakeValid。" },
    ],
    exp: "SELECT row_to_json(f) FROM (SELECT id, properties, ST_AsGeoJSON(geom)::json AS geom FROM t) f 输出可被前端直接消费的 Feature 结构。",
    refs: [REF.postgis, REF.geojson] },
  { stem: "下列哪个函数「只改 SRID 标签、不改坐标」？", ans: "C",
    opts: [
      { key: "A", text: "ST_Transform", hint: "会换算坐标。" },
      { key: "B", text: "ST_Affine", hint: "仿射变换坐标。" },
      { key: "C", text: "ST_SetSRID" },
      { key: "D", text: "ST_SnapToGrid", hint: "坐标取整。" },
    ],
    exp: "典型用法：ST_SetSRID(ST_GeomFromText(...), 4326) 补标缺失元数据；把 3857 数据「Set 成 4326」是经典事故。",
    refs: [REF.postgis] },
  { stem: "关于 ST_Distance(a, b, true)（geography，use_spheroid=true），说法正确的是？", ans: "A",
    opts: [
      { key: "A", text: "按椭球计算测地距离，默认行为，精度高" },
      { key: "B", text: "按正球近似", hint: "那是 use_spheroid=false。" },
      { key: "C", text: "返回度", hint: "geography 恒米。" },
      { key: "D", text: "只能用于线", hint: "任意几何。" },
    ],
    exp: "geography ST_Distance 默认 use_spheroid=true（WGS84 椭球）；传 false 切换正球近似（更快、误差 ~0.3%）。",
    refs: [REF.postgisDistance] },
  { stem: "下列哪种写法可以高效找「最近的一个加油站」（KNN）？", ans: "C",
    opts: [
      { key: "A", text: "ORDER BY ST_Distance(...) LIMIT 1", hint: "全表算距离。" },
      { key: "B", text: "WHERE ST_DWithin(..., 100000)", hint: "需要预估半径，偏远地区失效。" },
      { key: "C", text: "ORDER BY geom <-> ST_MakePoint(...)::geometry LIMIT 1（配 GiST 索引）" },
      { key: "D", text: "ORDER BY id LIMIT 1", hint: "与距离无关。" },
    ],
    exp: "<->（KNN 距离排序）在 GiST 索引下直接按近到远扫描，无需预估半径，是「最近邻」的标准解法。",
    refs: [REF.postgisRelation] },
  { stem: "PostGIS 的空间连接（JOIN ON ST_Intersects）慢，排查的第一步是？", ans: "B",
    opts: [
      { key: "A", text: "把表删了重建", hint: "破坏性且未必相关。" },
      { key: "B", text: "EXPLAIN 查看计划：两表 geom 是否都命中 GiST 索引" },
      { key: "C", text: "换成 CSV 导出处理", hint: "绕开问题。" },
      { key: "D", text: "调大 work_mem", hint: "通常不是瓶颈根源。" },
    ],
    exp: "EXPLAIN ANALYZE 看是否走 Index Scan（&& 粗筛）+ Nested Loop；Seq Scan 常因统计缺失/类型不匹配/函数包裹列。",
    refs: [REF.postgis] },
  { stem: "ST_Transform 依赖的核心组件是？", ans: "C",
    opts: [
      { key: "A", text: "浏览器", hint: "服务端数据库。"},
      { key: "B", text: "GDAL 全家桶", hint: "PostGIS 编译可选 GDAL，但变换靠 PROJ。" },
      { key: "C", text: "PROJ 坐标变换库 + spatial_ref_sys 定义表" },
      { key: "D", text: "OpenSSL", hint: "加密库。" },
    ],
    exp: "PROJ 提供基准/投影数学，spatial_ref_sys 存 SRID 定义与 proj4text；网格文件影响高精度变换。",
    refs: [REF.postgis] },
  { stem: "要判断「点击点是否落在地块内」，且地块表千万级，最优方案是？", ans: "B",
    opts: [
      { key: "A", text: "全表 ST_Contains 逐行判断", hint: "太慢。" },
      { key: "B", text: "WHERE geom && ST_Expand(point, 0) AND ST_Contains(geom, point)，列建 GiST" },
      { key: "C", text: "把地块转成 WKT 正则匹配", hint: "荒谬。" },
      { key: "D", text: "导出 GeoJSON 前端判断", hint: "数据量不允许。" },
    ],
    exp: "点查走 GiST（point && polygon 包围盒）后 ST_Contains 精判，毫秒级返回；ST_DWithin(point, geom, 0) 同效。",
    refs: [REF.postgisRelation] },
  { stem: "PostGIS 3 中「geography 缓冲 ST_Buffer(geog, 1000)」的含义是？", ans: "A",
    opts: [
      { key: "A", text: "在椭球上生成 1000 米测地缓冲，再转回 geometry 返回" },
      { key: "B", text: "在平面上生成 1000 度缓冲", hint: "单位错。" },
      { key: "C", text: "无此用法", hint: "geography 支持 Buffer。" },
      { key: "D", text: "只支持点", hint: "任意地理几何。" },
    ],
    exp: "geography Buffer 内部把几何投影到局部方位等距平面，按米生成缓冲后还原，避免手工投影误差。",
    refs: [REF.postgis] },
  { stem: "下列哪个不是 PostGIS 的有效几何类型？", ans: "D",
    opts: [
      { key: "A", text: "POINT" },
      { key: "B", text: "LINESTRING" },
      { key: "C", text: "TRIANGLE" },
      { key: "D", text: "SQUARE", hint: "无此类型，方形用 POLYGON 表达。" },
    ],
    exp: "OGC SFA 类型：Point/LineString/Polygon/Multi*/GeometryCollection/CircularString/CompoundCurve/CurvePolygon/Triangle/PolyhedralSurface。",
    refs: [REF.postgis] },
  { stem: "想按「每小时轨迹点聚合成停留点」，PostGIS 内置的合适工具是？", ans: "C",
    opts: [
      { key: "A", text: "ST_Simplify", hint: "形状抽稀，不聚类。" },
      { key: "B", text: "ST_VoronoiPolygons", hint: "泰森多边形。" },
      { key: "C", text: "ST_ClusterDBSCAN（按 eps/minpoints 聚类）" },
      { key: "D", text: "ST_Node", hint: "线节点化。" },
    ],
    exp: "ST_ClusterDBSCAN(winid) OVER (...) 给每点分配簇号；结合时间窗口函数即可实现停留点识别。",
    refs: [REF.postgis] },
  { stem: "下列关于 ST_Expand 与 ST_Buffer 的区别，正确的是？", ans: "B",
    opts: [
      { key: "A", text: "完全一样", hint: "几何语义不同。" },
      { key: "B", text: "Expand 生成的是矩形包围盒（快、粗），Buffer 是真实圆角邻域（慢、准）" },
      { key: "C", text: "Buffer 只支持点", hint: "任意几何。" },
      { key: "D", text: "Expand 单位是度", hint: "随坐标单位。" },
    ],
    exp: "Expand 输出 BOX（矩形），多用于索引粗筛；Buffer 输出真实几何邻域，用于最终结果。粗筛+精判是标准组合。",
    refs: [REF.postgisRelation] },
];

const SHORTS: { stem: string; accepted: string[]; exp: string }[] = [
  { stem: "把几何转成 WKT 文本的函数是 ST_？（只写函数名主体，如 Distance）", accepted: ["astext", "st_astext"], exp: "ST_AsText(geom) → 'POINT(116.4 39.9)'。" },
  { stem: "计算两几何间距的函数是 ST_？（只写主体）", accepted: ["distance", "st_distance"], exp: "ST_Distance(g1, g2)：geometry 按坐标单位，geography 按米。" },
  { stem: "计算几何面积的函数是 ST_？（只写主体）", accepted: ["area", "st_area"], exp: "ST_Area：geometry 按坐标单位平方，geography 返回平方米。" },
  { stem: "判断「距离 ≤ 阈值」的索引友好谓词是 ST_？（只写主体）", accepted: ["dwithin", "st_dwithin"], exp: "ST_DWithin(a, b, d) 走 && 粗筛，大数据邻近判断首选。" },
  { stem: "把几何转换到目标 SRID 的函数是 ST_？（只写主体）", accepted: ["transform", "st_transform"], exp: "ST_Transform(geom, srid) 基于真实坐标换算；别与 ST_SetSRID 混淆。" },
  { stem: "创建空间索引的 PostgreSQL 语法：USING ？（四个字母）", accepted: ["gist", "gist index"], exp: "CREATE INDEX ON t USING GIST(geom)；geography 列同样适用。" },
  { stem: "把多行几何「打包」成集合（不融合边界）的函数是 ST_？（只写主体）", accepted: ["collect", "st_collect"], exp: "ST_Collect 快速打包；真正融合用 ST_Union。" },
  { stem: "返回「保证在面内」的点的函数是 ST_？（只写主体）", accepted: ["pointonsurface", "st_pointonsurface"], exp: "ST_PointOnSurface：面内代表点；Centroid 可能落在外面。" },
  { stem: "检查几何有效性的函数是 ST_？（只写主体）", accepted: ["isvalid", "st_isvalid"], exp: "ST_IsValid(geom) 按简单要素规则判定；诊断用 ST_IsValidReason。" },
  { stem: "修复无效几何的函数是 ST_？（只写主体）", accepted: ["makevalid", "st_makevalid"], exp: "ST_MakeValid 把自相交等无效几何重建成有效几何（可能返回 Multi）。" },
  { stem: "按容差抽稀线/面折点的函数是 ST_？（只写主体）", accepted: ["simplify", "st_simplify"], exp: "ST_Simplify(geom, tolerance)；保拓扑版 ST_SimplifyPreserveTopology。" },
  { stem: "把几何序列化为 GeoJSON 的函数是 ST_？（只写主体）", accepted: ["asgeojson", "st_asgeojson"], exp: "ST_AsGeoJSON(geom) 返回 JSON 文本；配 row_to_json 拼完整 Feature。" },
  { stem: "测量多边形周长的函数是 ST_？（只写主体）", accepted: ["perimeter", "st_perimeter"], exp: "ST_Perimeter(geom)；Polygon 的 ST_Length 为 0。" },
  { stem: "返回两点方位角的函数是 ST_？（只写主体）", accepted: ["azimuth", "st_azimuth"], exp: "ST_Azimuth(start, end)：正北为 0 顺时针，弧度。" },
  { stem: "把两几何求交集的函数是 ST_？（只写主体）", accepted: ["intersection", "st_intersection"], exp: "ST_Intersection(a, b)：叠加分析核心；空交集返回 EMPTY。" },
  { stem: "把 A 扣除 B 的函数是 ST_？（只写主体）", accepted: ["difference", "st_difference"], exp: "ST_Difference(a, b) = A − B，裁剪常用。" },
  { stem: "把几何平移的函数是 ST_？（只写主体）", accepted: ["translate", "st_translate"], exp: "ST_Translate(geom, dx, dy, dz)：坐标平移，不改 SRID。" },
  { stem: "合并相邻面的「真融合」聚合函数是 ST_？（只写主体）", accepted: ["union", "st_union"], exp: "ST_Union 做 overlay 融合；GROUP BY 组内聚合常用。" },
  { stem: "检测并拆分大几何以提升索引效率的函数是 ST_？（只写主体）", accepted: ["subdivide", "st_subdivide"], exp: "ST_Subdivide(geom, maxvertices)：空间连接提速率杯神器。" },
  { stem: "给几何「按距离膨胀成矩形盒」的函数是 ST_？（只写主体）", accepted: ["expand", "st_expand"], exp: "ST_Expand(geom, d)：快速包围盒粗筛，配 && 使用。" },
  { stem: "返回几何点数的函数是 ST_？（只写主体）", accepted: ["npoints", "st_npoints"], exp: "ST_NPoints(geom) 含所有折点；ST_NumPoints 只对线计数。" },
  { stem: "提取多几何中第 n 个子几何的函数是 ST_？（只写主体）", accepted: ["geometryn", "st_geometryn"], exp: "ST_GeometryN(geom, n) 从 1 开始计数；数量用 ST_NumGeometries。" },
  { stem: "判断两几何是否「完全相同」的函数是 ST_？（只写主体）", accepted: ["equals", "st_equals"], exp: "ST_Equals 基于拓扑相等（同点集）；同坐标顺序不同也可能 true。" },
  { stem: "把 LineString 伸长/截取到指定区间的函数是 ST_？（只写主体）", accepted: ["linelocate", "st_linelocate", "st_linesubstring"], exp: "ST_LineLocatePoint 定位 0~1 比例；ST_LineSubstring 按比例截取。" },
  { stem: "返回几何包围盒的函数是 ST_？（只写主体）", accepted: ["extent", "st_extent"], exp: "ST_Extent 是聚合函数返回 BOX2D；单几何用 ST_Envelope。" },
  { stem: "PostGIS 中表示「点」的 WKT 关键字是？（大写五个字母）", accepted: ["point"], exp: "'POINT(1 2)'；三维 POINT Z(1 2 3)，四维 POINT ZM。" },
  { stem: "PostGIS 中「多点」类型名是？（英文）", accepted: ["multipoint", "multi point"], exp: "MULTIPOINT((1 2),(3 4))；同类还有 MULTILINESTRING/MULTIPOLYGON。" },
  { stem: "PostGIS 空间关系基于的国际标准模型缩写是？（4 个字母）", accepted: ["de-9im", "de9im"], exp: "DE-9IM（Dimensionally Extended 9-Intersection Model）定义了 Contains/Within/Intersects 等的数学语义。" },
  { stem: "geography 类型固定使用的 SRID 是？（四位数字）", accepted: ["4326"], exp: "geography 只支持 WGS84（4326）语义，距离/面积直接返回米制。" },
];

export function gen06(count: number, r: () => number) {
  const out: object[] = [];

  // 1. 平面 ST_Distance / 勾股（25）
  for (let i = 0; i < 25; i += 1) {
    const x1 = rint(r, 0, 5000);
    const y1 = rint(r, 0, 5000);
    const x2 = x1 + rint(r, -3000, 3000);
    const y2 = y1 + rint(r, -3000, 3000);
    const d = round(Math.hypot(x2 - x1, y2 - y1), 2);
    const deg = round(Math.hypot(x2 - x1, y2 - y1) / 1000, 4);
    if (i % 2 === 0) {
      out.push(
        numeric("06", i % 3 + 1,
          `在米制投影坐标系下，ST_Distance('POINT(${x1} ${y1})'::geometry, 'POINT(${x2} ${y2})'::geometry) 返回多少米？（保留 2 位小数）`,
          d, 0.02,
          `两点间欧氏距离 = √((${x2}-${x1})² + (${y2}-${y1})²) = ${d} m。geometry 下距离即坐标单位。`,
          [REF.postgisDistance], { unit: "m" }),
      );
    } else {
      out.push(
        numeric("06", i % 3 + 1,
          `SRID 4326 的 geometry 下，ST_Distance('POINT(${x1 / 1000} ${y1 / 1000})'::geometry, 'POINT(${x2 / 1000} ${y2 / 1000})'::geometry) 返回多少「度」？（保留 4 位小数）`,
          deg, 0.001,
          `4326 是角度坐标：距离 = √(Δlon² + Δlat²) = ${deg} 度。注意这不是米——米制距离请用 geography 或投影。`,
          [REF.postgisDistance], { unit: "度" }),
      );
    }
  }

  // 2. ST_Area / ST_Length / ST_Perimeter（25）
  for (let i = 0; i < 25; i += 1) {
    const w = rint(r, 10, 900);
    const h = rint(r, 10, 900);
    const askArea = i % 3 !== 2;
    if (askArea) {
      const a = w * h;
      out.push(
        numeric("06", i % 3 + 1,
          `矩形 POLYGON((0 0, ${w} 0, ${w} ${h}, 0 ${h}, 0 0))（米制投影）的 ST_Area 是多少平方米？`,
          a, 0.01,
          `${w} × ${h} = ${a} m²。等距/平面投影下矩形面积 = 长 × 宽；经纬度坐标下没有这个语义。`,
          [REF.postgisArea], { unit: "m²" }),
      );
    } else {
      const p = 2 * (w + h);
      out.push(
        numeric("06", i % 3 + 1,
          `矩形 POLYGON((0 0, ${w} 0, ${w} ${h}, 0 ${h}, 0 0))（米制投影）的 ST_Perimeter 是多少米？`,
          p, 0.01,
          `周长 = 2 × (${w} + ${h}) = ${p} m。Polygon 的 ST_Length 返回 0，周长要用 ST_Perimeter。`,
          [REF.postgisArea], { unit: "m" }),
      );
    }
  }

  // 3. 判断（40）
  out.push(...tfBatch("06", TF, [REF.postgisRelation, REF.postgisDistance, REF.postgisArea]));

  // 4. 短答（30）
  SHORTS.forEach((s, i) =>
    out.push(short("06", i % 3 === 0 ? 1 : 2, s.stem, s.accepted, s.exp, [REF.postgis])),
  );

  // 5. 单选（30）
  SINGLES.forEach((s) => out.push(single("06", 2, s.stem, s.opts, s.ans, s.exp, s.refs)));

  return out.slice(0, count);
}
