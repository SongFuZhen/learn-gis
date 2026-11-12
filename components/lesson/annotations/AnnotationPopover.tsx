"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
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
const POPOVER_HEIGHT = 260;

type Props = {
  item: AnnotationItem;
  x: number;
  y: number;
  onClose: () => void;
};

/** 点已有划线弹出：切换类型、编辑附言、删除 */
export default function AnnotationPopover({ item, x, y, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState(item.note);
  const [kind, setKind] = useState<AnnotationKind>(item.kind);

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

  const left = Math.max(8, Math.min(x, window.innerWidth - POPOVER_WIDTH - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - POPOVER_HEIGHT - 8));

  function changeKind(next: AnnotationKind) {
    if (next === kind) return;
    setKind(next);
    void updateAnnotation(item.id, { kind: next });
  }

  function commitNote() {
    if (note !== item.note) void updateAnnotation(item.id, { note });
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
        value={note}
        data-anno-note
        onChange={(e) => setNote(e.target.value)}
        onBlur={commitNote}
        rows={4}
        placeholder="写点附言（可留空，纯划线也行）"
        className="mt-2 w-full resize-none rounded-sm border border-border bg-surface px-2.5 py-2 text-[13px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-foreground-disabled focus:border-brand/50"
      />

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          data-anno-delete
          onClick={deleteItem}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-[13px] text-destructive transition-colors hover:bg-destructive-light"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.7} />
          删除划线
        </button>
      </div>
    </div>
  );
}
