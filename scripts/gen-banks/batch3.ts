/**
 * 批次 3 题库：07 工具链（全新 80 题）+ 04 矢量栅格补充（join/几何有效性 15 题）。
 * 由 scripts/gen-questions-batch3.ts 调用。
 */
import {
  numeric,
  short,
  single,
  multi,
  tfBatch,
  type TfTuple,
  type Ref,
} from "./helpers";

const REF_GDAL: Ref[] = [
  { title: "GDAL/OGR Programs", url: "https://gdal.org/programs/index.html" },
  { title: "QGIS 用户手册", url: "https://docs.qgis.org/latest/zh_Hans/docs/user_manual/processing/index.html" },
];
const REF_NE: Ref[] = [{ title: "Natural Earth", url: "https://www.naturalearthdata.com/" }];

// ============ 07 工具链：判断 ============
const TF07: TfTuple[] = [
  ["GDAL 处理矢量，OGR 处理栅格。", false, "反了：GDAL 管栅格、OGR 管矢量；ogr 开头的命令（ogrinfo/ogr2ogr）面向矢量。"],
  ["QGIS 的很多处理算法底层就是调用 GDAL/OGR。", true, "GUI 是壳，引擎是 GDAL/OGR/GRASS/SAGA——处理工具箱日志里能看到真实命令。"],
  ["PROJ 是 GDAL 底层的坐标变换库。", true, "第 02/03 章的投影与基准转换数学都在 PROJ 里实现。"],
  ["ogrinfo -so 输出的是完整数据内容而不是摘要。", false, "-so = summary only，只输出图层结构摘要：几何类型、要素数、extent、字段。"],
  ["gdalinfo 能看到栅格的尺寸、原点、像元大小与 NoData。", true, "这些正是栅格仿射变换与波段的核心元信息。"],
  ["ogr2ogr 可以在转换的同时完成重投影。", true, "加 -t_srs 即边转换边重投影，一步到位。"],
  ["源数据缺 .prj 文件时，ogr2ogr 可用 -s_srs 手动指定源坐标系。", true, "GDAL 无法凭空猜坐标系；-s_srs 强制声明后再做变换。"],
  ["-nlt PROMOTE_TO_MULTI 把混合的 Point/LineString/Polygon 提升为对应 Multi 类型。", true, "避免几何类型不匹配报错的最常用保命参数。"],
  ["gdal_translate -of COG 可把普通 GeoTIFF 转成云优化 GeoTIFF。", true, "COG 驱动自 GDAL 3.1 起可用，配合 -co COMPRESS 等创建选项。"],
  ["gdalwarp 的 -cutline 配合 -crop_to_cutline 可按矢量边界裁剪栅格。", true, "cutline 提供裁剪边界（矢量数据源），crop_to_cutline 让输出范围缩到边界内。"],
  ["gdalwarp -tr 30 30 表示把输出像元统一成 30 m × 30 m。", true, "-tr xres yres 设定目标分辨率，单位随目标坐标系（投影坐标 usually 米）。"],
  ["COG 打包成 zip 上传对象存储能加速读取。", false, "zip 会破坏 HTTP Range 直读——COG 的核心价值就是分段读取，绝不要 zip。"],
  ["QGIS 处理工具箱的算法日志会显示它实际调用的命令行。", true, "日志页即教材：GUI 配置 → 日志命令行，两边互为老师。"],
  ["QGIS 处理工具箱支持把同一算法批处理应用到多个文件。", true, "右键算法 → 作为批处理执行。"],
  ["拿到陌生数据应先用 ogrinfo/gdalinfo 体检再动手分析。", true, "几何类型、要素数、extent、坐标系、字段类型一屏看完。"],
  ["ogr2ogr 只能转 Shapefile 到 GeoJSON，不支持数据库。", false, "GDAL/OGR 支持几十种矢量源/目标，含 PostgreSQL/GeoPackage/S3 等。"],
  ["gdalwarp -r nearest 是分类栅格重采样的安全选择。", true, "最近邻不产生新值——分类栅格铁律（见第 04 章）。"],
  ["GeoPackage 本质是一个 SQLite 数据库文件。", true, "单文件 .gpkg，可存矢量、栅格与瓦片，无 2 GB 限制。"],
  ["Natural Earth 提供免费的公共领域基础底图数据，适合练手。", true, "1:10m/50m/110m 三档比例尺的全球矢量数据，GIS 教学标配。"],
  ["ogrinfo 与 gdalinfo 的分工是：ogr 系列管矢量，gdal 系列管栅格。", true, "命令名记忆法：ogr = 矢量；不带 ogr = 栅格。"],
  ["gdalwarp 只能重投影，不能做重采样。", false, "-r 参数选择重采样方法（near/bilinear/cubic 等），-tr 设定目标分辨率。"],
  ["QGIS 浏览器面板可以直接拖拽数据进地图画布加载。", true, "浏览器面板像文件管理器，拖入即加载，还能连数据库与 WMS。"],
];

