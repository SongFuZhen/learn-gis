/** m04 格式与瓦片：xyz 计算 60 + 层级参数 30 + 角点 30 + quadkey 20 + tms 10 + 判断 25 + 单选 25 + 短答 10 = 210 题 */
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
import { REF, tileTopLeft, tileXY, quadkey as qk } from "./geoutil";

const TF: TfTuple[] = [
  ["XYZ 瓦片方案中，y 轴自上而下（北在上），TMS 则自下而上。", true, "TMS 的 y 原点在南极；换算关系为 y_tms = 2^z − 1 − y_xyz。"],
  ["缩放级别 z 的瓦片总数是 4^z。", true, "每级行列数都是 2^z，总数 (2^z)² = 4^z：z=0 全图 1 块，z=10 约 105 万块。"],
  ["瓦片地图把全球投影成一整块正方形（256×256 或 512×512 像素）。", true, "z=0 的单块瓦片即全球底图，Web 墨卡托把全球摊成以赤道为边长的正方形。"],
  ["Web 墨卡托瓦片可以表示南北纬 90°（极点）区域。", false, "y 公式在 ±85.0511° 之外发散，瓦片方案只覆盖到该纬度。"],
  ["矢量瓦片（MVT）存的是几何与属性，由客户端渲染。", true, "与栅格瓦片不同，MVT 传输编码后的要素，样式在前端实时渲染，可交互可换肤。"],
  ["GeoJSON 强制使用 WGS84 经纬度（lon, lat 顺序）。", true, "RFC 7946 规定坐标为 WGS84 且 lon 在前，其他 CRS 需另行扩展（非标准成员）。"],
  ["KML 是 OGC 标准格式，通常用于三维地球展示。", true, "KML 由 Google 提出、后成 OGC 标准，坐标为 WGS84，Google Earth 原生支持。"],
  ["MBTiles 把成千上万张瓦片打包进一个 SQLite 文件。", true, "MBTiles 是单文件瓦片容器（SQLite），离线地图分发的主流方案之一。"],
  ["PMTiles 支持单文件瓦片归档的 HTTP Range 直接读取，无需瓦片服务器。", true, "PMTiles 把目录与瓦片组织成可区间请求的结构，静态托管即可当瓦片服务。"],
  ["瓦片 URL 模板中的 {z}/{x}/{y} 会被客户端替换为具体层级与行列号。", true, "客户端按当前视图计算 z/x/y 后填入模板发起请求，{s} 等子域占位符同理。"],
  ["GeoTIFF 的瓦片化（Tiled TIFF）与网络地图瓦片（XYZ）是同一概念。", false, "前者是 TIFF 内部存储组织（块），后者是网络地图的金字塔目录结构，只是术语相似。"],
  ["COG（Cloud Optimized GeoTIFF）支持 HTTP Range 请求按需读取局部数据。", true, "COG 把索引置前、数据分块，客户端只取视野范围所需字节，是云上栅格标准。"],
  ["瓦片级别越高，单块瓦片覆盖的地面范围越大。", false, "z 越大分辨率越高、单块覆盖越小：每 +1 级，单块地面边长减半。"],
  ["Shapefile 能直接存储坐标系定义在 .shp 主文件内。", false, "坐标系在可选的 .prj 旁挂文件里，主文件只有几何。"],
  ["GPX 常用于记录 GPS 轨迹与航点，属于 XML 格式。", true, "GPX 以 XML 存航点（wpt）、轨迹（trk）、路线（rte），是户外与轨迹交换通用格式。"],
  ["同一 zoom 下的所有瓦片都表示相同的地面分辨率（Web 墨卡托）。", true, "Web 墨卡托同层级分辨率恒定（赤道口径），因此瓦片网格规则整齐。"],
  ["GeoJSON 的 MultiPolygon 可以包含多个不相邻的多边形。", true, "Multi* 几何即同类型要素的集合，天然支持飞地、群岛等情形。"],
  ["TopoJSON 用弧段（arc）共享编码减少冗余，还能表达拓扑关系。", true, "TopoJSON 存弧段索引而非重复坐标，文件更小且保留邻接信息。"],
  ["瓦片金字塔中，z=1 有 4 块瓦片。", true, "2^1=2，2×2=4 块。"],
  ["客户端可以根据当前视野只请求落在视口内的瓦片。", true, "视口裁剪是瓦片地图省流量的核心机制，配合缓存与预取策略。"],
  ["GeoJSON 属性（properties）的值可以是任意 JSON 类型。", true, "properties 是 JSON 对象，值支持字符串、数字、布尔、嵌套对象等。"],
  ["瓦片服务返回 404 时，通常表示该层级/行列号超出范围或不存在的空瓦片。", true, "合法但无数据的瓦片有的服务返回 404、有的返回空瓦片图，客户端需容错。"],
  ["EPSG:3857 瓦片的地面分辨率与纬度有关：纬度越高，同层级瓦片内地面细节越少。", true, "墨卡托把纬度拉伸，同 z 下高纬瓦片覆盖的实地范围反而更大、比例尺更小（图上等像素）。"],
  ["栅格瓦片的透明背景（海洋等无数据区）通常用 PNG 通道实现。", true, "栅格瓦片格式多为 PNG/JPEG/WebP：需要透明或 256 色调色板时选 PNG。"],
  ["把 GeoJSON 转成 TopoJSON 后坐标精度一定会损失。", false, "精度取决于量化参数（quantization），可选保留所需精度，量化换体积是可控行为。"],
];

