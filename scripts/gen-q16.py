import json

SKILL = "gis"
MODULE = "16"

def q_single(i, diff, stem, options, answer_idx, explanation, refs=None):
    keys = ["A", "B", "C", "D"]
    return {
        "id": f"gis-16-{i:03d}", "skill": SKILL, "module": MODULE, "difficulty": diff,
        "stem": stem, "explanation": explanation, "refs": refs or [],
        "type": "single",
        "options": [{"key": keys[k], "text": t} for k, t in enumerate(options)],
        "answer": [keys[answer_idx]],
    }

def q_multi(i, diff, stem, options, answer_idxs, explanation, refs=None):
    keys = ["A", "B", "C", "D"]
    return {
        "id": f"gis-16-{i:03d}", "skill": SKILL, "module": MODULE, "difficulty": diff,
        "stem": stem, "explanation": explanation, "refs": refs or [],
        "type": "multi",
        "options": [{"key": keys[k], "text": t} for k, t in enumerate(options)],
        "answer": [keys[k] for k in answer_idxs],
    }

def q_tf(i, diff, stem, answer, explanation, refs=None):
    return {
        "id": f"gis-16-{i:03d}", "skill": SKILL, "module": MODULE, "difficulty": diff,
        "stem": stem, "explanation": explanation, "refs": refs or [],
        "type": "truefalse", "answer": answer,
    }

def q_short(i, diff, stem, accepted, explanation, refs=None):
    return {
        "id": f"gis-16-{i:03d}", "skill": SKILL, "module": MODULE, "difficulty": diff,
        "stem": stem, "explanation": explanation, "refs": refs or [],
        "type": "short", "accepted": accepted,
    }

questions = []
i = 0

REF_STARLINK = {"title": "Starlink 官网", "url": "https://www.starlink.com/"}
REF_ONEWEB = {"title": "Eutelsat OneWeb", "url": "https://www.eutelsat.com/"}
REF_ITU = {"title": "ITU（国际电信联盟）", "url": "https://www.itu.int/"}
REF_CELESTRAK = {"title": "CelesTrak 星历库", "url": "https://celestrak.org/"}
REF_NASA = {"title": "NASA", "url": "https://www.nasa.gov/"}
REF_HA = {"title": "Heavens-Above 过境预报", "url": "https://www.heavens-above.com/"}

def pick_refs(q):
    text = q["stem"] + q["explanation"]
    refs = []
    if any(k in text for k in ["Starlink", "SpaceX", "星链", "星间", "相控阵"]):
        refs.append(REF_STARLINK)
    if any(k in text for k in ["OneWeb", "Eutelsat"]):
        refs.append(REF_ONEWEB)
    if any(k in text for k in ["ITU", "频轨", "频率", "申报"]):
        refs.append(REF_ITU)
    if any(k in text for k in ["TLE", "CelesTrak", "NORAD"]):
        refs.append(REF_CELESTRAK)
    if any(k in text for k in ["NASA", "Landsat", "Sentinel"]):
        refs.append(REF_NASA)
    if any(k in text for k in ["过境预报", "Heavens-Above", "N2YO", "肉眼"]):
        refs.append(REF_HA)
    if not refs:
        refs.append(REF_CELESTRAK)
    return refs

def add(q):
    global i
    i += 1
    q["id"] = f"gis-{q["module"]}-{i:03d}"
    if not q["refs"]:
        q["refs"] = pick_refs(q)
    questions.append(q)

# ============ single（46 题）============
add(q_single(0, 1, "低轨星座存在的根本原因是？",
    ["单颗 LEO 过顶窗口只有几分钟，连续服务必须多星接力", "火箭运力过剩", "为了好看", "GEO 卫星太贵"], 0,
    "单星覆盖是「路过式」的；星座让任何时刻头顶至少一颗星。"))
add(q_single(0, 1, "Starlink 主力壳层的轨道高度约为？",
    ["420 km", "550 km", "1200 km", "20200 km"], 1,
    "Starlink 主力壳层约 550 km；OneWeb 约 1200 km。"))
