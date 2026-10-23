/** m00 地理数学：参数化生成 145 题（全部为可精确计算的计算题/地图题） */
import {
  numeric,
  short,
  map,
  pick,
  rint,
  round,
  sample,
  type Ref,
} from "./helpers";
import { REF, haversineKm } from "./geoutil";

const W = [111.19, 111.32];

/** 城市坐标库（纬度, 经度, 中文名） */
const CITIES: [number, number, string][] = [
  [39.9, 116.4, "北京"], [31.23, 121.47, "上海"], [23.13, 113.26, "广州"],
  [30.57, 104.07, "成都"], [34.34, 108.94, "西安"], [43.83, 87.62, "乌鲁木齐"],
  [29.65, 91.14, "拉萨"], [45.8, 126.53, "哈尔滨"], [24.88, 102.83, "昆明"],
  [30.59, 114.31, "武汉"], [40.71, -74.01, "纽约"], [51.51, -0.13, "伦敦"],
  [48.86, 2.35, "巴黎"], [35.68, 139.69, "东京"], [-33.87, 151.21, "悉尼"],
  [1.35, 103.82, "新加坡"], [55.76, 37.62, "莫斯科"], [30.04, 31.24, "开罗"],
  [-23.55, -46.63, "圣保罗"], [34.05, -118.24, "洛杉矶"], [25.2, 55.27, "迪拜"],
  [-1.29, 36.82, "内罗毕"], [64.15, -21.94, "雷克雅未克"], [-33.92, 18.42, "开普敦"],
  [19.08, 72.88, "孟买"], [22.32, 114.17, "香港"], [25.03, 121.57, "台北"],
  [37.57, 126.98, "首尔"], [13.76, 100.5, "曼谷"], [41.01, 28.98, "伊斯坦布尔"],
];

