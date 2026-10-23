/** m02 坐标参考系：UTM/高斯带号计算 55 + EPSG 20 + 判断 30 + 单选 20 + 地图 10 = 135 题 */
import {
  numeric,
  map,
  short,
  rint,
  sample,
  single,
  truefalse,
  type Opt,
  type TfTuple,
  tfBatch,
  type Ref,
} from "./helpers";
import { REF } from "./geoutil";

const TF: TfTuple[] = [
  ["地理坐标系（GCS）用经纬度表示位置，单位是度而不是米。", true, "GCS 是球面/椭球面上的角度坐标；投影坐标系（PCS）把球面展平成平面米制坐标。"],
  ["投影坐标系直接用经纬度存储坐标。", false, "投影坐标系存储的是平面直角坐标（x/y，单位米），经纬度是地理坐标系的产物。"],
  ["任何地图投影都会产生变形，长度、面积、角度至少一项失真。", true, "球面不可无撕裂无皱褶地展为平面，高斯「绝妙定理」保证了这一点。"],
  ["等角投影保证图上任意点局部形状不变形，因此面积也不变形。", false, "等角与等积不可兼得：墨卡托保角但高纬面积严重夸大。"],
  ["Web 墨卡托（EPSG:3857）是等角投影。", true, "Web 墨卡托保持局部角度（罗盘方向正确），代价是面积随纬度夸大。"],
  ["EPSG:4326 的坐标单位是米。", false, "4326 是地理坐标系，单位度；米制单位属于投影坐标系（如 3857、32650）。"],
  ["同一地点在 WGS84 和 CGCS2000 下的经纬度数值几乎相同（差异厘米~分米级）。", true, "两系统椭球与实现非常接近，普通应用可混用；高精度测量需考虑实现差异。"],
  ["基准面（Datum）定义了椭球与地球的贴合方式，是坐标系的「地基」。", true, "基准面决定椭球参数与定位，同一投影配不同基准面结果完全不同。"],
  ["UTM 投影把全球分成 60 个 6° 经度带。", true, "360°/6° = 60 带，从西经 180° 起编，带号 1~60。"],
  ["UTM 每带中央经线的比例因子是 0.9996。", true, "0.9996 把带内变形分摊到两侧，中央经线略缩短、带边缘略拉长。"],
  ["高斯-克吕格 3°带的带号 n 与中央经线关系为 L0 = 3n。", true, "3°带从东经 1.5° 起，中央经线为 3° 的整数倍。"],
  ["我国 1:50000 及更小比例尺地形图传统上采用 6° 分带高斯-克吕格投影。", true, "6° 带用于中小比例尺，3° 带用于大比例尺（如 1:10000）。"],
  ["高斯-克吕格投影是横轴等角切椭圆柱投影。", true, "中央经线与椭圆柱相切、长度比为 1，等角且中央经线无变形。"],
  ["EPSG:3857 与 EPSG:4326 的主要区别是 3857 用米制平面坐标。", true, "3857 是 Web 墨卡托投影坐标系（米），4326 是 WGS84 地理坐标（度）。"],
  ["墨卡托投影下，格陵兰岛的图上面积看起来接近非洲，但实际面积仅约非洲的 1/14。", true, "高纬度面积夸大是墨卡托的著名缺陷，约为 1/14 是两者真实比例。"],
  ["纬度越高，UTM 带的宽度（实地）越窄。", true, "经差固定 6°，纬线越靠近极点越短，带的实地宽度随之收窄。"],
  ["横轴墨卡托投影下，中央经线上没有任何投影变形。", true, "高斯-克吕格中央经线长度比恒为 1（UTM 为 0.9996，人为缩放）。"],
  ["一个 EPSG 代码唯一对应一套完整的坐标参考系定义。", true, "EPSG 数据集为每个 CRS（含基准、投影方法、参数、单位、轴序）分配唯一整数代码。"],
  ["GCJ-02 是国家标准公开算法的加密坐标，可以与国际坐标系精确互转。", false, "GCJ-02（火星坐标）是非线性偏移，无官方公开逆算法，只能近似纠正。"],
  ["地理坐标系的轴序在不同标准下可能不同，读数据前必须确认。", true, "EPSG:4326 官方轴序为纬度在前，GeoJSON/CRS:84 则经度在前，混用会经纬互换。"],
  ["高程（垂直基准）与水平基准是两套独立体系。", true, "1985 国家高程基准等垂直基准独立定义，三维位置 = 水平 CRS + 高程基准。"],
  ["投影坐标系下量算面积/长度可直接用坐标差计算，无需考虑投影性质。", false, "等角投影面积失真、等积投影长度失真，量算要选对投影（等积测面积、等距测长度）或用测地线算法。"],
  ["WKT（Well-Known Text）是一种文本方式表达坐标参考系与几何的标准。", true, "WKT CRS（如 GEOGCS[...]）与 WKT 几何是 OGC 标准的文本编码。"],
  ["PROJ 是处理坐标变换的开源库，GDAL/PostGIS 底层都依赖它。", true, "PROJ 负责基准与投影数学，GDAL、PostGIS、QGIS 均通过它做坐标变换。"],
  ["Web 地图底图常用 EPSG:3857，是因为它保角且全球范围内面积无变形。", false, "3857 保角但面积夸大；选它主要因为瓦片方案简单、全球矩形平铺、局部形状正确。"],
  ["经纬度小数点后 5 位（约 1 m 级）已能满足多数城市应用。", true, "1° 纬度≈111 km，小数 5 位分辨率≈1.1 m；位数越多并不代表数据越准。"],
  ["本初子午线过去因国家而异，1884 年国际会议确定以格林尼治为 0°。", true, "1884 年华盛顿国际子午线会议确立格林尼治为本初子午线。"],
  ["假东（False Easting）是为了让带内坐标全为正值而人为加上的偏移量。", true, "高斯-克吕格把中央经线东移 500 km（假东 500000 m），避免负坐标。"],
  ["在 WGS84 与 GCJ-02 之间用简单线性平移即可精确转换。", false, "GCJ-02 偏移随位置非线性变化，只能查表/近似算法拟合，精度有限。"],
  ["全球范围内，一幅 3857 底图可以完整显示南北极点。", false, "Web 墨卡托纬度被截断在约 ±85.05°，极点无法表示。"],
];

