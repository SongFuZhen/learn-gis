/** m03 矢量与栅格：栅格计算 65 + 判断 30 + 单选 25 + 短答 10 = 130 题 */
import {
  numeric,
  rint,
  round,
  sample,
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
  ["矢量数据中的点要素只有位置，没有长度和面积。", true, "点是零维几何，只有坐标（可带高程），长度面积均为 0。"],
  ["两个相邻多边形共享一条完全相同的边界是拓扑数据结构的典型特征。", true, "弧段-结点模型让边界只存一次，既省空间又天然保证无缝隙无重叠。"],
  ["栅格数据中每个像元只能有一个属性值。", true, "单波段栅格每像元一个值；多波段（如 RGB 影像）是多个波段的堆叠。"],
  ["GeoTIFF 能够把地理参考信息（坐标系、仿射参数）内嵌在文件里。", true, "GeoTIFF 用标签记录 CRS 与六参数仿射变换，是栅格交换的事实标准。"],
  ["矢量数据转栅格数据是零损失的。", false, "栅格化把坐标离散到像元中心，最多损失半个像元的位置精度。"],
  ["栅格分辨率减半，像元总数约变为原来的 4 倍。", true, "行列数各翻倍，总数 ×4；数据量随分辨率平方增长。"],
  ["线要素的折点（Vertex）越密，表达形状越精细，数据量也越大。", true, "折点密度决定形状保真度与存储/渲染成本，Douglas-Peucker 可抽稀。"],
  ["shapefile 的 .prj 文件缺失时，数据将无法打开。", false, "仍可打开，但软件不知道其坐标系，需要人工指定。"],
  ["shapefile 的属性表存储在 .dbf 文件中。", true, ".shp 存几何、.shx 存索引、.dbf 存属性，三者缺一不可。"],
  ["shapefile 单文件容量上限约为 2 GB。", true, "shapefile 基于 dBASE 与 32 位偏移，2GB 是硬限制；大数据应换 GeoPackage 等格式。"],
  ["多边形自相交（蝴蝶结）在多数空间分析中会导致错误或不可预期结果。", true, "自相交面不是简单多边形，缓冲/叠加/面积计算都可能出错，应先用 ST_MakeValid 等修复。"],
  ["缓冲区分析的结果一定是多边形。", true, "Buffer 围绕点/线/面生成邻域，结果恒为面（多个 buffer 可组成多面）。"],
  ["叠加分析中 Intersect 保留两图层的公共部分及其属性。", true, "Intersect 输出几何交集并拼接两侧属性；Union 输出全部范围。"],
  ["DEM 中的「空值（NoData）」可以当作 0 米参与计算。", false, "NoData 表示无数据，当作 0 会把无值区域算成海平面，严重污染结果。"],
  ["栅格重采样中，最近邻法不改变原始像元值。", true, "最近邻只做位置搬移，适合分类图/掩膜；双线性/三次卷积会插值出新值。"],
  ["矢量数据的地图代数运算比栅格更高效。", false, "地图代数是栅格范式；矢量叠加计算复杂度更高。"],
  ["一个 GeoJSON Feature 由几何（geometry）与属性（properties）组成。", true, "Feature = geometry + properties（+ id），FeatureCollection 是其集合。"],
  ["网络分析中，道路必须在交叉口处打断才能正确计算连通。", true, "未打断的相交线在拓扑上互不连通，最短路径会「跳过」交叉口。"],
  ["坡度、坡向可以从 DEM 中逐像元推导。", true, "由相邻像元高程差的梯度计算坡度/坡向，是 DEM 的标准派生产品。"],
  ["栅格金字塔（Overview）通过预存低分辨率副本加速显示。", true, "金字塔逐级降采样，缩放到小比例尺时只读低分辨率层，交互更流畅。"],
  ["矢量要素的边界（Boundary）与范围（Extent/BBox）是同一个概念。", false, "Boundary 是低维边界（面的边线），Extent 是包围盒，两者完全不同。"],
  ["影像镶嵌（Mosaic）是把多景影像拼接成一幅连续影像。", true, "镶嵌需统一分辨率与色彩平衡，接边处做羽化避免硬缝。"],
  ["矢量化中的「悬挂线（Dangle）」指线段端点未与其他线段相接。", true, "悬挂点是拓扑检查重点，常见于交叉口未打断或边界未闭合。"],
  ["栅格数据不能表达点状要素。", false, "可以用高值像元表达点位（如 1/0 掩膜），只是效率与精度不如矢量。"],
  ["裁剪（Clip）后矢量要素的属性表记录也会随之保留（被裁掉的除外）。", true, "Clip 是几何求交 + 属性继承，落在裁剪框内的要素保留属性。"],
  ["像元深度（Bit Depth）为 8 bit 的波段可表达 256 个灰度级。", true, "2^8 = 256，16 bit 为 65536 级。"],
  ["多波段影像按 RGB 合成显示时，波段顺序影响颜色表现。", true, "标准假彩色（NIR-R-G）与真彩色（R-G-B）的观感和用途都不同。"],
  ["TIN 中每个三角形由三个不共线的点和两条弧段组成。", false, "每个三角形有三条边（弧段），不是两条。"],
  ["矢量数据量与制图比例尺有关：比例尺越大，要素与折点越密。", true, "大比例尺数据采集更精细，存储量随之增大。"],
  ["栅格数据的「地图代数」可以把多个栅格按像元逐位运算。", true, "逐像元运算（map algebra）是栅格建模的核心，如适宜性加权叠加。"],
];