add(q_single(0, 1, "Starlink 主力壳层的轨道倾角是？",
    ["0°", "51.6°", "53°", "87.9°"], 2,
    "53° 倾角重点覆盖中低纬度人口密集区；87.9° 近极轨是 OneWeb。"))
add(q_single(0, 1, "OneWeb 星座的轨道高度约为？",
    ["550 km", "780 km", "1200 km", "35786 km"], 2,
    "OneWeb 约 1200 km，比 Starlink 高，单星覆盖更大。"))
add(q_single(0, 2, "OneWeb 用约 648 颗就实现全球覆盖，而 Starlink 要数千颗，因为？",
    ["OneWeb 轨道更高，单星覆盖更大", "OneWeb 技术更先进", "Starlink 效率低", "Starlink 卫星更小所以更多"], 0,
    "高度换覆盖：1200 km 单星覆盖远大于 550 km，所需星数自然更少——代价是延迟略高。"))
add(q_single(0, 1, "Walker 星座的设计参数不包括？",
    ["高度", "倾角", "壳层数与每壳星数", "卫星颜色"], 3,
    "高度、倾角、星数（壳层×每壳）是设计三参数。"))
add(q_single(0, 2, "Starlink 新一代卫星之间的激光链路（星间链路）解决什么问题？",
    ["星与星在太空直接传数据，海洋荒漠上空也能落地回传", "给卫星充电", "防御攻击", "节省太阳能板"], 0,
    "星间激光链路让数据不依赖地面站接力，跨洋覆盖成为可能。"))
add(q_single(0, 1, "Starlink 用户端天线的大小和形态大约是？",
    ["一口大锅", "披萨盒大小的相控阵天线", "一根电视天线", "需要建铁塔"], 1,
    "平板相控阵天线，自动对准头顶的星。"))
add(q_single(0, 1, "NASA 的角色是？",
    ["科研机构，做科学任务与数据发布", "商业宽带运营商", "频率监管机构", "火箭回收公司"], 0,
    "NASA 是科研机构（Landsat 等）；商业星座由 SpaceX 等公司运营；频率协调归 ITU/FCC。"))
add(q_single(0, 1, "协调全球无线电频率与轨道位置申报的国际机构是？",
    ["NASA", "ITU（国际电信联盟）", "WTO", "ISO"], 1,
    "ITU 是联合国专门机构，频轨资源先到先得、申报有部署时限。"))
add(q_single(0, 1, "查询卫星可见过境预报最常用的免费网站是？",
    ["Heavens-Above", "淘宝", "Wikipedia", "App Store"], 0,
    "Heavens-Above / N2YO 输入经纬度即可列出可见过境。"))
add(q_single(0, 1, "中国「千帆星座（G60）」的规划规模约为？",
    ["66 颗", "648 颗", "约 1.5 万颗", "3 颗"], 2,
    "千帆由上海垣信主导，规划约 1.5 万颗，2024 年首批组网星发射。"))
add(q_single(0, 2, "星座「倾角 53°」的覆盖含义是？",
    ["南北纬 53° 以外覆盖骤减", "只能覆盖赤道", "覆盖全球每个角落", "只能覆盖南半球"], 0,
    "倾角定南北边界：53° 主壳层放弃极区，高纬度靠其他倾角壳层补。"))
add(q_single(0, 2, "星座设计里「星数」本质上决定什么？",
    ["重访间隔与总容量", "卫星颜色", "发射成本（仅成本）", "轨道形状"], 0,
    "星越多：同地重访越短、总容量越大。成本是结果不是设计目标。"))
add(q_single(0, 2, "OneWeb 用 87.9° 近极轨的得失是？",
    ["能服务高纬度，但中低纬容量密度不如低倾角星座", "完全没有缺点", "覆盖不了赤道", "延迟比 Starlink 更低"], 0,
    "近极轨覆盖高纬度；但中低纬人口密集区的容量密度靠低倾角才高。"))
