/** three.js 课程大纲与模块元数据 */

import type { ModuleMeta } from "../types";

/**
 * 已上线章节（全部 10 章）。
 * 通用图形渲染：定位 → 场景相机渲染器 → 几何材质 → 光照阴影 → 纹理模型 →
 * 控制拾取 → 动画粒子 → 着色器 → 后处理 → 地理融合收官。
 */
export const THREE_MODULES: ModuleMeta[] = [
  {
    slug: "00",
    file: "00-three-intro",
    title: "初见 three.js：从原生 WebGL 到场景图",
    summary:
      "原生 WebGL 的痛点与 three 的定位、场景图思想，与 Cesium（同为 WebGL 渲染器但内置地球/时间/地理坐标）的分工，Vite 起步第一个立方体。",
  },
  {
    slug: "01",
    file: "01-scene-camera",
    title: "Scene / Camera / Renderer 三件套与渲染循环",
    summary:
      "场景树、透视相机视锥参数、WebGLRenderer 配置、resize 适配、requestAnimationFrame 渲染循环与帧率概念。",
  },
  {
    slug: "02",
    file: "02-geometry-material",
    title: "几何与材质：BufferGeometry、Mesh 与层级",
    summary:
      "Geometry 与 BufferGeometry 的数据底子（position/normal/uv）、MeshStandardMaterial 关键参数、网格法线、Group 层级与局部/世界变换。",
  },
  {
    slug: "03",
    file: "03-light-shadow",
    title: "光照与阴影：光源家族与 PBR 材质",
    summary:
      "环境光/平行光/点光/聚光的适用面、阴影贴图原理与 shadow camera 调参、PBR 金属度粗糙度工作流。",
  },
  {
    slug: "04",
    file: "04-texture-loader",
    title: "纹理、UV 与 glTF 模型加载",
    summary:
      "TextureLoader 与 UV 映射、颜色空间与各向异性、GLTFLoader 加载 glTF/GLB、DRACO 压缩解码与加载管理器。",
  },
  {
    slug: "05",
    file: "05-orbit-raycast",
    title: "OrbitControls 与 Raycaster 拾取",
    summary:
      "轨道控制器阻尼与限制、Raycaster 射线拾取原理，对比 Cesium ScreenSpaceEventHandler/pick 两段式事件模型。",
  },
  {
    slug: "06",
    file: "06-animation",
    title: "动画、时钟与粒子系统",
    summary:
      "Clock delta 时间、关键帧与 GSAP 补间、morph 变形、Points 粒子与 PointsMaterial，对比 Cesium ParticleSystem。",
  },
  {
    slug: "07",
    file: "07-shader-basics",
    title: "ShaderMaterial 入门：GLSL 最小着色器",
    summary:
      "attribute/uniform/varying 三件套、顶点与片元着色器管线、最简 GLSL 模板，对比 Cesium 自定义后处理三约定。",
  },
  {
    slug: "08",
    file: "08-postprocessing",
    title: "EffectComposer 后处理链",
    summary:
      "RenderPass/通道链、UnrealBloomPass 泛光、着色器 Pass 写法，对比 Cesium postProcessStages 的滤镜图。",
  },
  {
    slug: "09",
    file: "09-geo-integration",
    title: "地理融合收官：three 场景叠到地图",
    summary:
      "MapLibre custom layer 承载 three 场景、经纬度到平面投影换算、与 Cesium 三维地球方案的选型结论，拼成收官示例。",
  },
];

/** 已规划但尚未交付的章节 */
export const PLANNED_MODULES: { slug: string; title: string }[] = [];
