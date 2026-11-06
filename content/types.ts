/** 课程模块元数据（跨技能共享类型） */

export type ModuleMeta = {
  /** 两位数模块号，用作 URL 片段 */
  slug: string;
  /** 文件名前缀，如 01-basics */
  file: string;
  title: string;
  summary: string;
};