add(q_single(0, 1, "ESA（欧洲航天局）运营的对地观测系列卫星叫？",
    ["Landsat", "Sentinel（哨兵）", "Starlink", "GOES"], 1,
    "Sentinel 是 ESA 哥白尼计划系列；Landsat 是 NASA/USGS；GOES 是 NOAA 气象卫星。"))
add(q_single(0, 1, "NOAA 负责的领域是？",
    ["气象卫星（如 GOES）与商业遥感许可", "载人登月", "火星车", "互联网星座"], 0,
    "NOAA 管气象海洋卫星，同时负责美国商业遥感许可。"))
add(q_single(0, 2, "「过顶窗口（pass window）」指的是？",
    ["卫星对地面某固定点可见的时间段", "卫星发射的时间窗口", "地面站的营业时间", "太阳直射卫星的时间"], 0,
    "LEO 过顶窗口约 5–10 分钟，是星座规模的底层驱动。"))
add(q_single(0, 2, "截至 2024 年，Starlink 在轨数量级是？",
    ["几十颗", "几百颗", "超过 6000 颗", "超过 100 万颗"], 2,
    "2024 年在轨超 6000 颗，占人类在轨卫星一半以上。"))
add(q_single(0, 2, "频轨资源「先到先得、逾期收回」的规则由谁执行？",
    ["ITU", "NASA", "联合国安理会", "各国自行决定"], 0,
    "ITU 申报协调机制：申报后有部署时限，逾期不部署收回——这是各星座抢发射的原因之一。"))
add(q_single(0, 2, "Starlink 多壳层设计（53°/70°/97.6°）的目的是？",
    ["不同倾角壳层覆盖不同纬度带，组合起来覆盖全球", "备份冗余", "试验不同技术", "节省燃料"], 0,
    "倾角决定纬度覆盖：53° 管中低纬，70°/97.6° 补高纬与极区。"))
add(q_single(0, 1, "想拿到 Starlink 卫星的轨道数据自己画轨迹，应该去？",
    ["CelesTrak 下载 TLE", "SpaceX 官网商城", "拨打客服电话", "App Store"], 0,
    "CelesTrak 公开发布包括 Starlink 在内的在轨物体 TLE。"))
add(q_single(0, 2, "星间激光链路出现之前，LEO 互联网星座在海洋上空的瓶颈是？",
    ["没有地面站可落地，数据传不回去", "海水反射信号", "鱼群干扰", "卫星会掉进海里"], 0,
    "早期星只能与地面站通信，海洋上空无站可用；星间链路解决了这个问题。"))
add(q_single(0, 2, "OneWeb 的目标用户定位是？",
    ["企业与运营商回传", "个人家庭宽带为主", "军用专用", "广播电台"], 0,
    "OneWeb 主打企业/运营商市场；Starlink 主打个人家庭终端。"))
add(q_single(0, 1, "GW（国网星座）的主导方是？",
    ["中国星网", "SpaceX", "中国移动", "中科院"], 0,
    "GW 由中国卫星网络集团（中国星网）主导，规划约 1.3 万颗。"))
add(q_single(0, 2, "卫星星座对 GIS 可视化的意义是？",
    ["数千颗星的大规模轨迹是经典的地图可视化练手数据", "与 GIS 完全无关", "只能做 3D 游戏", "可以提高地图分辨率"], 0,
    "TLE + 地图投影 + 轨迹渲染，是 GIS 开发者的标准练习。"))
add(q_single(0, 2, "判断某星座能否服务北极地区，看哪个参数最直接？",
    ["倾角", "卫星质量", "发射年份", "火箭型号"], 0,
    "倾角必须接近 90° 才有极区覆盖（如 OneWeb 87.9°、Starlink 97.6° 壳层）。"))
add(q_single(0, 1, "肉眼观看 ISS 过境时，它看起来是？",
    ["一颗不慢不快移动的亮星", "一道闪电", "静止的亮点", "红色的流星"], 0,
    "ISS 亮度高、移动均匀，晴夜肉眼可见。"))
