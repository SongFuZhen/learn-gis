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

type CreateInput = {
  skill: string;
  moduleSlug: string;
  kind: AnnotationKind;
  quote: string;
  anchor: AnnotationAnchor;
  note?: string;
};

/** 乐观创建；失败回滚（静默，不打断阅读） */
export async function createAnnotation(input: CreateInput): Promise<void> {
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

  try {
    const res = await fetch("/api/annotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(String(res.status));
    const d = (await res.json()) as { annotation: AnnotationItem };
    // 切章后旧请求落地：当前列表已不是本章，丢弃结果避免污染
    if (chapterKey !== currentKey) return;
    setState({
      items: state.items.map((it) => (it.id === tempId ? d.annotation : it)),
    });
  } catch {
    if (chapterKey !== currentKey) return;
    setState({ items: state.items.filter((it) => it.id !== tempId) });
  }
}

/** 改类型或附言；失败回滚 */
export async function updateAnnotation(
  id: string,
  patch: { kind?: AnnotationKind; note?: string },
): Promise<void> {
  const before = state.items.find((it) => it.id === id);
  if (!before) return;
  setState({
    items: state.items.map((it) =>
      it.id === id
        ? { ...it, ...patch, updatedAt: new Date().toISOString() }
        : it,
    ),
  });
  try {
    const res = await fetch(`/api/annotations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(String(res.status));
  } catch {
    setState({ items: state.items.map((it) => (it.id === id ? before : it)) });
  }
}

export async function removeAnnotation(id: string): Promise<void> {
  const before = state.items;
  const removed = before.find((it) => it.id === id);
  setState({ items: state.items.filter((it) => it.id !== id) });
  try {
    const res = await fetch(`/api/annotations/${id}`, { method: "DELETE" });
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
