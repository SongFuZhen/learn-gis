/**
 * i18n 预留（M5）。
 * 当前产品决策为「中文为主」（见 PLAN 决策 #2），所有 UI 文案直接写中文，
 * 暂不接入多语言运行时。这里只放一个稳定的 locale 锚点，作为未来多语言改造的接缝：
 * 届时把文案抽到 messages[locale] 下，组件统一走 t()，即可在不改组件结构的前提下接入。
 */

export const DEFAULT_LOCALE = "zh-CN" as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const SUPPORTED_LOCALES = [DEFAULT_LOCALE] as const;

/** 预留的翻译入口：当前原样返回 key（无运行时开销）。 */
export function t(key: string, _locale: Locale = DEFAULT_LOCALE): string {
  return key;
}