add(q_single(0, 2, "星座里「同一轨道面均匀放 M 颗星」的好处是？",
    ["同一地面轨迹上卫星均匀接力，覆盖更平滑", "节省火箭", "防止卫星相撞（仅此目的）", "方便命名"], 0,
    "均匀相位分布让同面卫星前后等距接力。"))
add(q_single(0, 2, "LEO 星座相比 GEO 做宽带的核心优势是？",
    ["延迟低一个量级以上，接近地面光纤体验", "覆盖更大", "不需要用户天线", "永不掉线"], 0,
    "GEO 往返近半秒，LEO 几十毫秒级，宽带体验差距本质在延迟。"))
add(q_single(0, 2, "LEO 星座相比 GEO 的代价是？",
    ["需要成千上万颗卫星组网", "完全无法通信", "只能在夜间工作", "信号更强"], 0,
    "单星覆盖小、过顶快，数量是连续覆盖的硬门槛。"))
add(q_single(0, 1, "历史上最早的低轨通信星座代表（66 颗、780 km）是？",
    ["铱星（Iridium）", "GPS", "哈勃", "北斗"], 0,
    "铱星 66 颗 780 km 近极轨，1990 年代末商用卫星电话先驱。"))
add(q_single(0, 2, "Starlink 终端「自动对准」依赖的天线技术是？",
    ["相控阵（电子扫描）", "机械转动的抛物面锅", "八木天线", "鞭状天线"], 0,
    "相控阵电子扫描无需机械转动即可跟踪快速移动的卫星。"))
add(q_single(0, 2, "星座总容量的提升手段不包括？",
    ["增加星数", "多波束频率复用", "星间链路组网", "把卫星涂成黑色"], 3,
    "前三项是真实手段；涂装颜色与容量无关。"))
add(q_single(0, 2, "关于星座与地面 5G 的关系，正确的是？",
    ["互补：星座覆盖海洋荒漠，5G 覆盖城市", "星座会取代 5G", "5G 会取代星座", "两者频率完全相同"], 0,
    "星座单波束容量有限，城市密度场景不如 5G；广覆盖无人区是星座主场。"))
add(q_single(0, 1, "「千帆星座」2024 年的里程碑是？",
    ["首批组网星发射", "完成全部 1.5 万颗部署", "登陆火星", "实现 6G"], 0,
    "2024 年千帆首批组网星发射入轨。"))
add(q_single(0, 2, "评估一个星座项目是否靠谱，最务实的看法是？",
    ["看已发射数量和部署节奏是否符合 ITU 时限", "看 PPT 精美程度", "看公司注册地", "看卫星名字好不好听"], 0,
    "ITU 部署时限是硬约束，部署节奏是项目健康度的直接指标。"))
add(q_single(0, 2, "从 GIS 角度，Starlink 公开 TLE 的价值是？",
    ["可做大规模（数千目标）轨迹可视化与分析", "可蹭网", "可控制卫星", "可预测天气"], 0,
    "大规模动态地理数据 + 地图渲染，是 WebGIS 的性能与可视化双重练手。"))
add(q_single(0, 2, "星座的「壳层（shell）」指？",
    ["同一高度/倾角的一组轨道面集合", "卫星外壳材料", "大气层", "火箭整流罩"], 0,
    "一个壳层 = 同一高度与倾角下的若干轨道面；多壳层组合出完整覆盖。"))
add(q_single(0, 1, "Sentinel 系列卫星数据的获取成本是？",
    ["全免费", "每景上万元", "仅限欧盟公民", "需 NASA 审批"], 0,
    "ESA 哥白尼计划 Sentinel 数据全球免费。"))
add(q_single(0, 2, "为什么 Starlink 用户终端在城市里的体验不如 5G？",
    ["单波束覆盖区内用户共享有限容量，城市密度太高", "城市电磁环境干扰卫星", "高楼会挡住所有卫星", "终端在城市违法"], 0,
    "卫星单波束容量摊给整个覆盖区，人口越密人均越低——城市是地面网的主场。"))
