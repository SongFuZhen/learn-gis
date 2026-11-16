"use client";

import { useSyncExternalStore } from "react";
import type { AnnotationAnchor } from "./anchor";
import type { AnnotationKind } from "./highlight";

export type AnnotationItem = {
  id: string;
  skill: string;
  moduleSlug: string;
  kind: AnnotationKind;
  quote: string;
  anchor: AnnotationAnchor;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export const KIND_META: Record<AnnotationKind, { label: string; dot: string }> = {
  note: { label: "备注", dot: "bg-info" },
  record: { label: "记录", dot: "bg-brand" },
  question: { label: "疑问", dot: "bg-warning" },
};

type State = {
  items: AnnotationItem[];
  loading: boolean;
  /** 锚点失效、无法在正文定位的标注 id */
  unresolved: string[];
};

let state: State = { items: [], loading: true, unresolved: [] };
const listeners = new Set<() => void>();
let currentKey = "";
let inflight: Promise<void> | null = null;
/**
 * 乐观 id → 服务端真实 id。
 * 创建请求落地后列表项 id 会被替换，弹窗若仍持 temp id 会查不到项而卸载，
 * 正在编辑的附言随之丢失；所有按 id 的读写先过这层别名。
 */
const idAliases = new Map<string, string>();
/** tempId → 创建请求 Promise：创建落地前针对 temp id 的改/删都挂起排队 */
const inflightCreates = new Map<string, Promise<string | null>>();
/** 落地前就点删除的 tempId：POST 成功拿到真实 id 后立即补发 DELETE */
const pendingDeletes = new Set<string>();
/** 落地前的编辑（类型/附言）：累积合并，POST 成功后合入新行并补发 PATCH */
const pendingPatches = new Map<
  string,
  { kind?: AnnotationKind; note?: string }
>();

export function resolveAnnotationId(id: string): string {
  return idAliases.get(id) ?? id;
}

/** 等待全部在飞的创建请求（含排队改/删）落地，测试与冒烟用 */
export async function flushPendingWrites(): Promise<void> {
  await Promise.all(Array.from(inflightCreates.values()));
}

function isTempId(id: string): boolean {
  return id.startsWith("temp-");
}

function emit() {
  for (const fn of listeners) fn();
}

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  emit();
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getSnapshot(): State {
  return state;
}

/** React hook：组件订阅标注状态 */
export function useAnnotations(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** 切换/首次进入某章：拉取该章标注（同章不重复请求） */
export function loadChapter(skill: string, moduleSlug: string) {
  const key = `${skill}:${moduleSlug}`;
  if (key === currentKey && inflight) return inflight;
  currentKey = key;
  idAliases.clear();
  pendingDeletes.clear();
  pendingPatches.clear();
  setState({ items: [], unresolved: [], loading: true });

  inflight = fetch(
    `/api/annotations?skill=${encodeURIComponent(skill)}&module=${encodeURIComponent(moduleSlug)}`,
  )
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: { annotations?: AnnotationItem[] }) => {
      // 响应返回前用户已切到别的章：丢弃旧章数据，防止覆盖当前章
      if (key !== currentKey) return;
      setState({ items: d.annotations ?? [], loading: false });
    })
    .catch(() => {
      if (key !== currentKey) return;
      setState({ items: [], loading: false });
    });
  return inflight;
}

export function setUnresolved(ids: string[]) {
  setState({ unresolved: ids });
}