// ============ 07 工具链：单选 ============
type S7 = { d: number; stem: string; opts: [string, string][]; answer: string; exp: string };
const SINGLE07: S7[] = [
  { d: 1, stem: "查看一份 Shapefile 的字段与几何类型，应使用？", opts: [["A", "ogrinfo"], ["B", "gdalinfo"], ["C", "gdalwarp"], ["D", "projinfo"]], answer: "A", exp: "ogr 系列管矢量：ogrinfo -so -al 一屏看全结构。" },
  { d: 1, stem: "查看一份 GeoTIFF 的波段与 NoData，应使用？", opts: [["A", "ogrinfo"], ["B", "gdalinfo"], ["C", "ogr2ogr"], ["D", "tippecanoe"]], answer: "B", exp: "gdal 系列管栅格：尺寸、原点、像元大小、波段、NoData。" },
  { d: 2, stem: "把 Shapefile 转成 GeoPackage 并重投影到 EPSG:4490，一条命令是？", opts: [["A", "ogr2ogr -f GPKG out.gpkg in.shp -t_srs EPSG:4490"], ["B", "gdalwarp -f GPKG out.gpkg in.shp"], ["C", "gdal_translate -srs 4490 in.shp out.gpkg"], ["D", "projinfo in.shp out.gpkg"]], answer: "A", exp: "ogr2ogr：-f 定格式，-t_srs 定目标坐标系。" },
  { d: 2, stem: "转换时出现『几何类型不匹配』报错，最常用的保命参数是？", opts: [["A", "-nlt PROMOTE_TO_MULTI"], ["B", "-append"], ["C", "-nln"], ["D", "-lco"]], answer: "A", exp: "提升为 Multi 类型，兼容单/混合几何。" },
  { d: 2, stem: "源 Shapefile 丢了 .prj，转换前应加哪个参数声明源坐标系？", opts: [["A", "-t_srs"], ["B", "-s_srs"], ["C", "-a_srs（配 gdal 系）或 -s_srs"], ["D", "无法处理"]], answer: "B", exp: "-s_srs 强制指定源 SRS；缺 prj 不声明就无法正确变换。" },
  { d: 2, stem: "把 dem.tif 转成 COG 的正确命令是？", opts: [["A", "gdal_translate -of COG dem.tif dem_cog.tif"], ["B", "gdalwarp -of COG dem.tif"], ["C", "ogr2ogr -f COG dem.tif"], ["D", "zip dem.tif dem_cog.zip"]], answer: "A", exp: "gdal_translate -of COG（GDAL ≥ 3.1）；zip 会破坏 Range 读取。" },
  { d: 2, stem: "按行政区边界裁剪栅格，gdalwarp 应配合哪个参数？", opts: [["A", "-cutline 边界.geojson -crop_to_cutline"], ["B", "-clip only"], ["C", "-tr 边界.geojson"], ["D", "-r cut"]], answer: "A", exp: "-cutline 指定矢量裁剪线，-crop_to_cutline 缩输出范围。" },
  { d: 2, stem: "把 10 m DEM 统一到 30 m 像元并双线性重采样，参数是？", opts: [["A", "-tr 30 30 -r bilinear"], ["B", "-ts 30 30 -r bilinear"], ["C", "-tr 30 30 -r nearest（唯一正确）"], ["D", "-scale 30"]], answer: "A", exp: "-tr 定分辨率；连续场（高程）可用 bilinear。-ts 是输出尺寸（像素数），与 -tr 互斥。" },
  { d: 1, stem: "QGIS 里像文件管理器一样浏览并拖拽数据的面板是？", opts: [["A", "浏览器面板"], ["B", "图层面板"], ["C", "标注面板"], ["D", "皮肤面板"]], answer: "A", exp: "浏览器面板可浏览本地/数据库/WMS，拖入画布即加载。" },
  { d: 2, stem: "在 QGIS 处理工具箱里想看算法『实际执行了什么』，应打开？", opts: [["A", "日志信息面板"], ["B", "属性表"], ["C", "图层样式"], ["D", "打印布局"]], answer: "A", exp: "日志页显示真实命令行与输出——GUI 与 CLI 的桥梁。" },
  { d: 2, stem: "QGIS 中把同一算法应用到 50 个文件的最快方式是？", opts: [["A", "右键算法 → 作为批处理执行"], ["B", "手动跑 50 次"], ["C", "写成 Word 宏"], ["D", "换 ArcGIS"]], answer: "A", exp: "批处理（batch）是处理工具箱的内置能力。" },
  { d: 2, stem: "ogr2ogr 输出图层改名用哪个参数？", opts: [["A", "-nln"], ["B", "-nlt"], ["C", "-lco"], ["D", "-t_srs"]], answer: "A", exp: "-nln = new layer name；-nlt 是几何类型。" },
  { d: 3, stem: "设置 GeoPackage/Shapefile 输出格式专属选项（如编码）用？", opts: [["A", "-lco"], ["B", "-co"], ["C", "-nln"], ["D", "-f"]], answer: "A", exp: "ogr 系列用 -lco（layer creation option）；栅格 gdal 系列用 -co。" },
  { d: 2, stem: "PostGIS 自带的 Shapefile 导入工具是？", opts: [["A", "shp2pgsql"], ["B", "ogr2pgsql"], ["C", "shp2post"], ["D", "pg_dump"]], answer: "A", exp: "shp2pgsql 生成 SQL 配合 psql 导入；反向是 pgsql2shp。" },
  { d: 1, stem: "GDAL 官网列出的命令行程序大约覆盖哪个数量级？", opts: [["A", "几十个"], ["B", "两个"], ["C", "上千个"], ["D", "一个都没有"]], answer: "A", exp: "gdal.org/programs 列出约 40+ 个程序，覆盖转换/裁剪/拼接/统计等。" },
  { d: 2, stem: "想给输出 GeoTIFF 设置 DEFLATE 压缩，参数是？", opts: [["A", "-co COMPRESS=DEFLATE"], ["B", "-zip"], ["C", "-lco COMPRESS=DEFLATE（栅格场合）"], ["D", "-r DEFLATE"]], answer: "A", exp: "栅格创建选项用 -co；-lco 是矢量（OGR）场合。" },
  { d: 3, stem: "ogr2ogr 不指定 -f 时，输出格式如何确定？", opts: [["A", "按输出文件扩展名猜测"], ["B", "默认 Shapefile"], ["C", "报错退出"], ["D", "默认 GeoJSON"]], answer: "A", exp: "扩展名猜格式（如 .gpkg → GeoPackage）；显式 -f 更稳。" },
  { d: 2, stem: "把多个分幅 DEM 拼接成一景，GDAL 常用命令是？", opts: [["A", "gdal_merge.py 或 gdalbuildvrt + gdal_translate"], ["B", "ogr2ogr -merge"], ["C", "gdalinfo -merge"], ["D", "gdalwarp -zip"]], answer: "A", exp: "经典两条路：gdal_merge.py 直接拼；或建 VRT 虚拟镶嵌再 translate。" },
  { d: 2, stem: "ogrinfo 输出中的 Extent 表示？", opts: [["A", "图层要素的最小外接范围（bbox）"], ["B", "坐标系原点"], ["C", "属性表行数"], ["D", "文件大小"]], answer: "A", exp: "extent = (minX, minY) - (maxX, maxY)，快速判断数据在哪、坐标系对不对。" },
  { d: 3, stem: "gdalinfo 里 Pixel Size = (0.000277, -0.000278) 说明什么？", opts: [["A", "像元约 1 角秒，Y 步长为负（北向上）"], ["B", "像元 277 米"], ["C", "文件被压缩了"], ["D", "数据有问题"]], answer: "A", exp: "0.000278° ≈ 1″；北向上时 Y 步长为负，这是地理坐标系栅格的常见形态。" },
  { d: 1, stem: "本课程建议的 QGIS 版本线是？", opts: [["A", "LTR（长期支持版）"], ["B", "每晚构建版"], ["C", "任意旧版"], ["D", "必须源码编译"]], answer: "A", exp: "LTR 稳定且文档/插件兼容性最好，教学与生产都选它。" },
  { d: 2, stem: "QGIS 中双击图层面板里的图层，打开的是？", opts: [["A", "图层属性（含符号化/标注/源）"], ["B", "属性表"], ["C", "打印布局"], ["D", "浏览器"]], answer: "A", exp: "双击 = 图层属性对话框；属性表是右键 → 打开属性表。" },
  { d: 3, stem: "gdalwarp 的 -ts 参数含义是？", opts: [["A", "输出图像的像素尺寸（行列数）"], ["B", "目标坐标系"], ["C", "目标分辨率（米）"], ["D", "瓦片大小"]], answer: "A", exp: "-ts 设定输出像素数，与 -tr（分辨率）互斥：一个定像素数、一个定地面分辨率。" },
  { d: 3, stem: "GDAL 能直接读取的对象不包括？", opts: [["A", "本地 Shapefile"], ["B", "PostGIS 表"], ["C", "S3 上的 COG"], ["D", "Word 文档里的地图截图"]], answer: "D", exp: "GDAL 支持本地/数据库/云存储几十种数据源；截图是图片不是地理数据。", },
];