const SINGLES: { stem: string; opts: Opt[]; ans: string; exp: string; refs: Ref[] }[] = [
  { stem: "shapefile 必备的三个同名文件是？", ans: "B",
    opts: [
      { key: "A", text: ".shp / .tif / .dbf", hint: ".tif 是栅格格式。" },
      { key: "B", text: ".shp / .shx / .dbf" },
      { key: "C", text: ".shp / .geojson / .prj", hint: "GeoJSON 是另一种独立格式。" },
      { key: "D", text: ".gpkg / .shx / .dbf", hint: ".gpkg 是 GeoPackage。" },
    ],
    exp: ".shp（几何）、.shx（空间索引）、.dbf（属性表）缺一不可；.prj（坐标系）、.cpg（编码）为可选。",
    refs: [REF.shapefile] },
  { stem: "下列哪一项最适合作为「全国土地利用分类图」的分析格式？", ans: "C",
    opts: [
      { key: "A", text: "CSV 坐标表", hint: "无法表达面状分类。" },
      { key: "B", text: "JPEG 图片", hint: "无地理参考与像元值语义。" },
      { key: "C", text: "单波段分类栅格（每值一类）或矢量面层" },
      { key: "D", text: "XYZ 点云", hint: "点云是三维离散点，不是分类面。" },
    ],
    exp: "分类图常用单波段栅格（值=类别码，配查找表）或矢量面+类别属性；选择取决于分析是面向像元还是面向地块。",
    refs: [REF.gisWiki] },
  { stem: "把 1 m 分辨率 DEM 重采样为 10 m，最合适的重采样方法是？", ans: "A",
    opts: [
      { key: "A", text: "双线性或三次卷积（连续高程场）" },
      { key: "B", text: "最近邻（会保留锯齿与空隙）", hint: "最近邻适合分类图，高程是连续场。" },
      { key: "C", text: "不可能重采样", hint: "重采样是栅格基本操作。" },
      { key: "D", text: "先矢量化再栅格化", hint: "绕远路且引入两次误差。" },
    ],
    exp: "连续场降尺度/升尺度用双线性/三次卷积保平滑；分类图必须用最近邻防止产生不存在的类别值。",
    refs: [REF.gisWiki] },
  { stem: "下列哪种操作能同时消除面层缝隙与重叠？", ans: "B",
    opts: [
      { key: "A", text: "逐要素手动平移", hint: "效率低且不可复现。" },
      { key: "B", text: "建立拓扑规则（无缝隙、无重叠）并修复共享边" },
      { key: "C", text: "换个显示比例", hint: "显示不改变数据。" },
      { key: "D", text: "导出成 CSV", hint: "丢失几何语义。" },
    ],
    exp: "拓扑编辑（如共享边编辑、集群容差 snap）从结构上保证相邻面共用同一条边，缝隙/重叠随之消除。",
    refs: [REF.topology] },
  { stem: "矢量叠加 Union 与 Intersect 的区别是？", ans: "C",
    opts: [
      { key: "A", text: "没有区别，只是名字不同", hint: "语义完全不同。" },
      { key: "B", text: "Union 只保留交集", hint: "那是 Intersect。" },
      { key: "C", text: "Union 输出两图层全部范围并拼属性；Intersect 只输出交集" },
      { key: "D", text: "Union 只能用于栅格", hint: "Union 是矢量叠加操作。" },
    ],
    exp: "Intersect 取几何交集（两侧属性拼接）；Union 保留 A∪B 全部区域（交集外一侧属性为空）。Identity/Symmetric Difference 是其余变体。",
    refs: [REF.gisWiki] },
  { stem: "栅格掩膜（Mask）运算的主要用途是？", ans: "B",
    opts: [
      { key: "A", text: "提升影像色彩", hint: "色彩增强与掩膜无关。" },
      { key: "B", text: "把运算/分析限制在感兴趣区域内（区外置 NoData）" },
      { key: "C", text: "改变坐标参考系", hint: "那是重投影。" },
      { key: "D", text: "压缩文件体积", hint: "掩膜可能减小有效范围但目的不是压缩。" },
    ],
    exp: "掩膜把分析限定在指定区域：掩膜内保留原值、区外置 NoData，常用于行政区裁剪与有效区约束。",
    refs: [REF.gisWiki] },
  { stem: "下列哪种数据结构最适合表达「道路连通关系」？", ans: "A",
    opts: [
      { key: "A", text: "带结点-弧段拓扑的网络数据集" },
      { key: "B", text: "普通线图层（无拓扑）", hint: "交叉口不连通，无法正确寻径。" },
      { key: "C", text: "栅格坡向图", hint: "与道路无关。" },
      { key: "D", text: "点云", hint: "离散点无网络语义。" },
    ],
    exp: "网络数据集以结点+边+转向约束建模连通性，是路径、服务区、OD 分析的基础。",
    refs: [REF.topology] },
  { stem: "关于 NoData，下列处理最恰当的是？", ans: "C",
    opts: [
      { key: "A", text: "一律填 0", hint: "0 是有效值，会污染统计。" },
      { key: "B", text: "一律填 -9999 并参与计算", hint: "填充值必须排除在统计外。" },
      { key: "C", text: "统计与运算时显式排除 NoData 像元" },
      { key: "D", text: "删除含 NoData 的整幅影像", hint: "过度处理。" },
    ],
    exp: "NoData 语义是「此处无有效值」：参与均值/求和会失真，必须显式排除；需要连续覆盖时才考虑插值填补并标注。",
    refs: [REF.gisWiki] },
  { stem: "下列哪个字段类型最适合存储「面要素面积（m²）」？", ans: "B",
    opts: [
      { key: "A", text: "文本", hint: "文本不能直接参与数值统计。" },
      { key: "B", text: "双精度浮点（double）" },
      { key: "C", text: "布尔", hint: "只有真/假两值。" },
      { key: "D", text: "日期", hint: "与数值无关。" },
    ],
    exp: "面积是连续数值且可能很大（地理坐标算出的平方度可达天文数字），用 double 存储最稳妥；整数型适合计数与类别码。",
    refs: [REF.gisWiki] },
  { stem: " Douglas-Peucker 算法用于？", ans: "A",
    opts: [
      { key: "A", text: "按容差抽稀折点、简化线/面形状" },
      { key: "B", text: "加密折点提高精度", hint: "它只减不增。" },
      { key: "C", text: "检测多边形自相交", hint: "那是有效性检查。" },
      { key: "D", text: "计算缓冲区", hint: "缓冲是邻域几何运算。" },
    ],
    exp: "D-P 算法递归保留偏离最大的关键点，在容差内大幅减少折点，是制图综合与 LOD 的标准简化手段。",
    refs: [REF.gisWiki] },
  { stem: "栅格数据中「波段（Band）」的含义是？", ans: "B",
    opts: [
      { key: "A", text: "一行像元", hint: "那是扫描行。" },
      { key: "B", text: "每个像元位置上的一个属性维度（如某波长反射率）" },
      { key: "C", text: "一圈等高线", hint: "等高线是矢量概念。" },
      { key: "D", text: "一个瓦片层级", hint: "层级是瓦片金字塔概念。" },
    ],
    exp: "波段=同一格网上的一个属性层：RGB 三个波段、多光谱十几个、高光谱上百；DEM 通常单波段。",
    refs: [REF.gisWiki] },
  { stem: "把零散的 POI 点按 1 km 格网统计数量，最适合的栅格操作是？", ans: "C",
    opts: [
      { key: "A", text: "坡度分析", hint: "与点密度无关。" },
      { key: "B", text: "重投影", hint: "只改坐标系。" },
      { key: "C", text: "点转栅格 + 邻域/汇总统计（点密度）" },
      { key: "D", text: "影像融合", hint: "多波段合成概念。" },
    ],
    exp: "点密度/核密度把点事件聚合为连续面场；固定格网计数则用「点转栅格+ focal sum」，两者都是密度制图的标准做法。",
    refs: [REF.gisWiki] },
  { stem: "下列关于 GeoPackage 的说法，正确的是？", ans: "A",
    opts: [
      { key: "A", text: "基于 SQLite 的单文件 OGC 标准，可同时存矢量、栅格与瓦片" },
      { key: "B", text: "只能存点数据", hint: "支持全部几何类型与栅格。" },
      { key: "C", text: "是 Esri 私有格式", hint: "它是 OGC 开放标准。" },
      { key: "D", text: "有 2GB 容量上限", hint: "那是 shapefile 的限制，SQLite 上限约 TB 级。" },
    ],
    exp: "GeoPackage（OGC 标准）= SQLite 容器 + 矢量/瓦片/扩展表，单文件、无 2GB 限制，正逐步取代 shapefile。",
    refs: [REF.geopackage] },
  { stem: "「像元深度 16 bit、单波段」影像的每个像元占用多少字节？", ans: "B",
    opts: [
      { key: "A", text: "1 字节", hint: "那是 8 bit。" },
      { key: "B", text: "2 字节" },
      { key: "C", text: "4 字节", hint: "那是 32 bit。" },
      { key: "D", text: "16 字节", hint: "bit ≠ byte，差 8 倍。" },
    ],
    exp: "16 bit = 2 字节；存储估算 = 行×列×波段×字节数（再乘压缩比）。",
    refs: [REF.gisWiki] },
  { stem: "矢量数据「连接（Join）」与「空间连接（Spatial Join）」的本质区别是？", ans: "C",
    opts: [
      { key: "A", text: "没有区别", hint: "匹配机制完全不同。" },
      { key: "B", text: "Join 只用于栅格", hint: "Join 是属性表操作。" },
      { key: "C", text: "Join 按属性字段值匹配；Spatial Join 按几何关系（相交/包含/邻近）匹配" },
      { key: "D", text: "Spatial Join 会丢失几何", hint: "输出仍带几何。" },
    ],
    exp: "属性 Join 靠键值相等；Spatial Join 靠空间谓词（within/nearest/intersects）挂接属性，是「点在哪个区」类问题的答案。",
    refs: [REF.gisWiki] },
  { stem: "一幅 8 bit 三波段（真彩色）未压缩影像 1000×1000 像元，磁盘占用约？", ans: "C",
    opts: [
      { key: "A", text: "1 MB", hint: "只算了单波段。" },
      { key: "B", text: "2 MB", hint: "只算了两个波段或字节算错。" },
      { key: "C", text: "约 3 MB（1000×1000×3 字节）" },
      { key: "D", text: "约 24 MB", hint: "把 bit 当字节重复计算了。" },
    ],
    exp: "1000×1000 像元 × 3 波段 × 1 字节 = 3×10^6 字节 ≈ 2.86 MiB。估算公式：行列×波段×字节/深度。",
    refs: [REF.gisWiki] },
  { stem: "下列哪项是「矢量数据」的优势？", ans: "B",
    opts: [
      { key: "A", text: "天然适合逐像元代数运算", hint: "那是栅格的强项。" },
      { key: "B", text: "精确表达边界与拓扑关系" },
      { key: "C", text: "文件结构简单到只有一种", hint: "矢量格式繁多。" },
      { key: "D", text: "渲染永远更快", hint: "海量矢量渲染反而比瓦片图慢。" },
    ],
    exp: "矢量擅长精确边界、拓扑与网络语义；栅格擅长连续场与快速代数运算。两者各有所长。",
    refs: [REF.gisWiki] },
  { stem: "下列哪种几何「方向」会影响缓冲与叠加的语义？", ans: "D",
    opts: [
      { key: "A", text: "点的坐标顺序", hint: "点没有顺序概念。" },
      { key: "B", text: "多边形的颜色", hint: "符号化参数。" },
      { key: "C", text: "属性表排序", hint: "与几何无关。" },
      { key: "D", text: "多边形外环与内环的绕向（外逆内顺等约定）" },
    ],
    exp: "OGC 简单要素约定外环逆时针、内环顺时针；绕向错会导致「内外面颠倒」、面积符号为负等问题。",
    refs: [REF.geojson] },
  { stem: "把 DEM 转成等高线的操作属于？", ans: "A",
    opts: [
      { key: "A", text: "栅格→矢量的转换（等值线提取）" },
      { key: "B", text: "矢量→栅格", hint: "方向反了。" },
      { key: "C", text: "坐标重投影", hint: "与转换维度无关。" },
      { key: "D", text: "重采样", hint: "重采样是栅格内部操作。" },
    ],
    exp: "Contour（等值线）提取把连续栅格场转为矢量线，是栅格派生矢量产品的典型操作，反向则是栅格化。",
    refs: [REF.gisWiki] },
  { stem: "下列哪种情况应优先用「最近邻重采样」？", ans: "B",
    opts: [
      { key: "A", text: "高程 DEM 抽稀", hint: "连续场用双线性更好。" },
      { key: "B", text: "土地利用分类图重投影" },
      { key: "C", text: "气温插值加密", hint: "气温是连续场。" },
      { key: "D", text: "影像色彩拉伸", hint: "与重采样无关。" },
    ],
    exp: "类别码是离散值，插值会产生「0.4 类」这种无意义值；最近邻保证类别值不变。",
    refs: [REF.gisWiki] },
  { stem: "关于拓扑的「悬挂点」，下列说法正确的是？", ans: "C",
    opts: [
      { key: "A", text: "悬挂点是要素的起点", hint: "起点是正常拓扑元素。" },
      { key: "B", text: "悬挂点只出现在面要素上", hint: "主要指线要素未接住的端点。" },
      { key: "C", text: "线端点未与其他线或边界相接，常因交叉口未打断或漏画造成" },
      { key: "D", text: "悬挂点不会影响任何分析", hint: "会破坏网络连通与面闭合。" },
    ],
    exp: "Dangle=未连上的线端点。路网不连通、面不闭合都由它引起，拓扑检查（容差内 snap）是标准修复手段。",
    refs: [REF.topology] },
  { stem: "一幅影像「几何纠正」的主要目的是？", ans: "B",
    opts: [
      { key: "A", text: "提高色彩饱和度", hint: "那是辐射/色彩处理。" },
      { key: "B", text: "消除几何变形并把影像配准到目标坐标系" },
      { key: "C", text: "压缩存储体积", hint: "与压缩无关。" },
      { key: "D", text: "增加波段数量", hint: "波段数由传感器决定。" },
    ],
    exp: "几何纠正用地面控制点（GCP）+ 变换模型（多项式/仿射）+ 重采样，把影像纠正到地图坐标，是正射校正的前置步骤。",
    refs: [REF.gisWiki] },
  { stem: "下列哪个不是矢量数据模型的基本元素？", ans: "D",
    opts: [
      { key: "A", text: "结点（Node）" },
      { key: "B", text: "弧段/边（Edge）" },
      { key: "C", text: "折点（Vertex）" },
      { key: "D", text: "像元（Pixel）", hint: "像元属于栅格模型。" },
    ],
    exp: "矢量模型由点-折点-结点-边-面构成；像元是栅格模型的最小单元。",
    refs: [REF.gisWiki] },
  { stem: "「邻域分析（Focal/Neighborhood）」在栅格中的典型应用是？", ans: "A",
    opts: [
      { key: "A", text: "以每个像元为中心的窗口内统计（均值/最大值/密度）" },
      { key: "B", text: "修改属性字段", hint: "属性操作与邻域无关。" },
      { key: "C", text: "数据库建索引", hint: "存储层优化。" },
      { key: "D", text: "格式转换", hint: "与邻域无关。" },
    ],
    exp: "邻域分析用滑动窗口（3×3 等）做焦点统计：坡度、纹理、平滑、密度面都是其应用。",
    refs: [REF.gisWiki] },
  { stem: "两个图层的要素逐一求交后，统计「每个网格单元内的地震点数」，这属于？", ans: "C",
    opts: [
      { key: "A", text: "网络分析", hint: "不涉及网络。" },
      { key: "B", text: "三维分析", hint: "不涉及高程维。" },
      { key: "C", text: "空间叠加 + 点密度/频数统计" },
      { key: "D", text: "坐标变换", hint: "不涉及变换。" },
    ],
    exp: "点面叠加（Point in Polygon）+ 分组计数是「空间聚合」的标准流程，常见于风险区划与密度制图。",
    refs: [REF.gisWiki] },
];