const SINGLES: { stem: string; opts: Opt[]; ans: string; exp: string; refs: Ref[] }[] = [
  { stem: "OSM 官方瓦片服务的 URL 模板形如？", ans: "A",
    opts: [
      { key: "A", text: "https://tile.openstreetmap.org/{z}/{x}/{y}.png" },
      { key: "B", text: "https://tile.openstreetmap.org/{lat}/{lon}/{zoom}.png", hint: "瓦片按层级行列号组织，不按经纬度。" },
      { key: "C", text: "https://tile.openstreetmap.org/{x}/{z}/{y}.png", hint: "顺序是 z/x/y。" },
      { key: "D", text: "https://osm.org/getTile?level={z}", hint: "非 OSM 瓦片约定。" },
    ],
    exp: "XYZ 模板即 {z}/{x}/{y}，官方服务为 https://tile.openstreetmap.org/{z}/{x}/{y}.png，并要求合理的 UA 与使用政策。",
    refs: [REF.tilenames] },
  { stem: "z=5 时全球共有多少块瓦片？", ans: "C",
    opts: [
      { key: "A", text: "32", hint: "那是单方向 2^5。" },
      { key: "B", text: "512", hint: "少了一个 2 的幂。" },
      { key: "C", text: "1024" },
      { key: "D", text: "2048", hint: "多了一倍。" },
    ],
    exp: "4^5 = (2^5)² = 1024 块。总数随 z 指数增长：z=10 约 105 万，z=14 约 2.7 亿。",
    refs: [REF.tilenames] },
  { stem: "GeoJSON 与 Shapefile 的比较，下列正确的是？", ans: "B",
    opts: [
      { key: "A", text: "Shapefile 支持 CR 与任意文本编码，永远更先进", hint: "shapefile 编码与 2GB 限制是硬伤。" },
      { key: "B", text: "GeoJSON 文本可读、Web 友好，但体积大、无标准索引" },
      { key: "C", text: "GeoJSON 支持任意坐标系", hint: "RFC 7946 强制 WGS84。" },
      { key: "D", text: "两者都不能存属性", hint: "都能存属性。" },
    ],
    exp: "GeoJSON（RFC 7946）文本化、浏览器原生可解析，代价是冗长与解析开销；shapefile 二进制紧凑但格式老旧（2GB、字段名 10 字符、编码混乱）。",
    refs: [REF.geojson, REF.shapefile] },
  { stem: "下列哪个格式最适合「在线底图 + 离线打包」场景（单文件、可含数百万瓦片）？", ans: "C",
    opts: [
      { key: "A", text: "GeoJSON", hint: "矢量格式，不是瓦片容器。" },
      { key: "B", text: "KML", hint: "面向三维地球标注。" },
      { key: "C", text: "MBTiles / PMTiles" },
      { key: "D", text: "CSV", hint: "纯表格。" },
    ],
    exp: "MBTiles（SQLite 容器）与 PMTiles（可 Range 请求的单文件归档）都把海量瓦片打包成单文件，离线/自托管首选。",
    refs: [REF.tilenames] },
  { stem: "TMS y=0 的瓦片位于全球的哪一侧？", ans: "B",
    opts: [
      { key: "A", text: "最北边", hint: "那是 XYZ 的 y=0。" },
      { key: "B", text: "最南边" },
      { key: "C", text: "最西边", hint: "y 是南北方向。" },
      { key: "D", text: "最东边", hint: "同上。" },
    ],
    exp: "TMS 原点在西南角（y 向北递增）；XYZ（OSM/Google）原点在西北角。换算 y_tms = 2^z − 1 − y_xyz。",
    refs: [REF.tilenames] },
  { stem: "矢量瓦片相比栅格瓦片的优势是？", ans: "D",
    opts: [
      { key: "A", text: "客户端零渲染成本", hint: "渲染转移到了客户端，成本更高。" },
      { key: "B", text: "对老旧设备更友好", hint: "低端机渲染矢量反而吃力。" },
      { key: "C", text: "不需要任何样式定义", hint: "需要样式规范（如 Mapbox Style）。" },
      { key: "D", text: "同体积信息密度高，可动态换样式、支持要素点击交互" },
    ],
    exp: "MVT 存编码几何+属性：文件更小、可多主题复用、交互查询与重样式都在客户端完成，代价是渲染算力与样式复杂度。",
    refs: [REF.vectorTiles] },
  { stem: "下列哪种格式「单个文件存整幅影像 + 内嵌坐标参考」，是栅格事实标准？", ans: "A",
    opts: [
      { key: "A", text: "GeoTIFF" },
      { key: "B", text: "Shapefile", hint: "矢量格式。" },
      { key: "C", text: "GeoJSON", hint: "矢量格式。" },
      { key: "D", text: "GPX", hint: "轨迹格式。" },
    ],
    exp: "GeoTIFF 用 TIFF 标签承载 CRS 与仿射参数，GDAL 生态下栅格交换的事实标准；云上进化版是 COG。",
    refs: [REF.gisWiki] },
  { stem: "瓦片级别每 +1，地面分辨率（m/px）如何变化？", ans: "B",
    opts: [
      { key: "A", text: "×2（变粗糙）", hint: "方向反了。" },
      { key: "B", text: "÷2（更精细）" },
      { key: "C", text: "不变", hint: "每级都变。" },
      { key: "D", text: "×4", hint: "总数 ×4，分辨率 ÷2。" },
    ],
    exp: "分辨率 = 156543.03392 / 2^z（赤道 m/px，256px 瓦片）：z 每加 1，瓦片数 ×4、单块地面边长减半。",
    refs: [REF.tilenames, REF.epsg3857] },
  { stem: "关于 {s} 子域占位符（如 a/b/c.tile.example.com），其目的是？", ans: "C",
    opts: [
      { key: "A", text: "区分不同投影", hint: "与投影无关。" },
      { key: "B", text: "区分数据版本", hint: "版本另有机制。" },
      { key: "C", text: "绕过浏览器对单域名并发连接的限制，加速加载" },
      { key: "D", text: "标记付费层级", hint: "鉴权靠 token。" },
    ],
    exp: "HTTP/1.1 时代浏览器对单域名并发数有限制，子域轮换（a/b/c）可并行拉瓦片；HTTP/2 多路复用后此技巧已不必要。",
    refs: [REF.tilenames] },
  { stem: "下列哪种情况瓦片服务应该返回空瓦片（或 404）？", ans: "B",
    opts: [
      { key: "A", text: "用户没登录", hint: "鉴权失败是 401/403。" },
      { key: "B", text: "请求的 z/x/y 超出范围或该处无数据" },
      { key: "C", text: "服务器重启中", hint: "应为 5xx。" },
      { key: "D", text: "URL 写错协议", hint: "请求根本不会到瓦片逻辑。" },
    ],
    exp: "越界/空区域的瓦片按约定返回空图或 404；客户端应把 404 视为「无此瓦片」而不是致命错误。",
    refs: [REF.tilenames] },
  { stem: "下列哪个不是瓦片方案的层级选择依据？", ans: "D",
    opts: [
      { key: "A", text: "目标显示比例尺", hint: "级别≈比例尺。" },
      { key: "B", text: "数据精度", hint: "级别上限受源数据分辨率约束。" },
      { key: "C", text: "屏幕分辨率与视野范围", hint: "决定当前该取哪一级。" },
      { key: "D", text: "服务器硬盘品牌", hint: "毫无关系。" },
    ],
    exp: "层级选择 = 显示比例尺 + 源数据分辨率 + 视野/屏宽；与硬件品牌无关。",
    refs: [REF.tilenames] },
  { stem: "把同一份数据同时切成 XYZ 与 TMS 两套瓦片，它们的关系是？", ans: "B",
    opts: [
      { key: "A", text: "完全不同的两份数据", hint: "内容相同，索引方式不同。" },
      { key: "B", text: "同层瓦片集合相同，只是 y 编号镜像（y_tms = 2^z − 1 − y_xyz）" },
      { key: "C", text: "x 编号镜像", hint: "x 两个方案一致。" },
      { key: "D", text: "z 相差 1", hint: "z 语义一致。" },
    ],
    exp: "两方案覆盖同一网格，仅 y 轴方向相反：y_tms = 2^z − 1 − y_xyz。加载错方案会出现南北镜像。",
    refs: [REF.tilenames] },
  { stem: "下列关于 KML 的说法，正确的是？", ans: "A",
    opts: [
      { key: "A", text: "XML 文本格式，坐标为 WGS84 经纬度，支持样式与三维标注" },
      { key: "B", text: "二进制压缩格式", hint: "KMZ 才是打包压缩。" },
      { key: "C", text: "只支持点要素", hint: "支持点线面模型标注等。" },
      { key: "D", text: "只允许二维平面", hint: "KML 的强项恰是三维。" },
    ],
    exp: "KML（OGC 标准）以 XML 描述地标、路径、面、模型与样式，坐标 WGS84；打包压缩版为 KMZ。",
    refs: [REF.gisWiki] },
  { stem: "要在浏览器里对 GeoJSON 做要素点击高亮，最直接的理由是？", ans: "C",
    opts: [
      { key: "A", text: "GeoJSON 内置了样式表", hint: "样式由前端库或 mapbox style 表达。" },
      { key: "B", text: "浏览器原生渲染 GeoJSON 为矢量", hint: "需借助 Leaflet/MapLibre 等库。" },
      { key: "C", text: "GeoJSON 是结构化 JSON，要素与属性可直接绑定 DOM/交互事件" },
      { key: "D", text: "GeoJSON 自带服务端", hint: "它只是数据格式。" },
    ],
    exp: "GeoJSON 的 JSON 结构让「数据 ↔ UI 状态」绑定非常自然，配合 Leaflet 等库即可逐要素绑定事件与样式。",
    refs: [REF.geojson] },
  { stem: "下列哪种瓦片「按需编码、按需渲染」，最适合数据频繁更新的底图？", ans: "B",
    opts: [
      { key: "A", text: "预切栅格瓦片 PNG", hint: "更新需重切全部受影响瓦片。" },
      { key: "B", text: "矢量瓦片（MVT）" },
      { key: "C", text: "静态 GeoJSON 整包", hint: "整包传输，更新粒度粗。" },
      { key: "D", text: "JPEG 影像瓦片", hint: "同栅格。" },
    ],
    exp: "MVT 按视野实时编码生成（或预生成），样式与渲染解耦：数据更新只需重生成受影响矢量瓦片，不需重绘全部样式。",
    refs: [REF.vectorTiles] },
  { stem: "关于瓦片缓存（浏览器/服务端），正确的策略是？", ans: "A",
    opts: [
      { key: "A", text: "瓦片内容按 z/x/y 不变即可长缓存；数据更新后通过新版本号/时间戳失效" },
      { key: "B", text: "瓦片永远不能缓存", hint: "缓存正是瓦片方案的价值。" },
      { key: "C", text: "缓存必须存满 1 年", hint: "TTL 按更新频率定。" },
      { key: "D", text: "客户端缓存与服务器无关", hint: "HTTP 缓存头由服务端控制。" },
    ],
    exp: "不可变内容用长 TTL + 显式失效（版本目录、ETag），是瓦片分发的基本缓存纪律。",
    refs: [REF.tilenames] },
  { stem: "下列哪个操作最可能让瓦片地图的流量暴涨？", ans: "B",
    opts: [
      { key: "A", text: "开启客户端磁盘缓存", hint: "缓存减少流量。" },
      { key: "B", text: "大屏高分屏 + 快速缩放全层级预取" },
      { key: "C", text: "减少子域数量", hint: "影响并发而非总量。" },
      { key: "D", text: "压缩瓦片为 WebP", hint: "压缩减小体积。" },
    ],
    exp: "高分屏需要 @2x 瓦片、快速缩放会连带请求多级瓦片；预取策略要设上限并尊重服务条款。",
    refs: [REF.tilenames] },
  { stem: "关于 COG 与传统 GeoTIFF 的关系，正确的是？", ans: "C",
    opts: [
      { key: "A", text: "COG 是另一种文件格式", hint: "仍是 TIFF 结构。" },
      { key: "B", text: "COG 必须压缩为 JPEG", hint: "支持多种压缩，可无损。" },
      { key: "C", text: "COG 是按云访问优化的 GeoTIFF 布局（索引前置 + 分块），兼容常规读写" },
      { key: "D", text: "COG 不能存储坐标参考", hint: "GeoTIFF 的元数据能力全部保留。" },
    ],
    exp: "COG 规定了 TIFF 内部布局（IFD 置前、瓦片化+Overviews），使 HTTP Range 只读所需块；普通 GIS 软件仍可当普通 GeoTIFF 打开。",
    refs: [REF.gisWiki] },
  { stem: "下列哪个说法符合「shapefile 字段名最长 10 字符」的影响？", ans: "A",
    opts: [
      { key: "A", text: "长字段名会被截断，跨系统迁移时需维护字段映射" },
      { key: "B", text: "没有影响", hint: "截断会造成重名与语义丢失。" },
      { key: "C", text: "可以开启扩展模式突破限制", hint: "shapefile 本体无此机制。" },
      { key: "D", text: "只影响中文字段", hint: "任何字段名都受限。" },
    ],
    exp: "dBASE 字段名上限 10 字符（还有类型/宽度限制），迁移到 GeoPackage/PostGIS 时常见字段名被截断的坑。",
    refs: [REF.shapefile] },
  { stem: "瓦片方案中「重投影服务」的意义是？", ans: "B",
    opts: [
      { key: "A", text: "让瓦片更美观", hint: "与美观无关。" },
      { key: "B", text: "把源数据投影（如 4326）实时/预生成转换为瓦片投影（3857）的网格" },
      { key: "C", text: "压缩瓦片体积", hint: "压缩另有算法。" },
      { key: "D", text: "增加图层数量", hint: "与图层无关。" },
    ],
    exp: "多数瓦片方案固定 3857（或 4326 网格变体）；源数据坐标系不同时由地图服务（GeoServer 等）重采样到瓦片网格。",
    refs: [REF.epsg3857, REF.tilenames] },
  { stem: "下列哪个不是选择「栅格瓦片 vs 矢量瓦片」时需要考虑的因素？", ans: "D",
    opts: [
      { key: "A", text: "客户端渲染能力", hint: "矢量渲染吃客户端算力。" },
      { key: "B", text: "样式灵活性需求", hint: "矢量可换肤。" },
      { key: "C", text: "数据更新频率", hint: "矢量更利于频繁更新。" },
      { key: "D", text: "服务器机柜颜色", hint: "无关变量。" },
    ],
    exp: "选型三要素：客户端算力、样式/交互需求、数据规模与更新频率；影像类底图仍常选栅格瓦片。",
    refs: [REF.vectorTiles] },
  { stem: "GeoJSON 中一个 FeatureCollection 至少可以包含几个 Feature？", ans: "A",
    opts: [
      { key: "A", text: "0 个（空集合也合法）" },
      { key: "B", text: "必须 1 个以上", hint: "RFC 7946 允许空数组。" },
      { key: "C", text: "必须按要素类型分组", hint: "无此要求。" },
      { key: "D", text: "只能包含同类型几何", hint: "可混合 Point/Line/Polygon。" },
    ],
    exp: "RFC 7946：FeatureCollection.features 可为空数组，也可混合不同几何类型。",
    refs: [REF.geojson] },
  { stem: "下列哪个格式以「弧段共享」为特征，专门优化邻接表达与文件体积？", ans: "C",
    opts: [
      { key: "A", text: "GeoJSON", hint: "每要素独立坐标。" },
      { key: "B", text: "CSV", hint: "纯表。" },
      { key: "C", text: "TopoJSON" },
      { key: "D", text: "KML", hint: "无拓扑概念。" },
    ],
    exp: "TopoJSON 把共享边界编码为 arcs，消除冗余并显式表达拓扑（邻接/包含），适合 D3 等前端可视化。",
    refs: [REF.geojson] },
  { stem: "瓦片地图上「层级的视觉连续性」指的是？", ans: "B",
    opts: [
      { key: "A", text: "所有层级用同一瓦片", hint: "那会糊成一团。" },
      { key: "B", text: "相邻层级切换时内容连贯（低级内容是高级内容的概化）" },
      { key: "C", text: "瓦片边缘必须无缝拼接", hint: "那是拼接一致性，不是层级连续性。" },
      { key: "D", text: "层级数必须等于 24", hint: "层级数按数据定。" },
    ],
    exp: "金字塔的层级语义：z+1 是 z 的细化版本。若各级内容不一致，缩放时会「跳变」。矢量瓦片靠要素分级 LOD 保证连续性。",
    refs: [REF.tilenames] },
  { stem: "把一份 4326 数据直接当 3857 显示（不做投影），会看到什么？", ans: "C",
    opts: [
      { key: "A", text: "完全正常", hint: "网格不同会错位。" },
      { key: "B", text: "南北镜像", hint: "那是 XYZ/TMS 混淆。" },
      { key: "C", text: "整体压扁且与底图错位（纬度方向被非线性拉伸）" },
      { key: "D", text: "只影响高程", hint: "水平方向错位。" },
    ],
    exp: "4326 是角度坐标，3857 是米制平面：把度当米渲染，位置与形状全错（且纬度方向失真随纬度变化），必须重投影。",
    refs: [REF.epsg3857, REF.epsg4326] },
];