// ============ 07 工具链：多选 ============
function multi07() {
  const m = "07";
  const refs = REF_GDAL;
  return [
    multi(m, 2, "开源 GIS 底层四件套的正确搭配有？", [
      { key: "A", text: "GDAL/OGR — 格式与转换" }, { key: "B", text: "PROJ — 坐标变换" }, { key: "C", text: "GEOS — 几何运算" }, { key: "D", text: "QGIS — 桌面 GUI" },
    ], ["A", "B", "C", "D"], "四者分工明确，QGIS 把前三者包成图形界面。", refs),
    multi(m, 2, "ogr2ogr 的正确用法有？", [
      { key: "A", text: "-f GPKG 转 GeoPackage" }, { key: "B", text: "-t_srs 重投影" }, { key: "C", text: "-nlt PROMOTE_TO_MULTI 保平安" }, { key: "D", text: "-r bilinear 重采样矢量" },
    ], ["A", "B", "C"], "重采样（-r）是栅格概念，矢量没有重采样。", refs),
    multi(m, 2, "gdalwarp 能做的事包括？", [
      { key: "A", text: "重投影" }, { key: "B", text: "按矢量边界裁剪" }, { key: "C", text: "重采样" }, { key: "D", text: "查看元信息" },
    ], ["A", "B", "C"], "看元信息是 gdalinfo 的活；warp 管几何变换三件套。", refs),
    multi(m, 2, "关于 COG，正确的有？", [
      { key: "A", text: "支持 HTTP Range 局部读取" }, { key: "B", text: "gdal_translate -of COG 生成" }, { key: "C", text: "GDAL ≥ 3.1 支持写入" }, { key: "D", text: "必须配合 zip 使用" },
    ], ["A", "B", "C"], "zip 破坏 Range 直读，COG 绝不 zip。", refs),
    multi(m, 2, "拿到陌生数据先体检，应关注 ogrinfo/gdalinfo 输出中的哪些信息？", [
      { key: "A", text: "几何类型 / 波段类型" }, { key: "B", text: "要素数 / 尺寸" }, { key: "C", text: "extent 范围" }, { key: "D", text: "坐标系" },
    ], ["A", "B", "C", "D"], "五项信息决定后续分析能否正确进行。", refs),
    multi(m, 2, "QGIS 处理工具箱的能力包括？", [
      { key: "A", text: "调用 GDAL/GRASS/SAGA 算法" }, { key: "B", text: "查看算法实际命令行" }, { key: "C", text: "批处理多个文件" }, { key: "D", text: "自动修复所有脏数据" },
    ], ["A", "B", "C"], "数据修复也要人来判断，没有『自动修复一切』。", refs),
    multi(m, 2, "命令与对象的配对正确的有？", [
      { key: "A", text: "ogrinfo — 矢量元信息" }, { key: "B", text: "gdalinfo — 栅格元信息" }, { key: "C", text: "ogr2ogr — 矢量转换" }, { key: "D", text: "gdal_translate — 矢量转换" },
    ], ["A", "B", "C"], "gdal_translate 管栅格格式转换（含 COG）。", refs),
    multi(m, 2, "gdalwarp -r 可选的重采样方法包括？", [
      { key: "A", text: "near（最近邻）" }, { key: "B", text: "bilinear（双线性）" }, { key: "C", text: "cubic（三次卷积）" }, { key: "D", text: "rainbow（彩虹）" },
    ], ["A", "B", "C"], "rainbow 是色带不是重采样方法（见第 05 章）。", refs),
    multi(m, 2, "关于 Natural Earth 数据，正确的有？", [
      { key: "A", text: "公共领域许可，免费使用" }, { key: "B", text: "提供 1:10m / 50m / 110m 比例尺" }, { key: "C", text: "适合教学与练手" }, { key: "D", text: "包含实时交通路况" },
    ], ["A", "B", "C"], "Natural Earth 是静态基础底图数据，没有实时路况。", [...REF_GDAL, ...REF_NE]),
    multi(m, 2, "在 QGIS 中核对 GUI 与命令行的正确姿势有？", [
      { key: "A", text: "跑完算法看日志页的命令行" }, { key: "B", text: "复制命令行到终端手动重跑" }, { key: "C", text: "把命令行存进文档备查" }, { key: "D", text: "假装没看见日志" },
    ], ["A", "B", "C"], "日志是理解 GUI 背后机制的窗口；『自动黑箱运行』不学东西。", refs),
  ];
}