const EPSG: [string, string, string][] = [
  ["4326", "WGS84 地理坐标系（经纬度，度）", "WGS84 的二维地理坐标系，GPS 与全球数据交换的事实标准。"],
  ["3857", "Web Mercator 投影坐标系（米）", "Google/OSM 等网络地图的瓦片投影，保角、米制。"],
  ["4490", "CGCS2000 国家大地坐标系", "我国当前法定的地心大地坐标系。"],
  ["4269", "NAD83 地理坐标系", "北美广泛使用的基准面，与 WGS84 实现接近。"],
  ["4326", "WGS84", "4326 = WGS84 地理坐标，基本常识。"],
  ["32650", "WGS84 / UTM 50N 投影坐标系", "EPSG:326xx 系列为 WGS84 北半球 UTM 各带。"],
  ["32760", "WGS84 / UTM 60S 投影坐标系", "EPSG:327xx 系列为 WGS84 南半球 UTM 各带。"],
  ["3857", "Web Mercator", "3857 曾误称 900913（google 的写法），现官方代码为 3857。"],
  ["4479", "CGCS2000 地心直角坐标系（XYZ）", "4479 是 CGCS2000 的地心笛卡尔坐标实现，用于高精度空间直角计算。"],
  ["4214", "1954 北京坐标系（Beijing 1954）", "我国曾长期使用的参心坐标系，正在被 CGCS2000 取代。"],
  ["4326", "EPSG:4326（WGS84）", "经纬度 + WGS84 = 4326，出题率最高的一组。"],
  ["4610", "1980 西安坐标系（Xian 1980）", "1980 西安坐标系是 CGCS2000 之前的法定参心坐标系。"],
];