add(q_single(0, 2, "星座对天文观测的争议主要是？",
    ["大量低轨卫星在夜空中留下光痕，干扰天文摄影与观测", "卫星会撞月球", "星座吸收星光", "地面站太吵"], 0,
    "星链反光条问题是天文界的公开争议，SpaceX 后续采取了减光措施。"))
add(q_single(0, 2, "NORAD 编号 25544 对应哪个物体？",
    ["ISS（国际空间站）", "哈勃望远镜", "第一颗人造卫星", "月球"], 0,
    "ISS 的 NORAD 编号 25544 是最常用的 TLE 示例。"))
add(q_single(0, 2, "一颗 LEO 通信星从地平线升起到落下，用户要连续上网需要？",
    ["终端切换到下一颗星（接力）", "等这颗星绕回来", "用户自己移动", "暂停使用 90 分钟"], 0,
    "星座 + 终端自动切换，前星落、后星起，无缝接力。"))
add(q_single(0, 1, "下列哪个不是星座设计参数？",
    ["高度", "倾角", "星数", "卫星油漆颜色"], 3,
    "高度/倾角/星数三参数决定覆盖与容量。"))
add(q_single(0, 2, "对「偏远海岛宽带」场景，最合适的方案是？",
    ["LEO 星座（如 Starlink）", "5G 宏站", "光纤到岛（若可行则成本极高时的备选）", "短波电台"], 0,
    "无人区/海岛是星座的主场：无需地面基础设施。"))
add(q_single(0, 2, "「SpaceX 之外做低轨星座的欧洲公司」是？",
    ["Eutelsat OneWeb", "空中客车防务（造星但不运营宽带星座）", "诺基亚", "沃达丰"], 0,
    "OneWeb 已并入 Eutelsat，是欧洲低轨星座代表。"))