// ============ 07 工具链：短答 ============
function short07() {
  const m = "07";
  const refs = REF_GDAL;
  return [
    short(m, 1, "查看矢量图层结构与字段类型的命令（含常用摘要参数）？", ["ogrinfo -so", "ogrinfo -so -al", "ogrinfo"], "ogrinfo -so -al：摘要模式 + 全图层，一屏看全几何/要素数/extent/字段。", refs),
    short(m, 1, "查看栅格元信息的命令是？", ["gdalinfo", "gdal info"], "gdalinfo 输出尺寸、坐标系、原点、像元大小、波段、NoData。", refs),
    short(m, 2, "Shapefile 转 GeoJSON 并重投影到 EPSG:3857 的一条命令怎么写（写出关键参数即可）？", ["ogr2ogr", "t_srs", "ogr2ogr -f", "-t_srs"], "ogr2ogr -f GeoJSON out.json in.shp -t_srs EPSG:3857。", refs),
    short(m, 2, "把 GeoTIFF 转成 COG 的命令与格式名？", ["gdal_translate -of COG", "-of COG", "gdal_translate"], "gdal_translate -of COG in.tif out.tif（GDAL ≥ 3.1），配 -co 设压缩。", refs),
    short(m, 2, "gdalwarp 按矢量边界裁剪栅格需要哪两个参数？", ["cutline", "crop_to_cutline", "-cutline -crop_to_cutline"], "-cutline 指定边界矢量，-crop_to_cutline 让输出缩到边界内。", refs),
    short(m, 3, "为什么栅格创建选项用 -co 而 OGR 用 -lco？（答出两个前缀含义即可）", ["co", "lco", "creation", "layer"], "-co = creation option（数据集级，栅格）；-lco = layer creation option（图层级，矢量）。", refs),
    short(m, 2, "矢量转换时避免几何类型不匹配报错的参数是？", ["PROMOTE_TO_MULTI", "-nlt PROMOTE_TO_MULTI", "nlt"], "-nlt PROMOTE_TO_MULTI 把单几何统一提升为 Multi。", refs),
    short(m, 3, "源数据缺坐标系定义文件时，ogr2ogr 如何补救？", ["s_srs", "-s_srs", "声明源坐标系"], "-s_srs 强制声明源坐标系后，-t_srs 的变换才有意义。", refs),
    short(m, 2, "在 QGIS 里定位处理算法最快的操作是什么？", ["搜索", "搜索框", "processing toolbox", "工具箱搜索"], "处理工具箱顶部搜索框输入关键词（如 buffer/warp）直达算法。", refs),
    short(m, 3, "为什么说『QGIS 的处理日志是学习命令行的教材』？", ["日志", "命令行", "真实", "copy", "复制"], "日志页显示 GUI 背后实际调用的命令行，可直接复制重跑与修改。", refs),
    short(m, 2, "把同一算法套用到 50 个文件，QGIS 的做法是？", ["批处理", "batch", "作为批处理执行"], "右键算法 → 作为批处理执行，表格化配置多输入。", refs),
    short(m, 3, "分类栅格重采样应选 gdalwarp -r 的哪个方法？为什么？", ["near", "nearest", "最近邻"], "最近邻不产生新值，保住类别码；双线性会造出『不存在的类别』。", refs),
  ];
}