const SINGLES: { stem: string; opts: Opt[]; ans: string; exp: string; refs: Ref[] }[] = [
  { stem: "要为全国范围做「面积统计」专题图，应优先选择哪种性质的投影？", ans: "C",
    opts: [
      { key: "A", text: "等角投影（如墨卡托）", hint: "等角保形状不保面积，面积统计会失真。" },
      { key: "B", text: "任意投影都一样", hint: "不同投影的面积变形差异巨大。" },
      { key: "C", text: "等积投影（如 Albers）" },
      { key: "D", text: "地理坐标系直接算", hint: "经纬度不是长度单位，直接算面积无意义。" },
    ],
    exp: "面积统计选等积投影（如 Albers 等积圆锥、兰伯特等积方位）；等角投影用于导航/形状，等距投影用于距离。",
    refs: [REF.epsg4326, REF.mercator] },
  { stem: "纬度 60° 处，经度 1° 的实地长度约为赤道处的多少？", ans: "B",
    opts: [
      { key: "A", text: "一半", hint: "那是纬度 30° 的比例。" },
      { key: "B", text: "0.5 倍（即 cos60°）" },
      { key: "C", text: "2 倍", hint: "方向反了。" },
      { key: "D", text: "一样长", hint: "纬线向两极收敛变短。" },
    ],
    exp: "纬线长与纬度余弦成正比：cos60° = 0.5，故 60° 处经度 1° 的长度是赤道的一半（约 55.66 km）。",
    refs: [REF.epsg4326] },
  { stem: "下列哪组坐标最可能把经纬度顺序写反（本意是北京 39.9°N, 116.4°E）？", ans: "A",
    opts: [
      { key: "A", text: "116.4, 39.9（轴序按 lat,lon 解读时）" },
      { key: "B", text: "39.9, 116.4", hint: "这是 GeoJSON 的 lon,lat？注意本题问「写反」的形态。" },
      { key: "C", text: "39.9N 116.4E", hint: "带 N/E 标注无歧义。" },
      { key: "D", text: "39°54′N, 116°24′E", hint: "度分秒 + 方位标注无歧义。" },
    ],
    exp: "「116.4, 39.9」若是 lon,lat 是正确的；但若系统按 EPSG:4326 官方轴序（lat 先）解读就成了「北纬 116°」的非法值。轴序歧义是坐标交换的头号坑。",
    refs: [REF.epsg4326, REF.geojson] },
  { stem: "UTM 坐标 (500000, 0) 位于其投影带的什么位置？", ans: "C",
    opts: [
      { key: "A", text: "带的西边界", hint: "西边界约为 166021 m。" },
      { key: "B", text: "带的东边界", hint: "东边界约为 833979 m。" },
      { key: "C", text: "中央经线上（赤道处）" },
      { key: "D", text: "北极点", hint: "北向坐标 0 是赤道，不是极点。" },
    ],
    exp: "假东 500000 m 对应中央经线；northing=0 为赤道（北半球带）。两者组合即带中央与赤道的交点。",
    refs: [REF.utm] },
  { stem: "把全国数据统一到 EPSG:4326 后直接计算省界面积，主要问题是什么？", ans: "B",
    opts: [
      { key: "A", text: "数据量变大", hint: "与单位无关。" },
      { key: "B", text: "经纬度是角度，长度/面积计算结果无物理意义" },
      { key: "C", text: "无法显示", hint: "显示完全没问题。" },
      { key: "D", text: "精度必然提高", hint: "与精度无关，是量纲错误。" },
    ],
    exp: "4326 单位是度，「平方度」对应的实地面积随纬度剧烈变化。正确做法：投影到等积系（如 Albers）或用测地线面积。",
    refs: [REF.epsg4326] },
  { stem: "下列关于 GCJ-02 的说法，正确的是？", ans: "C",
    opts: [
      { key: "A", text: "GCJ-02 就是 WGS84 的别名", hint: "两者存在系统性偏移。" },
      { key: "B", text: "GCJ-02 是百度私有的坐标体系", hint: "百度在 GCJ-02 之上再加密成 BD-09。" },
      { key: "C", text: "GCJ-02 是对 WGS84 施加非线性偏移的加密坐标" },
      { key: "D", text: "GCJ-02 只影响高程", hint: "偏移作用于水平位置。" },
    ],
    exp: "GCJ-02（火星坐标）对 WGS84 做与位置相关的非线性偏移；高德/腾讯系地图使用。与 WGS84 数据混用会偏移数百米。",
    refs: [REF.gisWiki] },
  { stem: "某测绘成果标注「1985 国家高程基准」，它描述的是？", ans: "B",
    opts: [
      { key: "A", text: "水平坐标基准", hint: "水平基准定义平面位置。" },
      { key: "B", text: "垂直基准（高程起算面）" },
      { key: "C", text: "投影方法", hint: "投影与高程基准无关。" },
      { key: "D", text: "时间基准", hint: "与时间无关。" },
    ],
    exp: "1985 国家高程基准以青岛验潮站平均海水面为高程零点，属于垂直基准，与水平 CRS（CGCS2000 等）独立定义。",
    refs: [REF.epsg4490] },
  { stem: "关于 EPSG:3857 与 EPSG:4326 互转，正确的是？", ans: "A",
    opts: [
      { key: "A", text: "两者之间是纯数学投影变换，可无损往返（忽略浮点误差）" },
      { key: "B", text: "转换必须联网查 EPSG 官网", hint: "PROJ 本地即可完成。" },
      { key: "C", text: "两者基准面不同，转换必然损失精度", hint: "同为 WGS84 基准，只是投影不同。" },
      { key: "D", text: "无法互相转换", hint: "完全可转。" },
    ],
    exp: "4326 与 3857 共享 WGS84 基准，只是投影不同：墨卡托正反解即可互转，PROJ/前端库一行搞定。",
    refs: [REF.epsg3857, REF.epsg4326] },
  { stem: "在高斯-克吕格 3°带中，东经 120° 所在带的中央经线是？", ans: "C",
    opts: [
      { key: "A", text: "117°", hint: "那是 117° 带的中央经线。" },
      { key: "B", text: "123°", hint: "那是 41 带的中央经线。" },
      { key: "C", text: "120°" },
      { key: "D", text: "126°", hint: "偏了两个带。" },
    ],
    exp: "3°带中央经线为 3° 整数倍：120/3 = 40 带，中央经线恰为 120°。东经 120° 正好位于 40 带中央。",
    refs: [REF.gaussKruger] },
  { stem: "某地 UTM 坐标为 Zone 47，对应经度范围是？", ans: "C",
    opts: [
      { key: "A", text: "102°E ~ 108°E", hint: "那是 Zone 48。" },
      { key: "B", text: "114°E ~ 120°E", hint: "那是 Zone 50。" },
      { key: "C", text: "96°E ~ 102°E" },
      { key: "D", text: "90°E ~ 96°E", hint: "那是 Zone 46。" },
    ],
    exp: "UTM Zone n 覆盖经度 [6n−186, 6n−180)：Zone 47 → [96°E, 102°E)。北京 116.4°E 则属于 Zone 50。",
    refs: [REF.utm] },
  { stem: "下列哪种情况最需要「测地线（Geodesic）」计算而不是平面公式？", ans: "D",
    opts: [
      { key: "A", text: "小范围（<1 km）平面距离", hint: "小范围平面近似误差可忽略。" },
      { key: "B", text: "城市内部缓冲区", hint: "城市尺度投影后误差可控。" },
      { key: "C", text: "同一投影带内的长度量算", hint: "带内长度比接近 1。" },
      { key: "D", text: "跨越大洋的长距离航线计算" },
    ],
    exp: "长距离、大范围的距离/方位必须按椭球测地线（Vincenty、Karney 算法）计算；平面公式只在局部投影内近似成立。",
    refs: [REF.greatCircle, REF.epsg4326] },
  { stem: "关于「北方向」，下列说法正确的是？", ans: "C",
    opts: [
      { key: "A", text: "真北、磁北、坐标北三者永远一致", hint: "磁偏角与子午线收敛角使三者常不重合。" },
      { key: "B", text: "坐标北就是磁北", hint: "磁北随地磁场变化。" },
      { key: "C", text: "投影后除中央经线外，网格北与真北存在子午线收敛角偏差" },
      { key: "D", text: "磁偏角全球恒定", hint: "磁偏角随位置与时间变化。" },
    ],
    exp: "真北（子午线）、磁北（地磁）、坐标北（格网）三北关系由磁偏角与子午线收敛角描述，工程测量需系统纠正。",
    refs: [REF.gaussKruger] },
  { stem: "把北京 (116.4°E) 的数据错误地用 UTM Zone 50（中央经线 117°）读成 Zone 50 正确吗？", ans: "A",
    opts: [
      { key: "A", text: "正确：116.4°E 落在 [114°, 120°)，即 Zone 50" },
      { key: "B", text: "错误：116.4°E 属于 Zone 47", hint: "Zone 47 是 [96°,102°)。" },
      { key: "C", text: "错误：UTM 不覆盖东经", hint: "UTM 覆盖全球除两极。" },
      { key: "D", text: "错误：应使用 Zone 49", hint: "49 带是 [108°,114°)。" },
    ],
    exp: "UTM Zone n 覆盖 [6n-186, 6n-180)。n=50 → [114°E, 120°E)，116.4°E 属于 Zone 50，选带正确。",
    refs: [REF.utm] },
  { stem: "下列关于坐标精度的说法，正确的是？", ans: "B",
    opts: [
      { key: "A", text: "经纬度小数位数越多，定位越准确", hint: "小数位是表示分辨率，不是精度。" },
      { key: "B", text: "小数位应与数据实际精度匹配，盲目加位数无意义" },
      { key: "C", text: "写成整数度即可满足任何应用", hint: "1°≈111 km，多数应用远远不够。" },
      { key: "D", text: "精度只取决于存储格式", hint: "取决于采集手段与后处理。" },
    ],
    exp: "度的小数位 ≈ 分辨率：4 位≈11 m，5 位≈1.1 m，6 位≈0.11 m。表示位数超过数据实际精度只会制造虚假精度。",
    refs: [REF.epsg4326] },
  { stem: "某国外瓦片服务只支持 EPSG:4326，而你的底图是 3857，前端叠加会怎样？", ans: "C",
    opts: [
      { key: "A", text: "完全正常叠加", hint: "不同投影的瓦片网格不重合。" },
      { key: "B", text: "只是颜色不同", hint: "与颜色无关。" },
      { key: "C", text: "瓦片网格与坐标对不上，影像错位或无法对齐" },
      { key: "D", text: "自动无缝重投影", hint: "除非客户端/服务端显式重投影。" },
    ],
    exp: "3857 与 4326 的瓦片金字塔划分完全不同（方格 vs 矩形格、层级分辨率不同），叠加必须统一投影或用支持重投影的客户端。",
    refs: [REF.epsg3857, REF.tilenames] },
  { stem: "我国法定推行的地心坐标系是？", ans: "B",
    opts: [
      { key: "A", text: "Beijing 1954", hint: "参心老坐标系，已退出法定地位。" },
      { key: "B", text: "CGCS2000" },
      { key: "C", text: "NAD83", hint: "北美坐标系。" },
      { key: "D", text: "ED50", hint: "欧洲 1950 基准。" },
    ],
    exp: "CGCS2000（EPSG:4490）是我国自 2008 年起启用的地心大地坐标系，替代 1954 北京与 1980 西安坐标系。",
    refs: [REF.epsg4490] },
  { stem: "在 6° 带高斯-克吕格投影中，第 20 带的中央经线是？", ans: "C",
    opts: [
      { key: "A", text: "117°E", hint: "那是 20 带东边界的附近值？" },
      { key: "B", text: "120°E", hint: "120/6=20 但 6°带中央经线 = 6n-3。" },
      { key: "C", text: "117°E（6×20-3）" },
      { key: "D", text: "123°E", hint: "那是 21 带。" },
    ],
    exp: "6°带中央经线 L0 = 6n - 3 = 117°。注意与 3°带（L0 = 3n = 120°）区分。",
    refs: [REF.gaussKruger] },
  { stem: "关于 WKT 中的 PROJCS 与 GEOGCS，下列对应正确的是？", ans: "A",
    opts: [
      { key: "A", text: "PROJCS → 投影坐标系；GEOGCS → 地理坐标系" },
      { key: "B", text: "PROJCS → 地理坐标系；GEOGCS → 投影坐标系", hint: "反了。" },
      { key: "C", text: "两者都是投影坐标系", hint: "GEOGCS 是地理坐标。" },
      { key: "D", text: "两者都是地理坐标系", hint: "PROJCS 是投影坐标。" },
    ],
    exp: "WKT CRS 以 PROJCS[...] 开头的是投影坐标系（米制平面），GEOGCS[...] 开头的是地理坐标系（经纬度）。",
    refs: [REF.epsg4326] },
  { stem: "想把 3857 底图上的「面积」读数用于统计，正确做法是？", ans: "C",
    opts: [
      { key: "A", text: "直接使用，3857 是米制", hint: "米制≠等积，纬度越高面积夸大越严重。" },
      { key: "B", text: "乘以一个全局系数修正", hint: "夸大系数随纬度变化，无全局系数。" },
      { key: "C", text: "把几何重投影到等积坐标系（或用测地线面积）后再统计" },
      { key: "D", text: "换一个像素更大的屏幕", hint: "显示与数据无关。" },
    ],
    exp: "3857 的面积夸大约为 1/cos²φ（如 60° 处 4 倍）。统计面积必须用等积投影或椭球测地算法（PostGIS geography、GeographicLib）。",
    refs: [REF.epsg3857, REF.mercator] },
];