export function gen00(count: number, r: () => number) {
  const out: object[] = [];

  // 1. 纬度差 → 南北距离（25）
  const stems1 = [
    (a: number, b: number) => `同一子午线上，纬度从 ${a}°N 移动到 ${b}°N，南北方向实地相距约多少公里？（结果取整）`,
    (a: number, b: number) => `甲地位于 ${a}°N，乙地位于 ${b}°N，两地经度相同。沿经线方向两地相距约多少 km？（取整）`,
    (a: number, b: number) => `飞机沿 ${a}°N 到 ${b}°N 的同一条经线直飞，忽略地球扁率，飞行距离约多少公里？（取整）`,
  ];
  for (let i = 0; i < 25; i += 1) {
    const a = rint(r, -55, 55);
    const b = a + (r() < 0.5 ? 1 : -1) * rint(r, 1, 25);
    const d = Math.abs(a - b);
    const ans = round(d * 111.19, 0);
    out.push(
      numeric("00", i % 3 === 0 ? 1 : 2, pick(r, stems1)(Math.abs(Math.min(a, b)), Math.abs(Math.max(a, b))),
        ans, 3, `经线上纬度每差 1° 约 ${W[0]} km，纬度差 ${d}° → ${d} × ${W[0]} ≈ ${ans} km。`, [REF.epsg4326], { unit: "km" }),
    );
  }

  // 2. 纬线上的经度差 → 东西距离（30）
  const lats = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
  const stems2 = [
    (lat: number, d: number) => `在纬度 ${lat}° 的纬线上，经度相差 ${d}° 的两点沿纬线相距约多少公里？（保留 1 位小数）`,
    (lat: number, d: number) => `甲乙两点都在 ${lat}°N 纬线上，经度差 ${d}°。这两点沿纬线方向的实地距离约多少 km？（保留 1 位小数）`,
  ];
  for (let i = 0; i < 30; i += 1) {
    const lat = lats[i % lats.length]!;
    const d = rint(r, 1, 20);
    const one = 111.32 * Math.cos(lat * (Math.PI / 180));
    const ans = round(one * d, 1);
    out.push(
      numeric("00", i % 3 === 0 ? 1 : 2, pick(r, stems2)(lat, d), ans,
        Math.max(0.5, round(ans * 0.008, 1)),
        `纬线上经度 1° 的长度 = ${W[1]} × cos(纬度)。纬度 ${lat}° 处为 ${round(one, 2)} km，乘以 ${d}° ≈ ${ans} km。`,
        [REF.epsg4326, REF.greatCircle], { unit: "km" }),
    );
  }

  // 3. 大圆距离（25）
  const pairs = sample(r, CITIES, 25);
  pairs.forEach(([la1, lo1, c1], i) => {
    const [la2, lo2, c2] = CITIES[(CITIES.findIndex((c) => c[2] === c1) + rint(r, 1, CITIES.length - 1)) % CITIES.length]!;
    if (c1 === c2) return;
    const ans = round(haversineKm(la1, lo1, la2, lo2), 0);
    out.push(
      numeric("00", i % 3 + 1,
        `用球面大圆距离估算 ${c1}（${la1}°, ${lo1}°）到 ${c2}（${la2}°, ${lo2}°）的距离，取 R=6371 km，结果取整为多少公里？`,
        ans, Math.max(20, round(ans * 0.01, 0)),
        `按 haversine 公式（球面两点最短距离，R=6371 km）计算，${c1}—${c2} 约 ${ans} km。用经纬度直接套勾股定理会因经线收敛而失真。`,
        [REF.greatCircle, REF.epsg4326], { unit: "km" }),
    );
  });

  // 4. 度分秒 → 十进制度（20）
  for (let i = 0; i < 20; i += 1) {
    const d = rint(r, 0, 75);
    const m = rint(r, 0, 59);
    const s = rint(r, 0, 59);
    const ans = round(d + m / 60 + s / 3600, 5);
    out.push(
      numeric("00", i % 3 === 0 ? 1 : 2,
        `把 ${d}°${m}′${s}″ 转成十进制度（保留 5 位小数）。`,
        ans, 0.0005,
        `十进制度 = 度 + 分/60 + 秒/3600 = ${d} + ${m}/60 + ${s}/3600 = ${ans}°。GeoJSON 等格式要求十进制度，注意别把分秒当小数直接拼。`,
        [REF.dms], { unit: "°" }),
    );
  }

  // 5. 十进制度 → 度分秒（short，10）
  for (let i = 0; i < 10; i += 1) {
    const d = rint(r, 0, 75);
    const m = rint(r, 0, 59);
    const s = rint(r, 0, 59);
    const dec = round(d + m / 60 + s / 3600, 5);
    const fmt = (mark: string) => `${d}°${m}${mark[0]}${s}${mark[1]}`;
    out.push(
      short("00", i % 3 === 0 ? 1 : 2,
        `把 ${dec}° 转成度分秒，按「度°分′秒″」格式作答（秒取整）。`,
        [fmt("′″"), fmt("'\"")],
        `${dec}° = ${d}°${m}′${s}″：度取整数部分，小数部分 × 60 得分，再取小数 × 60 得秒。`,
        [REF.dms], "如 39°54′32″"),
    );
  }

  // 6. 比例尺换算（15）
  const scales = [5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
  for (let i = 0; i < 15; i += 1) {
    const sc = scales[i % scales.length]!;
    const cm = rint(r, 1, 10);
    const ans = round((cm * sc) / 100000, 2);
    out.push(
      numeric("00", i % 3 + 1,
        `1:${sc} 地形图上量得两地相距 ${cm} cm，实地相距多少公里？（保留 2 位小数）`,
        ans, Math.max(0.02, round(ans * 0.01, 2)),
        `图上 1 cm 代表实地 ${sc} cm。${cm} cm × ${sc} = ${cm * sc} cm = ${round((cm * sc) / 1000, 1)} m = ${ans} km。`,
        [REF.scale], { unit: "km" }),
    );
  }

  // 7. 栅格覆盖范围（10）
  const resList = [0.5, 1, 2, 5, 10, 30];
  for (let i = 0; i < 10; i += 1) {
    const res = resList[i % resList.length]!;
    const n = rint(r, 1000, 30000);
    const ans = round((res * n) / 1000, 2);
    out.push(
      numeric("00", i % 3 === 0 ? 1 : 2,
        `某影像像元分辨率为 ${res} m，横向共 ${n} 个像元，影像横向覆盖多少公里？（保留 2 位小数）`,
        ans, Math.max(0.02, round(ans * 0.01, 2)),
        `覆盖长度 = 像元大小 × 像元数 = ${res} m × ${n} = ${round(res * n, 0)} m = ${ans} km。`,
        [REF.gisWiki], { unit: "km" }),
    );
  }

  // 8. 地图题：城市定位（10）
  const spots = sample(r, CITIES.slice(0, 20), 10);
  spots.forEach(([la, lo, name], i) => {
    out.push(
      map("00", i % 3 + 1, `在地图上点击「${name}」的大致位置。`, la, lo, 220,
        `${name} 大致位于 ${la.toFixed(1)}°, ${lo.toFixed(1)}°（容差 ${220} km）。`,
        [REF.epsg4326]),
    );
  });

  return out.slice(0, count);
}
