/** Cesium 课程大纲与模块元数据 */

import type { ModuleMeta } from "../types";

/**
 * 已上线章节（全部 10 章）。
 * 从零到一学会 CesiumJS：环境 → 相机坐标系 → 影像 → 地形 → 实体 → 时间动态 →
 * 3D Tiles → 拾取交互 → 空间量算 → 性能与实战收官。
 */
export const CESIUM_MODULES: ModuleMeta[] = [
  {
    slug: "00",
    file: "00-cesium-intro",
    title: "初见 CesiumJS：三维地球与第一个 Viewer",
    summary:
      "Cesium 和 Leaflet/MapLibre 的本质区别（3D + 时间）、Vite 环境准备、用 OSM 底图创建第一个 Viewer，以及所有人都会踩的默认 ion 影像 401 坑。",
  },
  {
    slug: "01",
    file: "01-camera-coords",
    title: "相机与坐标系：经纬度变成三维坐标",
    summary:
      "把 GIS 课的经纬度翻译成 Cesium 的 Cartesian3 笛卡尔坐标，相机六大操作，heading/pitch/roll 怎么读怎么用。",
  },
  {
    slug: "02",
    file: "02-imagery-layers",
    title: "影像图层：瓦片金字塔与多图层叠加",
    summary:
      "ImageryProvider 家族与瓦片金字塔（衔接 GIS 课的瓦片章节），多图层叠加、透明度与层级，UrlTemplateImageryProvider 接自定义瓦片服务。",
  },
  {
    slug: "03",
    file: "03-terrain",
    title: "地形：影像之外的第二层",
    summary:
      "影像和地形为什么是两层东西，EllipsoidTerrainProvider 的默认平地行为，quantized-mesh 概念与真实地形数据的来路。",
  },
  {
    slug: "04",
    file: "04-entity-geojson",
    title: "Entity 可视化与 GeoJSON",
    summary:
      "Entity 体系与三件套标注（点/文字/图标）、线面的贴地与拉伸、GeoJSON 整包加载与逐要素染色、CallbackProperty 最简动画——把 GIS 课的矢量数据立起来。",
  },
  {
    slug: "05",
    file: "05-czml-time",
    title: "CZML 与时间动态",
    summary:
      "CZML 文档结构、Clock 时间遥控器、SampledPositionProperty 轨迹插值与 VelocityOrientation 自动转向——卫星过境与车辆回放的声明式解法。",
  },
  {
    slug: "06",
    file: "06-3dtiles",
    title: "3D Tiles：三维瓦片与城市",
    summary:
      "3D Tiles 开放标准的瓦片树与 LOD、Cesium3DTileset 挂载、Cesium3DTileStyle 按属性染色；OSM Buildings 需 token 的边界与自托管 token-free 路径。",
  },
  {
    slug: "07",
    file: "07-picking-events",
    title: "拾取与交互事件",
    summary:
      "ScreenSpaceEventHandler 两段式事件模型、pick 与 drillPick 的分工、Entity 与 3D Tiles 要素两类拾取结果、悬停高亮与点击面板的经典闭环。",
  },
  {
    slug: "08",
    file: "08-measure",
    title: "空间量算：距离、面积与贴地线",
    summary:
      "弦长/大圆/贴地三种距离的适用边界、切平面投影法算面积、点击取点 + CallbackProperty 预览的完整量算交互闭环。",
  },
  {
    slug: "09",
    file: "09-performance-finale",
    title: "性能优化与实战收官",
    summary:
      "requestRenderMode 按需渲染、SSE 精度总闸、Entity/Collection/Primitive 选型递进；收官实战：把全课程拼成 GIS 数据三维看板。",
  },
  {
    slug: "10",
    file: "10-particles",
    title: "粒子系统：火焰、雨雪与天气特效",
    summary:
      "Emitter/生命周期/updateCallback 三件套、modelMatrix 落地定位、bursts 爆发脉冲与四种发射器；用 updateCallback 写雨雪物理，并算清粒子性能账。",
  },
  {
    slug: "11",
    file: "11-postprocess",
    title: "后处理与视觉特效：给渲染结果加滤镜",
    summary:
      "postProcessStages 滤镜链、内置 fxaa/bloom/环境光遮蔽、自定义 shader 三约定（colorTexture/v_textureCoordinates/out_FragColor）、selected 选中高亮与全屏 pass 性能账。",
  },
];

/** 已规划但尚未交付的章节（04-09 随 Phase 2 转正） */
export const PLANNED_MODULES: { slug: string; title: string }[] = [];