const SHORTS: { stem: string; accepted: string[]; exp: string }[] = [
  { stem: "瓦片 URL 模板中代表缩放级别的占位符是？（单个字母）", accepted: ["z", "{z}"], exp: "{z} 缩放级别、{x} 列、{y} 行，另有 {s} 子域与 {bbox-epsg-3857} 等变体。" },
  { stem: "把 GeoJSON 与瓦片绑定最常用的 MIME 类型是？（application/…）", accepted: ["application/geo+json", "application/vnd.geo+json", "application/json"], exp: "标准为 application/geo+json（RFC 7946），实践中也常见 application/json。" },
  { stem: "瓦片容器格式中基于 SQLite 的开放规范缩写是？（6 个字母）", accepted: ["mbtiles"], exp: "MBTiles：SQLite 单文件瓦片库，Mapbox 发起、广泛支持。" },
  { stem: "面向云对象存储优化的 GeoTIFF 布局规范缩写是？（3 个字母）", accepted: ["cog", "cloud optimized geotiff"], exp: "COG（Cloud Optimized GeoTIFF）支持 Range 请求按需读取。" },
  { stem: "OGC 矢量瓦片编码规范的通行缩写是？（3 个字母）", accepted: ["mvt", "mapbox vector tile"], exp: "MVT（Mapbox Vector Tile）已是 OGC 社区标准（OGC:20-142）。" },
  { stem: "KML 打包压缩后的文件扩展名是？（含点号）", accepted: [".kmz", "kmz"], exp: "KMZ = KML（doc.kml）+ 关联资源的 ZIP 包。" },
  { stem: "GPX 中记录轨迹的 XML 元素名是？（小写三个字母）", accepted: ["trk", "<trk>", "trkseg"], exp: "trk/trkseg/trkpt 组成轨迹层次；wpt 为航点，rte 为路线。" },
  { stem: "Web 墨卡托下瓦片网格的坐标单位是？（中文两个字）", accepted: ["米", "米制", "米单位"], exp: "3857 是米制平面坐标（赤道处 1 单位≈1 米），瓦片金字塔建立在该网格上。" },
  { stem: "XYZ 瓦片 y 轴的正方向是自北向南还是自南向北？（四个字）", accepted: ["自北向南", "北向南", "自上而下"], exp: "XYZ（OSM/Google）y=0 在最北，向下递增；TMS 相反。" },
  { stem: "把海量 PNG/JPEG 瓦片按层级目录组织成的结构统称什么？（两个字 + 金字塔）", accepted: ["瓦片金字塔", "金字塔", "tile pyramid"], exp: "金字塔逐级概化：低级概览、高级精细，按视野取级加载。" },
];

