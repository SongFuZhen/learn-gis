"use client";

import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import type { AnnotationKind } from "@/lib/annotations/highlight";
import {
  KIND_META,
  removeAnnotation,
  updateAnnotation,
  type AnnotationItem,
} from "@/lib/annotations/store";
import { cn } from "@/lib/utils";

const KINDS: AnnotationKind[] = ["note", "record", "question"];
const POPOVER_WIDTH = 320;
/** 定位兜底尺寸：挂载后用实测 offset 尺寸覆盖，避免内容增高后底部按钮被裁出屏 */
const FALLBACK_HEIGHT = 340;

type Props = {
  item: AnnotationItem;
  x: number;
  y: number;
  /** 新建划线自动弹出时为 true：挂载即聚焦附言输入框 */
  autoFocus?: boolean;
  onClose: () => void;
};

/** 点已有划线弹出：切换类型、编辑附言、删除 */
export default function AnnotationPopover({
  item,
  x,
  y,
  autoFocus = false,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [note, setNote] = useState(item.note);
  const [kind, setKind] = useState<AnnotationKind>(item.kind);
  const [saving, setSaving] = useState(false);
  const [box, setBox] = useState({ width: POPOVER_WIDTH, height: FALLBACK_HEIGHT });

  // 实测弹窗尺寸后再定位：保存按钮让内容高于旧常量，按旧高度夹取会把按钮裁出屏
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () =>
      setBox({ width: el.offsetWidth, height: el.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  const left = Math.max(8, Math.min(x, window.innerWidth - box.width - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - box.height - 8));

  function changeKind(next: AnnotationKind) {
    if (next === kind) return;
    setKind(next);
    void updateAnnotation(item.id, { kind: next });
  }

  function commitNote() {
    if (note !== item.note) void updateAnnotation(item.id, { note });
  }

  async function saveAndClose() {
    if (saving) return;
    setSaving(true);
    try {
      if (note !== item.note) await updateAnnotation(item.id, { note });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem() {
    await removeAnnotation(item.id);
    onClose();
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="编辑划线笔记"
      data-anno-popover={item.id}
      className="fixed z-50 w-80 rounded-md border border-border bg-card p-3 shadow-[0_12px_32px_-10px_rgba(20,26,64,0.35)]"
      style={{ left, top }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[13px] font-medium text-foreground">
          {item.quote}
        </p>
        <button
          type="button"
          aria-label="关闭"
          onClick={onClose}
          className="shrink-0 rounded-sm p-1 text-foreground-muted transition-colors hover:bg-background-hover hover:text-foreground"
        >
          <X className="h-4 w-4" strokeWidth={1.7} />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {KINDS.map((value) => (
          <button
            key={value}
            type="button"
            data-anno-kind={value}
            aria-pressed={kind === value}
            onClick={() => changeKind(value)}
            className={cn(
              "flex h-8 items-center justify-center gap-1.5 rounded-sm border text-[13px] transition-colors",
              kind === value
                ? "border-border-strong bg-background-hover text-foreground"
                : "border-border text-foreground-secondary hover:bg-background-hover",
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", KIND_META[value].dot)} />
            {KIND_META[value].label}
          </button>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        value={note}
        data-anno-note
        onChange={(e) => setNote(e.target.value)}
        onBlur={commitNote}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void saveAndClose();
          }
        }}
        rows={4}
        placeholder="写点附言（可留空，纯划线也行）"
        className="mt-2 w-full resize-none rounded-sm border border-border bg-surface px-2.5 py-2 text-[13px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-foreground-disabled focus:border-brand/50"
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          data-anno-delete
          onClick={deleteItem}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-[13px] text-destructive transition-colors hover:bg-destructive-light"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.7} />
          删除划线
        </button>
        <button
          type="button"
          data-anno-save
          onClick={() => void saveAndClose()}
          disabled={saving}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-5 text-[13px] font-medium text-primary-foreground shadow-brand transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Check className="h-4 w-4" strokeWidth={2} />
          保存
        </button>
      </div>
    </div>
  );
}