# ============ truefalse（30 题）============
tfs16 = [
    (1, "单颗 LEO 卫星可以为地面固定点提供 24 小时连续通信。", False, "过顶窗口仅 5–10 分钟，连续服务靠星座接力。"),
    (1, "Starlink 主力壳层倾角为 53°。", True, "53° 倾角覆盖中低纬度人口密集区。"),
    (1, "OneWeb 的轨道高度比 Starlink 低。", False, "OneWeb 约 1200 km，高于 Starlink 的约 550 km。"),
    (1, "星座中卫星越多，同一地点的重访间隔越短。", True, "星数直接决定接力密度。"),
    (1, "星间激光链路让卫星数据可以不依赖海洋上空的地面站。", True, "星间链路在太空接力回传，解决无地面站区域落地问题。"),
    (1, "NASA 是 Starlink 的运营方。", False, "Starlink 由 SpaceX 运营；NASA 是科研机构。"),
    (1, "ITU 负责协调全球频率与轨道位置的申报。", True, "频轨资源先到先得、申报有部署时限。"),
    (1, "53° 倾角的星座可以很好地覆盖北极。", False, "倾角定南北边界，极区需要接近 90° 的倾角壳层。"),
    (1, "Walker 星座所有轨道面倾角相同、沿赤道均匀分布。", True, "Walker 星座：N 个等倾角轨道面 × 每面 M 颗星。"),
    (1, "OneWeb 主打个人家庭宽带市场。", False, "OneWeb 主打企业与运营商回传；Starlink 主打个人家庭。"),
    (1, "CelesTrak 发布的 TLE 数据是收费的。", False, "TLE 公开发布，免费（Space-Track 需免费注册）。"),
    (1, "千帆星座规划规模约 1.5 万颗。", True, "千帆（G60）规划约 1.5 万颗，2024 年首批发射。"),
    (1, "星座可以完全取代地面 5G 网络。", False, "城市高密度场景单波束容量不足，星座与地面网互补。"),
    (1, "星间链路出现前，LEO 星座在海洋上空无法回传用户数据。", True, "早期星只能直连地面站，海洋上空无站可用。"),
    (1, "Sentinel 系列卫星数据全球免费。", True, "ESA 哥白尼计划数据开放免费。"),
    (2, "轨道越高，覆盖全球连续服务所需的卫星数量越少。", True, "高度换覆盖：GEO 三颗组网，LEO 需要成千上万。"),
    (1, "Starlink 用户终端是机械转动的抛物面大锅。", False, "是披萨盒大小的相控阵平板天线，电子扫描对准。"),
    (1, "GW 星座由中国星网主导。", True, "GW（国网）规划约 1.3 万颗，国家级低轨工程。"),
    (1, "Heavens-Above 可以查询 ISS 可见过境时间。", True, "输入经纬度即可列出未来可见过境。"),
    (1, "星座里的卫星在同一轨道面上均匀分布。", True, "均匀相位让接力平滑。"),
    (2, "LEO 星座的宽带延迟体验接近地面光纤。", True, "几十毫秒级，远低于 GEO 的近半秒。"),
    (1, "铱星是 GEO 星座。", False, "铱星是 66 颗 780 km 的 LEO 近极轨星座。"),
    (1, "多波束天线可以提升星座总容量。", True, "点波束频率复用，总容量成倍提升。"),
    (1, "任何星座都能自然覆盖极区。", False, "只有近极轨（倾角近 90°）壳层能覆盖极区。"),
    (1, "Starlink 占人类在轨卫星数量的一半以上（截至 2024 年）。", True, "2024 年在轨超 6000 颗，超过其他所有卫星总和。"),
    (1, "NOAA 既运营气象卫星也管商业遥感许可。", True, "GOES 系列归 NOAA，商业遥感许可也归其管理。"),
    (2, "频轨资源申报后可以无限期占而不用。", False, "ITU 有部署时限，逾期不部署会被收回。"),
    (1, "ESA 是商业宽带运营商。", False, "ESA 是欧洲航天局，科研机构，Sentinel 系列运营方之一。"),
    (2, "星座越大，对天文观测的影响越受关注。", True, "低轨卫星夜空的反光痕是天文界的公开争议。"),
    (1, "Starlink 的 TLE 数据不公开。", False, "CelesTrak 公开发布包括 Starlink 在内的 TLE。"),
]
for (d, stem, ans, exp) in tfs16:
    add(q_tf(0, d, stem, ans, exp))

# ============ multi（15 题）============
add(q_multi(0, 2, "低轨星座「连续覆盖」的条件包括？",
    ["任何地点任何时刻头顶至少一颗星", "足够多的卫星数量", "合适的倾角覆盖目标纬度", "卫星全部停在天上不动"], [0, 1, 2],
    "卫星不可能停住（除非 GEO），D 错。"))
add(q_multi(0, 2, "Starlink 的架构特点包括？",
    ["主力壳层约 550 km / 53°", "多壳层补高纬度", "新一代带星间激光链路", "用 GEO 卫星做骨干"], [0, 1, 2],
    "Starlink 是纯 LEO 星座，D 错。"))
add(q_multi(0, 2, "OneWeb 与 Starlink 的差异包括？",
    ["OneWeb 更高（约 1200 km）", "OneWeb 近极轨（87.9°）", "OneWeb 星数更少（约 648）", "OneWeb 主打个人家庭市场"], [0, 1, 2],
    "OneWeb 主打企业/运营商，D 错。"))
add(q_multi(0, 1, "下列机构分工正确的有？",
    ["NASA——科研与 Landsat", "ESA——Sentinel 系列", "NOAA——气象卫星与遥感许可", "ITU——制造火箭"], [0, 1, 2],
    "ITU 协调频轨资源，不造火箭，D 错。"))
add(q_multi(0, 2, "Walker 星座的设计参数有？",
    ["高度", "倾角", "壳层数 × 每壳星数", "卫星涂装"], [0, 1, 2],
    "三参数定覆盖与容量，涂装无关。"))
add(q_multi(0, 2, "星座相比单颗 GEO 做宽带的优势有？",
    ["延迟低一个量级以上", "终端可以小型化", "极区也能覆盖（近极轨壳层）", "完全不需要发射成本"], [0, 1, 2],
    "成千上万颗的发射成本巨大，D 错。"))