const MAPQ: [number, number][] = [
  [0, 0], [30, 90], [40, 116.4], [31.23, 121.47], [23.13, 113.26],
  [45, 126.53], [22.32, 114.17], [-33.92, 18.42], [35.68, 139.69], [51.51, -0.13],
];

export function gen02(count: number, r: () => number) {
  const out: object[] = [];

  // 1. UTM 带号（15）
  for (let i = 0; i < 15; i += 1) {
    const lon = rint(r, -179, 179);
    const zone = Math.floor((lon + 180) / 6) + 1;
    out.push(
      numeric("02", i % 3 === 0 ? 1 : 2,
        `经度 ${lon}° 所在的 UTM 投影带带号是多少？（1~60）`,
        zone, 0,
        `UTM 带号 = ⌊(经度 + 180) / 6⌋ + 1 = ⌊(${lon} + 180)/6⌋ + 1 = ${zone}。每带跨 6°，从西经 180° 起编号。`,
        [REF.utm]),
    );
  }

  // 2. UTM 中央经线（15）
  for (let i = 0; i < 15; i += 1) {
    const zone = rint(r, 1, 60);
    const cm = 6 * zone - 183;
    out.push(
      numeric("02", i % 3 === 0 ? 1 : 2,
        `UTM 第 ${zone} 带的中央经线经度是多少？`,
        cm, 0,
        `中央经线 = -183 + 6 × 带号 = -183 + 6 × ${zone} = ${cm}°。每带中央经线比例因子取 0.9996。`,
        [REF.utm], { unit: "°" }),
    );
  }

  // 3. 高斯-克吕格 6°带（12）
  for (let i = 0; i < 12; i += 1) {
    const zone = rint(r, 13, 23);
    const cm = 6 * zone - 3;
    out.push(
      numeric("02", i % 3 + 1,
        `高斯-克吕格 6° 投影带第 ${zone} 带的中央经线是多少度？`,
        cm, 0,
        `6°带中央经线 L0 = 6n − 3 = 6 × ${zone} − 3 = ${cm}°。与 UTM 不同，高斯-克吕格中央经线长度比为 1。`,
        [REF.gaussKruger], { unit: "°" }),
    );
  }

  // 4. 高斯-克吕格 3°带（13）
  for (let i = 0; i < 13; i += 1) {
    const lon = rint(r, 75, 135);
    const zone = Math.round(lon / 3);
    const cm = zone * 3;
    out.push(
      numeric("02", i % 3 + 1,
        `东经 ${lon}° 在高斯-克吕格 3° 分带中位于第几带？该带中央经线是多少度？（答中央经线度数）`,
        cm, 0,
        `3°带带号 n = round(经度/3) = ${zone}，中央经线 L0 = 3n = ${cm}°。3°带用于大比例尺测图。`,
        [REF.gaussKruger], { unit: "°" }),
    );
  }

  // 5. EPSG 常识（12 short）
  sample(r, EPSG, 12).forEach(([code, name, exp]) => {
    const tokens = name.replace(/[（）()]/g, " ").split(/\s+/).filter(Boolean);
    out.push(
      short("02", 2,
        `EPSG:${code} 代表什么坐标参考系？写出其通用名称（关键词即可）。`,
        [name, ...tokens].map((s) => s.toLowerCase()),
        `EPSG:${code} = ${name}。${exp}`,
        [REF.epsg4326, REF.epsg3857, REF.epsg4490], "如 WGS84 / Web Mercator"),
    );
  });

  // 6. EPSG 单选（8）：[代码, 正确项, 干扰项, 解析]
  const codeChoices: [string, string, string[], string][] = [
    ["4326", "WGS84 地理坐标系", ["Web Mercator 投影", "CGCS2000", "NAD83"], "4326 是 WGS84 地理坐标系；3857 才是 Web Mercator。"],
    ["3857", "Web Mercator 投影坐标系", ["WGS84 地理坐标系", "CGCS2000", "Beijing 1954"], "3857 = Web Mercator（米制），网络地图瓦片标准投影。"],
    ["4490", "CGCS2000", ["Beijing 1954", "Xian 1980", "NAD83"], "4490 = CGCS2000 国家大地坐标系。"],
    ["32650", "WGS84 / UTM 50N", ["WGS84 / UTM 50S", "CGCS2000 / 50N", "Web Mercator 50N"], "326xx 为 WGS84 北半球 UTM：32650 即 UTM 50N。"],
    ["4214", "Beijing 1954", ["CGCS2000", "WGS72", "Xian 1980"], "4214 = 1954 北京坐标系（参心）。"],
    ["32733", "WGS84 / UTM 33S", ["WGS84 / UTM 33N", "WGS72 / UTM 33S", "Web Mercator 33"], "327xx 为南半球：32733 = WGS84 UTM 33S。"],
    ["4610", "Xian 1980", ["Beijing 1954", "CGCS2000", "Tokyo Datum"], "4610 = 1980 西安坐标系。"],
    ["4269", "NAD83", ["NAD27", "WGS84", "ETRS89"], "4269 = NAD83（北美基准），与 WGS84 实现高度接近。"],
  ];
  codeChoices.forEach(([code, correctText, distractors, exp], i) => {
    const options: Opt[] = [correctText, ...distractors].map((text, j) => ({ key: String.fromCharCode(65 + j), text }));
    // 按种子轮换正确项位置，避免答案总是 A
    const rot = i % options.length;
    const arranged = options.slice(rot).concat(options.slice(0, rot));
    const ansKey = arranged.find((o) => o.text === correctText)!.key;
    out.push(
      single("02", i % 3 + 1,
        `EPSG:${code} 对应的是以下哪一个坐标参考系？`,
        arranged,
        ansKey,
        exp,
        [REF.epsg4326, REF.epsg3857, REF.epsg4490]),
    );
  });

  // 7. 单选池（19）
  SINGLES.forEach((s) => out.push(single("02", 2, s.stem, s.opts, s.ans, s.exp, s.refs)));

  // 8. 判断题（30）
  out.push(...tfBatch("02", TF, [REF.epsg4326, REF.utm, REF.mercator]));

  // 9. 地图题（10）
  MAPQ.forEach(([la, lo], i) => {
    out.push(
      map("02", i % 3 + 1,
        `在地图上点击「北纬 ${la}°、东经 ${lo}°」的交点位置。`,
        la, lo, 120,
        `该交点位于 (${la}°N, ${lo}°E)。经纬线交点是练习「轴序与方向感」的最直接方式。`,
        [REF.epsg4326]),
    );
  });

  return out.slice(0, count);
}