export function gen04(count: number, r: () => number) {
  const out: object[] = [];
  const ZS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // 1. lon/lat → x（30）
  for (let i = 0; i < 30; i += 1) {
    const z = ZS[i % ZS.length]!;
    const lon = rint(r, -179, 179);
    const lat = rint(r, -70, 70);
    const { x } = tileXY(lon, lat, z);
    out.push(
      numeric("04", i % 3 + 1,
        `Web 墨卡托瓦片方案：经度 ${lon}°、纬度 ${lat}° 在第 ${z} 级的瓦片列号 x 是多少？`,
        x, 0,
        `x = ⌊(经度+180)/360 × 2^${z}⌋ = ⌊(${lon}+180)/360 × ${2 ** z}⌋ = ${x}。列号只与经度有关。`,
        [REF.tilenames], { placeholder: "如 1234" }),
    );
  }

  // 2. lon/lat → y（30）
  for (let i = 0; i < 30; i += 1) {
    const z = ZS[(i + 3) % ZS.length]!;
    const lon = rint(r, -179, 179);
    const lat = rint(r, -70, 70);
    const { y } = tileXY(lon, lat, z);
    out.push(
      numeric("04", i % 3 + 1,
        `Web 墨卡托瓦片方案：经度 ${lon}°、纬度 ${lat}° 在第 ${z} 级的瓦片行号 y 是多少（XYZ 方案，北为 0）？`,
        y, 0,
        `y = ⌊(1 − ln(tan φ + sec φ)/π)/2 × 2^${z}⌋ = ${y}。行号与墨卡托纵坐标有关，纬度越高越靠 0。`,
        [REF.tilenames], { placeholder: "如 678" }),
    );
  }

  // 3. 瓦片总数（10）
  for (let i = 0; i < 10; i += 1) {
    const z = rint(r, 2, 14);
    const ans = 4 ** z;
    out.push(
      numeric("04", i % 3 === 0 ? 1 : 2,
        `瓦片金字塔第 ${z} 级一共有多少块瓦片？`,
        ans, 0,
        `总数 = 4^z = 4^${z} = ${ans.toLocaleString("en-US")} 块（每级行列数各为 2^${z}）。`,
        [REF.tilenames]),
    );
  }

  // 4. 赤道分辨率（20）
  for (let i = 0; i < 20; i += 1) {
    const z = rint(r, 2, 18);
    const ans = round(156543.03392 / 2 ** z, 2);
    out.push(
      numeric("04", i % 3 + 1,
        `EPSG:3857 第 ${z} 级在赤道处的地面分辨率是多少米/像素？（256px 瓦片，保留 2 位小数）`,
        ans, 0.02,
        `分辨率 = 156543.03392 / 2^${z} = ${ans} m/px。每 +1 级分辨率减半、瓦片总数 ×4。`,
        [REF.tilenames, REF.epsg3857], { unit: "m/px" }),
    );
  }

  // 5. 瓦片左上角经度（15）
  for (let i = 0; i < 15; i += 1) {
    const z = ZS[i % ZS.length]!;
    const { x, y, n } = tileXY(rint(r, -179, 179), rint(r, -60, 60), z);
    const tl = tileTopLeft(x, y, z);
    out.push(
      numeric("04", i % 3 + 1,
        `瓦片 z=${z}, x=${x}, y=${y} 左上角的经度是多少度？（保留 4 位小数）`,
        round(tl.lng, 4), 0.0002,
        `左上角经度 = x/2^${z} × 360 − 180 = ${x}/${n} × 360 − 180 = ${round(tl.lng, 4)}°。瓦片西边界即该经度。`,
        [REF.tilenames], { unit: "°" }),
    );
  }

  // 6. 瓦片左上角纬度（15）
  for (let i = 0; i < 15; i += 1) {
    const z = ZS[(i + 5) % ZS.length]!;
    const { x, y } = tileXY(rint(r, -179, 179), rint(r, -60, 60), z);
    const tl = tileTopLeft(x, y, z);
    out.push(
      numeric("04", i % 3 + 1,
        `瓦片 z=${z}, x=${x}, y=${y} 左上角的纬度是多少度？（保留 4 位小数）`,
        round(tl.lat, 4), 0.0002,
        `左上角纬度由墨卡托反解：φ = atan(sinh(π(1 − 2y/2^${z}))) ≈ ${round(tl.lat, 4)}°。注意 y 越小纬度越高。`,
        [REF.tilenames, REF.mercator], { unit: "°" }),
    );
  }

  // 7. quadkey（20）
  for (let i = 0; i < 20; i += 1) {
    const z = ZS[i % ZS.length]!;
    const lon = rint(r, -179, 179);
    const lat = rint(r, -60, 60);
    const { x, y } = tileXY(lon, lat, z);
    const key = qk(x, y, z);
    out.push(
      short("04", i % 3 + 1,
        `瓦片 z=${z}, x=${x}, y=${y} 的 Bing quadkey 是什么？`,
        [key],
        `quadkey 把 x/y 的二进制逐位交错（y 为高位、x 为低位）转成 0/1/2/3 字符串，长度等于 z。该瓦片的 quadkey = ${key}。`,
        [REF.quadkey], "如 0123"),
    );
  }

  // 8. TMS y（10）
  for (let i = 0; i < 10; i += 1) {
    const z = ZS[i % ZS.length]!;
    const lon = rint(r, -179, 179);
    const lat = rint(r, -60, 60);
    const { x, y, n } = tileXY(lon, lat, z);
    const tmsY = n - 1 - y;
    out.push(
      numeric("04", i % 3 + 1,
        `同一瓦片（z=${z}, x=${x}, XYZ y=${y}）在 TMS 方案中的行号是多少？`,
        tmsY, 0,
        `TMS y = 2^z − 1 − y_xyz = ${n} − 1 − ${y} = ${tmsY}。两方案只差 y 轴镜像。`,
        [REF.tilenames]),
    );
  }

  // 9. 判断（25）
  out.push(...tfBatch("04", TF, [REF.tilenames, REF.geojson, REF.vectorTiles]));

  // 10. 单选（25）
  SINGLES.forEach((s) => out.push(single("04", 2, s.stem, s.opts, s.ans, s.exp, s.refs)));

  // 11. 短答（10）
  SHORTS.forEach((s, i) =>
    out.push(short("04", i % 3 === 0 ? 1 : 2, s.stem, s.accepted, s.exp, [REF.tilenames])),
  );

  return out.slice(0, count);
}