// ============ 07 工具链：数值 ============
function numeric07() {
  const m = "07";
  const refs = REF_GDAL;
  return [
    numeric(m, 2, "3000×3000 像元、10 m 分辨率的 DEM 重采样到 30 m（-tr 30 30），输出有多少个像元（行列相乘）？", 1000000, 0, "每边 3000×10/30 = 1000，输出 1000×1000 = 100 万像元。", refs),
    numeric(m, 3, "6000×6000 像元、30 m 分辨率的栅格重采样到 15 m，输出像元总数是？", 144000000, 0, "每边 6000×2 = 12000，输出 12000² = 1.44 亿像元——分辨率翻倍，像元数 ×4。", refs),
    numeric(m, 2, "2000×2000 像元、10 m 分辨率的栅格重采样到 50 m，输出像元总数是？", 160000, 0, "每边 2000×10/50 = 400，输出 400² = 16 万像元。", refs),
    numeric(m, 3, "10000×10000 像元、100 m 分辨率的栅格重采样到 50 m，输出像元总数是？", 400000000, 0, "每边 10000×2 = 20000，输出 4 亿像元。", refs),
    numeric(m, 1, "COG/GeoTIFF 内部瓦片块大小为 256×256，一块含多少像元？", 65536, 0, "256² = 65 536 = 2^16。", refs),
    numeric(m, 2, "1000×1000 的单波段 uint8 栅格（无压缩）文件体约多少 MB（按 10^6 字节 = 1 MB 计）？", 1, 0.01, "10^6 像元 × 1 字节 = 10^6 B = 1 MB。", refs),
    numeric(m, 3, "2000×2000 的单波段 Float32（4 字节）无压缩栅格约多少 MB（10^6 B = 1 MB）？", 16, 0.05, "4×10^6 像元 × 4 B = 1.6×10^7 B = 16 MB。", refs),
    numeric(m, 2, "500×500 的 RGB 三波段 uint8 无压缩栅格约多少字节？", 750000, 500, "250 000 × 3 B = 750 000 字节。", refs),
    numeric(m, 2, "宽 1024 的栅格金字塔概览逐级减半，第 4 级概览的宽度是多少像素？", 64, 0, "1024→512→256→128→64。", refs),
    numeric(m, 2, "宽 2048 的栅格第 4 级概览宽度是多少像素？", 128, 0, "2048→1024→512→256→128。", refs),
    numeric(m, 1, "ogrinfo 报告 Feature Count = 177，另一份是其 3 倍，要素数是多少？", 531, 0, "177 × 3 = 531——理解输出数字是体检第一步。", refs),
    numeric(m, 3, "gdalinfo 报告像元 0.000277778°（≈1″），该栅格 3600 列覆盖约多少度（保留 1 位小数）？", 1, 0.02, "3600 × 0.000277778 ≈ 1.0°——SRTM 1° 分幅正是如此。", refs),
  ];
}