/** 全部划线页用：跨章读取当前用户所有标注，不写入章节单例状态 */
export async function fetchAllAnnotations(): Promise<AnnotationItem[]> {
  const res = await fetch("/api/annotations", { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as { annotations?: AnnotationItem[] };
  return data.annotations ?? [];
}

type CreateInput = {
  skill: string;
  moduleSlug: string;
  kind: AnnotationKind;
  quote: string;
  anchor: AnnotationAnchor;
  note?: string;
};

/** 乐观创建；失败回滚（静默，不打断阅读）。返回乐观 id，供调用方立即打开弹窗 */
export async function createAnnotation(input: CreateInput): Promise<string> {
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const optimistic: AnnotationItem = {
    id: tempId,
    skill: input.skill,
    moduleSlug: input.moduleSlug,
    kind: input.kind,
    quote: input.quote,
    anchor: input.anchor,
    note: input.note ?? "",
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
  const chapterKey = `${input.skill}:${input.moduleSlug}`;
  setState({ items: [...state.items, optimistic] });

  const settled = (async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(String(res.status));
      const d = (await res.json()) as { annotation: AnnotationItem };
      const realId = d.annotation.id;
      // 切章后旧请求落地：当前列表已不是本章，丢弃结果避免污染
      if (chapterKey !== currentKey) return realId;
      idAliases.set(tempId, realId);

      const queuedPatch = pendingPatches.get(tempId);
      const queuedDelete = pendingDeletes.has(tempId);
      const nextItem = queuedPatch
        ? { ...d.annotation, ...queuedPatch }
        : d.annotation;
      setState({
        items: state.items.map((it) => (it.id === tempId ? nextItem : it)),
      });
      pendingPatches.delete(tempId);

      if (queuedDelete) {
        // 落地前用户已点删除：本地行已移除，这里补发真实 id 的 DELETE
        pendingDeletes.delete(tempId);
        try {
          const del = await fetch(`/api/annotations/${realId}`, {
            method: "DELETE",
          });
          if (!del.ok) throw new Error(String(del.status));
          if (chapterKey === currentKey) {
            setState({
              items: state.items.filter((it) => it.id !== realId),
            });
          }
        } catch {
          // 删失败：把服务端行补回本地，避免 UI 与库不一致
          if (chapterKey === currentKey) {
            setState({ items: [...state.items, d.annotation] });
          }
        }
        return realId;
      }

      if (queuedPatch) {
        try {
          const patchRes = await fetch(`/api/annotations/${realId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(queuedPatch),
          });
          if (!patchRes.ok) throw new Error(String(patchRes.status));
        } catch {
          // PATCH 失败：回退到服务端原始行
          if (chapterKey === currentKey) {
            setState({
              items: state.items.map((it) =>
                it.id === realId ? d.annotation : it,
              ),
            });
          }
        }
      }
      return realId;
    } catch {
      if (chapterKey === currentKey) {
        idAliases.delete(tempId);
        pendingDeletes.delete(tempId);
        pendingPatches.delete(tempId);
        setState({ items: state.items.filter((it) => it.id !== tempId) });
      }
      return null;
    } finally {
      inflightCreates.delete(tempId);
    }
  })();

  inflightCreates.set(tempId, settled);
  return tempId;
}

/** 改类型或附言；失败回滚。创建请求未落地时排队，POST 成功后合入真实行并补发 PATCH */
export async function updateAnnotation(
  id: string,
  patch: { kind?: AnnotationKind; note?: string },
): Promise<void> {
  // temp id 且尚无别名：创建仍在飞，本地先乐观更新，网络请求交给 create 落地流程
  if (isTempId(id) && !idAliases.has(id) && inflightCreates.has(id)) {
    const prev = pendingPatches.get(id) ?? {};
    pendingPatches.set(id, { ...prev, ...patch });
    setState({
      items: state.items.map((it) =>
        it.id === id
          ? { ...it, ...patch, updatedAt: new Date().toISOString() }
          : it,
      ),
    });
    await inflightCreates.get(id);
    return;
  }

  const resolvedId = resolveAnnotationId(id);
  const before = state.items.find((it) => it.id === resolvedId);
  if (!before) return;
  setState({
    items: state.items.map((it) =>
      it.id === resolvedId
        ? { ...it, ...patch, updatedAt: new Date().toISOString() }
        : it,
    ),
  });
  try {
    const res = await fetch(`/api/annotations/${resolvedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(String(res.status));
  } catch {
    setState({
      items: state.items.map((it) => (it.id === resolvedId ? before : it)),
    });
  }
}

export async function removeAnnotation(id: string): Promise<void> {
  // 创建仍在飞：本地先移除并登记，create 落地拿到真实 id 后补发 DELETE
  if (isTempId(id) && !idAliases.has(id) && inflightCreates.has(id)) {
    pendingDeletes.add(id);
    pendingPatches.delete(id);
    setState({ items: state.items.filter((it) => it.id !== id) });
    await inflightCreates.get(id);
    return;
  }

  const resolvedId = resolveAnnotationId(id);
  const before = state.items;
  const removed = before.find((it) => it.id === resolvedId);
  setState({ items: state.items.filter((it) => it.id !== resolvedId) });
  try {
    const res = await fetch(`/api/annotations/${resolvedId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(String(res.status));
  } catch {
    // 失败回滚；若期间已切章（当前列表属于别的章节），旧数组不能再覆盖回去
    const chapterKey = removed ? `${removed.skill}:${removed.moduleSlug}` : "";
    if (chapterKey !== currentKey) return;
    setState({ items: before });
  }
}

/** smoke 测试钩子：暴露当前状态与动作 */
export function installProbe() {
  if (typeof window === "undefined") return;
  (
    window as unknown as {
      __annoProbe: {
        state: () => State;
        remove: (id: string) => Promise<void>;
      };
    }
  ).__annoProbe = {
    state: () => state,
    remove: removeAnnotation,
  };
}