const SHORTS: { stem: string; accepted: string[]; exp: string }[] = [
  { stem: "shapefile 几何数据存放在哪个扩展名的文件里？（含点号）", accepted: [".shp", "shp"], exp: ".shp 存几何主体，.shx 是其索引，.dbf 存属性表。" },
  { stem: "记录 shapefile 坐标参考系的扩展名文件是？（含点号）", accepted: [".prj", "prj"], exp: ".prj 内是 WKT 格式的 CRS 定义，缺失时软件不知道坐标系。" },
  { stem: "单文件、基于 SQLite 的 OGC 开放矢量/栅格容器格式叫什么？", accepted: ["geopackage", "gpkg", "geopackage（gpkg）"], exp: "GeoPackage（.gpkg）是 OGC 标准，正逐步替代 shapefile。" },
  { stem: "把矢量要素按像元离散化的过程叫什么？", accepted: ["栅格化", "rasterization"], exp: "栅格化产生至多半个像元的位置误差，是两模型互转的方向之一。" },
  { stem: "从 DEM 提取等高线的操作属于哪类转换？（栅格转什么）", accepted: ["矢量", "矢量化", "等值线提取"], exp: "等值线提取是栅格场 → 矢量线的派生过程。" },
  { stem: "多边形「外环逆时针、内环顺时针」的绕向约定出自哪个标准族？（三个字母缩写）", accepted: ["ogc", "sfa", "简单要素", "ogc sfa"], exp: "OGC 简单要素（SFA）约定了环绕向；RFC 7946 对 GeoJSON 另有约定（外顺内逆/未定义）。" },
  { stem: "用于描述线状要素形状简化、按容差抽稀折点的经典算法名是？（人名）", accepted: ["douglas-peucker", "douglas peucker", "道格拉斯-普克", "道格拉斯普克", "dp"], exp: "Douglas-Peucker 递归保留关键折点，在容差内最大化保形。" },
  { stem: "栅格金字塔的低分辨率预览层叫什么？（英文）", accepted: ["overview", "overview pyramid", "金字塔", "overview 层"], exp: "Overview（概视图）逐级降采样，加速缩放显示。" },
  { stem: "DEM 中表示「此处无有效数据」的专用值叫什么？（英文）", accepted: ["nodata", "no data", "空值"], exp: "NoData 必须在统计与代数运算中显式排除，不能当 0。" },
  { stem: "矢量叠加中「只保留两图层公共部分」的操作叫什么？（英文）", accepted: ["intersect", "相交", "intersection"], exp: "Intersect 取几何交集并拼接两侧属性；Union 则保留全部范围。" },
];