add(q_multi(0, 2, "中国的低轨星座工程包括？",
    ["千帆星座（G60）", "GW（国网星座）", "北斗导航星座", "嫦娥探月工程"], [0, 1],
    "北斗是 MEO/GEO/IGSO 导航星座，嫦娥是探月工程，都不是低轨互联网星座。"))
add(q_multi(0, 2, "关于星间激光链路，正确的有？",
    ["星与星在太空直接传数据", "解决海洋/荒漠上空落地问题", "提升网络韧性", "可以给卫星充电"], [0, 1, 2],
    "激光链路传数据不传能量，D 错。"))
add(q_multi(0, 2, "想自己查卫星过境预报，可以？",
    ["CelesTrak 下载 TLE + SGP4 库自己算", "Heavens-Above 查可见过境", "N2YO 在线追踪", "给 NASA 写邮件"], [0, 1, 2],
    "公开数据源 + 在线工具足够，无需邮件，D 错。"))
add(q_multi(0, 2, "关于星座容量的正确说法有？",
    ["增加星数提升总容量", "多波束频率复用提升容量", "城市高密度区容量是瓶颈", "容量无限"], [0, 1, 2],
    "容量有限，城市密集区是短板，D 错。"))
add(q_multi(0, 1, "下列哪些是免费公开的卫星数据来源？",
    ["CelesTrak TLE", "NASA Earthdata（Landsat/MODIS）", "ESA Copernicus（Sentinel）", "商业公司付费专供"], [0, 1, 2],
    "前三项免费公开；D 是反例。"))
add(q_multi(0, 2, "Starlink 对社会的争议点包括？",
    ["夜空光痕干扰天文观测", "轨道拥挤与碰撞风险", "频轨资源占用", "完全没有争议"], [0, 1, 2],
    "光污染、轨道拥堵、频轨占用都是公开争议，D 错。"))
add(q_multi(0, 2, "从 GIS 视角能用星座数据做什么？",
    ["大规模轨迹可视化", "覆盖区分析", "过境预报地图", "控制卫星变轨"], [0, 1, 2],
    "TLE 只读不可控，D 错。"))
add(q_multi(0, 2, "评估星座项目健康度的务实指标有？",
    ["已发射数量", "部署节奏与 ITU 时限匹配度", "目标市场与参数匹配", "公司 logo 颜值"], [0, 1, 2],
    "logo 与工程无关，D 错。"))
add(q_multi(0, 1, "LEO 互联网星座适合的场景有？",
    ["偏远海岛宽带", "远洋船舶", "荒漠科考队", "千万级人口城市全域替代光纤"], [0, 1, 2],
    "城市高密度场景容量不足，无法替代光纤/5G，D 错。"))