// ============ 04 补充：join 与几何有效性 ============
const TF04: TfTuple[] = [
  ["属性连接（join）依据的是两表共同的键字段。", true, "属性 join 按字段值匹配（如行政区划代码），空间 join 按位置关系。"],
  ["join 的两表中键类型一边是文本一边是数字时，连接通常仍能自动匹配。", false, "类型不一致常导致匹配为空——连接前先统一键类型。"],
  ["空间连接（spatial join）不需要两表有共同字段。", true, "它按位置关系（落在谁里面/相交/最近）挂属性，是 GIS 特有能力。"],
  ["join 出现一对多时，图层要素会被复制，统计可能翻倍。", true, "一个区 3 条记录 → 区要素复制 3 份；先聚合再连接。"],
  ["无效几何（如自相交）只会让软件报错，不会静默算错。", false, "更危险的是静默错误：面积算错、相邻关系判反、overlay 结果歪。"],
  ["ST_MakeValid 用于修复无效几何。", true, "PostGIS 的 ST_IsValid 检查、ST_MakeValid 修复，是入库前固定工序。"],
];

function single04() {
  const m = "04";
  const s = (d: number, stem: string, opts: [string, string][], answer: string, exp: string) =>
    single(m, d, stem, opts.map(([key, text]) => ({ key, text })), answer, exp, REF_GDAL);
  return [
    s(2, "一个区对应多条 GDP 记录时，直接 join 的正确前置操作是？", [["A", "先按区聚合 GDP 再连接"], ["B", "直接连接，软件会处理"], ["C", "删除多余记录"], ["D", "换投影"]], "A", "一对多会把要素复制多份；先聚合到一对一再连接。"),
    s(1, "把快递网点表按『落在哪个行政区』挂上区名，应使用？", [["A", "属性连接"], ["B", "空间连接"], ["C", "全外连接"], ["D", "无法实现"]], "B", "依据位置关系（包含）挂属性，网点表无需存区名。"),
    s(2, "属性 join 成功的两大前提是？", [["A", "键唯一且类型一致"], ["B", "坐标系一致"], ["C", "字段名相同"], ["D", "表行数相同"]], "A", "键不唯一会复制要素，类型不一致会匹配为空。"),
    s(2, "多边形边界两个顶点交叉形成的无效几何俗称？", [["A", "蝴蝶结（bowtie）"], ["B", "甜甜圈"], ["C", "意大利面"], ["D", "马赛克"]], "A", "自相交的典型形态；甜甜圈是带洞面（合法），意大利面是无拓扑模型。"),
    s(2, "检查与修复几何有效性的 PostGIS 函数对是？", [["A", "ST_IsValid / ST_MakeValid"], ["B", "ST_Length / ST_Buffer"], ["C", "ST_Intersects / ST_Union"], ["D", "ST_Transform / ST_SetSRID"]], "A", "先 IsValid 检查，再 MakeValid 修复（详见第 12 章）。"),
  ];
}

