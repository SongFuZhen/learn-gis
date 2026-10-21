/** GIS 课程大纲与模块元数据（M2 会补齐剩余 5 章的讲义与题库） */

export type ModuleMeta = {
  /** 两位数模块号，用作 URL 片段 */
  slug: string;
  /** 文件名前缀，如 01-basics */
  file: string;
  title: string;
  summary: string;
};

export const GIS_MODULES: ModuleMeta[] = [
  {
    slug: "01",
    file: "01-basics",
    title: "地球、基准面与投影",
    summary:
      "椭球与基准面、球面为什么不能铺平、等角/等积/等距的取舍，以及 Web 墨卡托的拉伸。",
  },
];

/** 已规划但尚未交付的章节（M2 逐个补齐后移入 GIS_MODULES） */
export const PLANNED_MODULES: { slug: string; title: string }[] = [
  { slug: "02", title: "坐标参考系与 EPSG" },
  { slug: "03", title: "矢量与栅格数据模型" },
  { slug: "04", title: "数据格式与矢量瓦片" },
  { slug: "05", title: "OGC 服务与前端地图库" },
  { slug: "06", title: "空间运算与 PostGIS" },
];
