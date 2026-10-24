import {
  AlertTriangle,
  BookMarked,
  Info,
  Lightbulb,
  MapPinned,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CalloutType = "info" | "warn" | "tip" | "example" | "must";

const STYLES: Record<
  CalloutType,
  {
    icon: typeof Info;
    label: string;
    box: string;
    iconBox: string;
    title: string;
  }
> = {
  info: {
    icon: Info,
    label: "提示",
    box: "border-info/30 bg-info-light",
    iconBox: "bg-info/15 text-info",
    title: "text-info",
  },
  warn: {
    icon: AlertTriangle,
    label: "注意",
    box: "border-warning/35 bg-warning-light",
    iconBox: "bg-warning/15 text-warning",
    title: "text-warning",
  },
  tip: {
    icon: Lightbulb,
    label: "小技巧",
    box: "border-success/30 bg-success-light",
    iconBox: "bg-success/15 text-success",
    title: "text-success",
  },
  example: {
    icon: MapPinned,
    label: "实例",
    box: "border-brand/30 bg-brand-soft",
    iconBox: "bg-brand/15 text-brand-ink",
    title: "text-brand-ink",
  },
  must: {
    icon: BookMarked,
    label: "必背",
    box: "border-brand-violet/40 bg-[hsl(var(--brand-violet)/0.08)]",
    iconBox: "bg-[hsl(var(--brand-violet)/0.15)] text-[hsl(var(--brand-violet))]",
    title: "text-[hsl(var(--brand-violet))]",
  },
};

/**
 * 讲义提示块：
 * <Callout type="warn" title="易错点">内容</Callout>
 * 用于把「必记结论 / 坑 / 生活实例」从正文中视觉上分离出来。
 */
export default function Callout({
  type = "info",
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}) {
  const s = STYLES[type] ?? STYLES.info;
  const Icon = s.icon;

  return (
    <aside
      className={cn(
        "my-5 flex gap-3 rounded-md border p-4 text-[0.9375rem] leading-relaxed",
        s.box,
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm",
          s.iconBox,
        )}
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[13px] font-semibold", s.title)}>
          <span className="sr-only">{s.label}：</span>
          {title ?? s.label}
        </p>
        <div className="callout-body mt-1 text-foreground-secondary">
          {children}
        </div>
      </div>
    </aside>
  );
}