function short04() {
  const m = "04";
  return [
    short(m, 2, "不用在网点表里存区名，也能把区名挂到每个网点上——用的什么技术？", ["空间连接", "spatial join", "空间 join", "空间关系"], "空间连接：按『点落在哪个面内』的位置关系挂属性。", REF_GDAL),
    short(m, 3, "为什么叠加分析前要对数据做几何有效性检查？", ["报错", "静默", "算错", "无效", "valid"], "无效几何会让 overlay 报错或静默给出错误结果；先 ST_IsValid 过筛再分析。", REF_GDAL),
  ];
}

function multi04() {
  const m = "04";
  const refs = REF_GDAL;
  return [
    multi(m, 2, "下列属于无效几何的有？", [
      { key: "A", text: "自相交（蝴蝶结）" }, { key: "B", text: "环未闭合" }, { key: "C", text: "内环在外环之外" }, { key: "D", text: "带一个洞的合法多边形" },
    ], ["A", "B", "C"], "带洞面是合法几何（外环+内环）；A/B/C 都是 OGC 有效性定义的违例。", refs),
    multi(m, 2, "属性 join 前应检查的两大前提是？", [
      { key: "A", text: "键值唯一性（一对一）" }, { key: "B", text: "键类型一致" }, { key: "C", text: "两表坐标系一致" }, { key: "D", text: "两表文件格式相同" },
    ], ["A", "B"], "属性 join 与坐标系、文件格式无关；那是空间 join/转换的事。", refs),
  ];
}

export function gen07Tools(): object[] {
  return [
    ...tfBatch("07", TF07, REF_GDAL),
    ...SINGLE07.map((q, i) => single("07", q.d, q.stem, q.opts.map(([key, text]) => ({ key, text })), q.answer, q.exp, REF_GDAL)),
    ...multi07(),
    ...short07(),
    ...numeric07(),
  ];
}

export function gen04Extra(): object[] {
  return [
    ...tfBatch("04", TF04, REF_GDAL),
    ...single04(),
    ...short04(),
    ...multi04(),
  ];
}
