/**
 * 课程视觉主题：每门课一套封面配色与几何图案。
 * 纯数据（被 scripts 引用也安全），SVG 渲染在 components/course/CourseCover.tsx。
 * 颜色为空格分隔的 HSL 三元组，使用时包 hsl(var(--x))，与 globals.css token 写法一致。
 */

export type CoursePattern =
  | "grid" // gis：经纬网格 + 定位点
  | "polygons" // turf：多边形 + 缓冲区同心圆
  | "globe" // cesium：经纬球 + 轨道线
  | "cube" // three：等距立方体 + 三角面
  | "hex"; // harmony：六边形蜂窝

export type CourseTheme = {
  pattern: CoursePattern;
  /** 亮色模式：封面渐变两端 */
  from: string;
  to: string;
  /** 亮色模式：图案线条色（通常带透明度由组件控制） */
  line: string;
  /** 暗色模式：底色压深，线条保持低亮 */
  darkFrom: string;
  darkTo: string;
  darkLine: string;
};

export const COURSE_THEMES: Record<string, CourseTheme> = {
  // 绿色品牌体系：gis 主绿 / turf 地理蓝 / cesium 深青 / three 青柠橄榄 / harmony 暖金点缀
  gis: {
    pattern: "grid",
    from: "162 71% 32%",
    to: "170 45% 22%",
    line: "0 0% 100%",
    darkFrom: "162 50% 18%",
    darkTo: "170 45% 14%",
    darkLine: "162 70% 72%",
  },
  turf: {
    pattern: "polygons",
    from: "206 45% 48%",
    to: "185 55% 38%",
    line: "0 0% 100%",
    darkFrom: "206 45% 20%",
    darkTo: "185 50% 16%",
    darkLine: "200 70% 72%",
  },
  cesium: {
    pattern: "globe",
    from: "175 50% 28%",
    to: "165 45% 20%",
    line: "0 0% 100%",
    darkFrom: "175 45% 18%",
    darkTo: "165 40% 14%",
    darkLine: "170 60% 70%",
  },
  three: {
    pattern: "cube",
    from: "80 55% 38%",
    to: "72 60% 30%",
    line: "0 0% 100%",
    darkFrom: "80 45% 20%",
    darkTo: "72 45% 16%",
    darkLine: "78 80% 72%",
  },
  harmony: {
    pattern: "hex",
    from: "32 85% 48%",
    to: "42 80% 52%",
    line: "0 0% 100%",
    darkFrom: "32 55% 22%",
    darkTo: "42 50% 24%",
    darkLine: "40 90% 72%",
  },
};

const FALLBACK: CourseTheme = COURSE_THEMES.gis!;

/** 按技能 id 取主题，缺失时回落到 gis 主题 */
export function getCourseTheme(skillId: string): CourseTheme {
  return COURSE_THEMES[skillId] ?? FALLBACK;
}