# ============ short（30 题）============
shorts16 = [
    (1, "Starlink 主力壳层的轨道高度约多少公里？", ["550"], "约 550 km。"),
    (1, "Starlink 主力壳层的倾角是多少度？", ["53"], "53° 覆盖中低纬度。"),
    (1, "OneWeb 的轨道高度约多少公里？", ["1200"], "约 1200 km。"),
    (1, "OneWeb 的倾角约多少度？（一位小数）", ["87.9"], "87.9° 近极轨。"),
    (1, "OneWeb 设计星数约多少颗？", ["648"], "约 648 颗。"),
    (2, "LEO 单星对地面固定点的可见窗口叫什么？（四个字）", ["过顶窗口"], "pass window，约 5–10 分钟。"),
    (2, "「N 个轨道面 × 每面 M 颗星、同倾角」的星座构型叫什么星座？", ["Walker", "walker", "Walker 星座"], "Walker 星座是经典设计。"),
    (1, "协调全球频率与轨道位置的国际机构英文缩写是？", ["ITU", "itu"], "国际电信联盟。"),
    (1, "Starlink 的运营公司是？", ["SpaceX", "spacex"], "SpaceX。"),
    (2, "Starlink 新一代卫星之间在太空直接传数据的链路叫什么？（五个字）", ["星间链路", "星间激光链路", "激光链路"], "laser inter-satellite link。"),
    (1, "中国星网主导的低轨星座叫什么？（两个字母）", ["GW"], "GW（国网星座），规划约 1.3 万颗。"),
    (1, "上海垣信主导的星座叫？（两个字）", ["千帆"], "千帆星座（G60），规划约 1.5 万颗。"),
    (1, "美国负责气象卫星与商业遥感许可的机构缩写是？", ["NOAA", "noaa"], "美国国家海洋和大气管理局。"),
    (1, "ESA 运营的免费对地观测卫星系列叫？", ["Sentinel", "sentinel", "哨兵"], "Sentinel（哨兵）系列，哥白尼计划。"),
    (1, "查询 ISS 可见过境的经典免费网站叫？（英文）", ["Heavens-Above", "heavens-above", "HeavensAbove"], "Heavens-Above / N2YO。"),
    (2, "截至 2024 年，Starlink 在轨数量超过多少颗？（整千数）", ["6000"], "2024 年在轨超 6000 颗。"),
    (1, "历史上 66 颗 780 km 的低轨通信星座先驱叫？", ["铱星", "Iridium", "iridium"], "铱星（Iridium）。"),
    (1, "Landsat 系列卫星由哪两个美国机构合作？（写一个英文缩写即可）", ["NASA", "USGS"], "NASA/USGS 合作的陆地卫星系列。"),
    (2, "星座中「同一高度与倾角的轨道面集合」叫什么？（两个字）", ["壳层"], "shell，多壳层组合覆盖全球。"),
    (2, "Starlink 用户端的天线技术叫什么？（四个字）", ["相控阵"], "平板相控阵，电子扫描跟踪卫星。"),
    (1, "千帆星座首批组网星发射年份是？", ["2024"], "2024 年首批发射入轨。"),
    (2, "星座规模（星数）直接决定哪两个指标？（写一个即可）", ["重访", "容量", "重访间隔", "总容量"], "星数决定重访间隔与总容量。"),
    (2, "近极轨星座（如 OneWeb 87.9°）能覆盖 Starlink 53° 壳层覆盖不了的什么区域？", ["极区", "高纬度", "北极", "两极", "极地"], "倾角近 90° 才能覆盖极区。"),
    (1, "ISS 的 NORAD 编号是？（五位数字）", ["25544"], "25544 是最常用的 TLE 示例。"),
    (2, "星座卫星在夜空留下光痕引发的争议来自哪个领域？", ["天文", "天文观测", "天文学"], "天文观测界对低轨星座光污染的公开争议。"),
    (2, "频轨资源「申报后逾期不部署会怎样」？", ["收回", "被收回", "取消"], "ITU 部署时限机制：逾期收回。"),
    (1, "OneWeb 后来并入了哪家欧洲卫星公司？", ["Eutelsat", "eutelsat"], "Eutelsat OneWeb。"),
    (2, "城市高密度区用星座上网体验差的原因是单波束什么有限？", ["容量"], "单波束容量摊给整个覆盖区，人越多人均越低。"),
    (2, "Starlink 多壳层中补高纬度的壳层倾角约多少度？（写一个，一位小数）", ["97.6", "70"], "70° 与 97.6° 壳层补高纬与极区。"),
    (1, "肉眼可见的最亮人造天体过境对象通常是？（英文缩写）", ["ISS", "iss"], "ISS 亮度高，晴夜肉眼可见。"),
]
for (d, stem, acc, exp) in shorts16:
    add(q_short(0, d, stem, acc, exp))

data = {"skill": SKILL, "module": MODULE, "version": 1, "questions": questions}
out = "/workspace/learn-gis/content/gis/16-satellite-constellations.questions.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write("\n")
print(f"16 章题库：{len(questions)} 题")
from collections import Counter
print(Counter(q["type"] for q in questions))