export function gen03(count: number, r: () => number) {
  const out: object[] = [];

  // 1. 总像元数（15）
  for (let i = 0; i < 15; i += 1) {
    const w = rint(r, 100, 20000);
    const h = rint(r, 100, 20000);
    const b = rint(r, 1, 4);
    const ans = w * h * b;
    out.push(
      numeric("03", i % 3 === 0 ? 1 : 2,
        `某栅格宽 ${w} 像元、高 ${h} 像元、${b} 个波段，总共有多少个像元值（含所有波段）？`,
        ans, 0,
        `像元值总数 = 宽 × 高 × 波段数 = ${w} × ${h} × ${b} = ${ans}。注意「像元数」（w×h）与「像元值数」的区别。`,
        [REF.gisWiki]),
    );
  }

  // 2. 覆盖范围（20）：宽/高两个变体
  for (let i = 0; i < 20; i += 1) {
    const res = sample(r, [0.5, 1, 2, 5, 10, 15, 30, 90], 1)[0]!;
    const w = rint(r, 500, 40000);
    const ans = round((res * w) / 1000, 2);
    out.push(
      numeric("03", i % 3 + 1,
        `分辨率 ${res} m 的影像宽 ${w} 像元，横向覆盖多少公里？（保留 2 位小数）`,
        ans, Math.max(0.01, round(ans * 0.01, 2)),
        `覆盖 = ${res} m × ${w} = ${round(res * w, 0)} m = ${ans} km。`,
        [REF.gisWiki], { unit: "km" }),
    );
  }

  // 3. 未压缩文件大小（20）
  const depths = [8, 16, 32];
  for (let i = 0; i < 20; i += 1) {
    const w = rint(r, 500, 10000);
    const h = rint(r, 500, 10000);
    const bit = depths[i % depths.length]!;
    const band = rint(r, 1, 3);
    const mb = round((w * h * band * bit) / 8 / 1024 / 1024, 2);
    out.push(
      numeric("03", i % 3 + 1,
        `${w}×${h} 像元、${band} 波段、每波段 ${bit} bit 的未压缩栅格约占多少 MB？（按 1 MB = 1024×1024 字节，保留 2 位小数）`,
        mb, Math.max(0.05, round(mb * 0.01, 2)),
        `${w}×${h}×${band} 像元值 × ${bit / 8} 字节 = ${round((w * h * band * bit) / 8 / 1024 / 1024, 4)} MB ≈ ${mb} MB。压缩比另计。`,
        [REF.gisWiki], { unit: "MB" }),
    );
  }

  // 4. 像元角点地理坐标（10）：给定左上角原点与分辨率，求某行某列的 x/y
  for (let i = 0; i < 10; i += 1) {
    const res = sample(r, [0.5, 1, 2, 5, 10, 30], 1)[0]!;
    const ox = rint(r, 100000, 500000);
    const oy = rint(r, 3000000, 4500000);
    const col = rint(r, 0, 999);
    const row = rint(r, 0, 999);
    const askX = i % 2 === 0;
    const ans = askX ? round(ox + col * res, 2) : round(oy - row * res, 2);
    out.push(
      numeric("03", i % 3 + 1,
        `投影坐标系下某栅格左上角原点为 (${ox}, ${oy})，像元 ${res} m。第 ${col} 列、第 ${row} 行的像元${askX ? "左边界 X" : "上边界 Y"}坐标是多少？（保留 2 位小数）`,
        ans, 0.01,
        askX
          ? `X = 原点X + 列号 × 像元宽 = ${ox} + ${col} × ${res} = ${ans} m（Y 行号向下递减）。`
          : `Y = 原点Y − 行号 × 像元高 = ${oy} − ${row} × ${res} = ${ans} m（图像行号自上而下）。`,
        [REF.gisWiki], { unit: "m" }),
    );
  }

  // 5. 判断（30）
  out.push(...tfBatch("03", TF, [REF.gisWiki, REF.topology, REF.geojson]));

  // 6. 单选（25）
  SINGLES.forEach((s) => out.push(single("03", 2, s.stem, s.opts, s.ans, s.exp, s.refs)));

  // 7. 短答（10）
  SHORTS.forEach((s, i) =>
    out.push(short("03", i % 3 === 0 ? 1 : 2, s.stem, s.accepted, s.exp, [REF.gisWiki])),
  );

  return out.slice(0, count);
}
