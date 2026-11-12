"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  buildAnchor,
  buildAnchorFromText,
  type AnnotationAnchor,
} from "@/lib/annotations/anchor";
import {
  MARK_CLASS,
  renderHighlights,
  type AnnotationKind,
} from "@/lib/annotations/highlight";
import {
  createAnnotation,
  installProbe,
  loadChapter,
  setUnresolved,
  useAnnotations,
} from "@/lib/annotations/store";
import { findConflict } from "@/lib/annotations/conflict";
import { cn } from "@/lib/utils";
import AnnotationPopover from "./AnnotationPopover";
import { AnnotationPanelMobile } from "./AnnotationPanel";

const KINDS: { kind: AnnotationKind; label: string; className: string }[] = [
  { kind: "note", label: "备注", className: "bg-info" },
  { kind: "record", label: "记录", className: "bg-brand" },
  { kind: "question", label: "疑问", className: "bg-warning" },
];

type Toolbar = {
  x: number;
  y: number;
  quote: string;
  anchor: AnnotationAnchor;
};

type PopoverState = { id: string; x: number; y: number };

type Props = {
  skill: string;
  moduleSlug: string;
  children: ReactNode;
};

/** 讲义划线交互层：选区工具条、划线渲染、点击划线弹窗、移动端笔记抽屉 */
export default function AnnotationLayer({
  skill,
  moduleSlug,
  children,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { items, loading } = useAnnotations();
  const [toolbar, setToolbar] = useState<Toolbar | null>(null);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  // 选区监听器只挂载一次，用 ref 读取最新 items 做冲突判断
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    void loadChapter(skill, moduleSlug);
    installProbe();
  }, [skill, moduleSlug]);

  // 冲突提示 2.4s 后自动消失
  useEffect(() => {
    if (!conflictMsg) return;
    const t = setTimeout(() => setConflictMsg(null), 2400);
    return () => clearTimeout(t);
  }, [conflictMsg]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || loading) return;
    const unresolved = renderHighlights(
      root,
      items.map((item) => ({
        id: item.id,
        kind: item.kind,
        anchor: item.anchor,
        quote: item.quote,
      })),
    );
    setUnresolved(unresolved);
  }, [items, loading]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    // selectionchange 同时覆盖鼠标、触屏拖选手柄、键盘 Shift+方向键；
    // 高频事件，用防抖在选区稳定后再建锚点
    let timer: ReturnType<typeof setTimeout> | null = null;
    function onSelectionChange() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(syncToolbar, 120);
    }

    function syncToolbar() {
      const root = rootRef.current;
      if (!root) return;
      const selection = document.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setToolbar(null);
        setConflictMsg(null);
        return;
      }
      const range = selection.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) {
        setToolbar(null);
        setConflictMsg(null);
        return;
      }
      const base = buildAnchor(root, range);
      const raw = selection.toString();
      const quote = raw.trim();
      if (!base || !quote) {
        setToolbar(null);
        setConflictMsg(null);
        return;
      }
      // 选区首尾的空白不进 quote，anchor 也要对齐到 trim 后的真实边界，
      // 否则重渲染时 textContent.slice(start,end) 与 quote 不一致会被误判为锚点失效
      const lead = raw.length - raw.trimStart().length;
      const tailGap = raw.length - raw.trimEnd().length;
      const anchor: AnnotationAnchor = buildAnchorFromText(
        root.textContent ?? "",
        base.start + lead,
        base.end - tailGap,
      );
      // 与已有划线区间相交/重复：不弹工具条，给出提示，避免嵌套 mark 破坏文本结构
      const hit = itemsRef.current.find((it) => {
        const sameSpan =
          it.anchor.start === anchor.start && it.anchor.end === anchor.end;
        const intersects =
          anchor.start < it.anchor.end && anchor.end > it.anchor.start;
        return sameSpan || intersects;
      });
      if (hit) {
        const sameSpan =
          hit.anchor.start === anchor.start && hit.anchor.end === anchor.end;
        setToolbar(null);
        setConflictMsg(
          sameSpan
            ? "这段文字已经划过线了"
            : "选区与已有划线重叠，请调整选区范围",
        );
        return;
      }
      setConflictMsg(null);
      const rect = range.getBoundingClientRect();
      const width = 192;
      const x = Math.max(
        8,
        Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8),
      );
      const y = rect.top > 56 ? rect.top - 52 : rect.bottom + 8;
      setToolbar({ x, y, quote, anchor });
    }

    function onClick(e: MouseEvent) {
      const root = rootRef.current;
      if (!root) return;
      const selection = document.getSelection();
      if (selection && !selection.isCollapsed) return;
      const target = e.target as HTMLElement;
      const mark = target.closest?.(`mark.${MARK_CLASS}`) as HTMLElement | null;
      if (!mark || !root.contains(mark)) return;
      const id = mark.dataset.annotationId;
      if (!id) return;
      const rect = mark.getBoundingClientRect();
      setPopover({
        id,
        x: rect.left,
        y: rect.bottom + 8,
      });
    }

    document.addEventListener("selectionchange", onSelectionChange);
    el.addEventListener("click", onClick);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("selectionchange", onSelectionChange);
      el.removeEventListener("click", onClick);
    };
  }, []);

  async function addAnnotation(kind: AnnotationKind) {
    if (!toolbar) return;
    // 防御性兜底：选区展示后、点击前若已有同区间标注，拒绝重复提交
    if (
      findConflict(
        items.map((it) => ({ id: it.id, kind: it.kind, anchor: it.anchor })),
        { start: toolbar.anchor.start, end: toolbar.anchor.end },
        kind,
      )
    ) {
      setToolbar(null);
      setConflictMsg("这段文字已经划过线了");
      document.getSelection()?.removeAllRanges();
      return;
    }
    await createAnnotation({
      skill,
      moduleSlug,
      kind,
      quote: toolbar.quote,
      anchor: toolbar.anchor,
    });
    document.getSelection()?.removeAllRanges();
    setToolbar(null);
  }

  const popoverItem = popover
    ? items.find((item) => item.id === popover.id)
    : undefined;

  return (
    <>
      <div ref={rootRef} className="anno-layer relative">
        {children}
      </div>

      {toolbar && (
        <div
          role="toolbar"
          aria-label="添加划线笔记"
          className="fixed z-40 flex h-10 items-center gap-1 rounded-md border border-border bg-card px-1.5 shadow-[0_12px_32px_-10px_rgba(20,26,64,0.35)]"
          style={{ left: toolbar.x, top: toolbar.y }}
          // 按下按钮前不能丢选区：pointerdown 同时覆盖鼠标与触屏
          onPointerDown={(e) => e.preventDefault()}
        >
          {KINDS.map((item) => (
            <button
              key={item.kind}
              type="button"
              data-anno-create={item.kind}
              onClick={() => void addAnnotation(item.kind)}
              className="flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-[13px] text-foreground-secondary transition-colors hover:bg-background-hover hover:text-foreground"
            >
              <span className={cn("h-2 w-2 rounded-full", item.className)} />
              {item.label}
            </button>
          ))}
        </div>
      )}

      {conflictMsg && (
        <div
          role="status"
          data-anno-conflict
          className="fixed left-1/2 top-14 z-40 -translate-x-1/2 rounded-md border border-border bg-card px-3 py-1.5 text-[12px] text-foreground-secondary shadow-[0_12px_32px_-10px_rgba(20,26,64,0.35)]"
        >
          {conflictMsg}
        </div>
      )}

      {popover && popoverItem && (
        <AnnotationPopover
          item={popoverItem}
          x={popover.x}
          y={popover.y}
          onClose={() => setPopover(null)}
        />
      )}

      <AnnotationPanelMobile />
    </>
  );
}
