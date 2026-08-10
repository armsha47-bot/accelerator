"use client";

import { Reorder } from "framer-motion";
import { HOME_SECTIONS, type HomeSectionId } from "@/hooks/useHomePrefs";

/**
 * Bottom-sheet for customizing the Home layout: drag to reorder sections, toggle
 * visibility. "Daily plan" is locked (always visible). Changes persist via the
 * parent's useHomePrefs (localStorage).
 */
const LABEL: Record<HomeSectionId, string> = Object.fromEntries(
  HOME_SECTIONS.map((s) => [s.id, s.label])
) as Record<HomeSectionId, string>;

const LOCKED = new Set(HOME_SECTIONS.filter((s) => "locked" in s && s.locked).map((s) => s.id));

export default function CustomizeHomeSheet({
  order,
  hidden,
  onReorder,
  onToggle,
  onClose,
}: {
  order: HomeSectionId[];
  hidden: HomeSectionId[];
  onReorder: (order: HomeSectionId[]) => void;
  onToggle: (id: HomeSectionId) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md animate-slide-up rounded-t-3xl border border-border bg-surface p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-bold">Customize Home</h3>
          <button onClick={onClose} className="text-sm text-muted">
            Done
          </button>
        </div>
        <p className="mb-4 text-xs text-muted">Drag to reorder · tap the eye to hide.</p>

        <Reorder.Group axis="y" values={order} onReorder={onReorder} className="space-y-2">
          {order.map((id) => {
            const locked = LOCKED.has(id);
            const isHidden = hidden.includes(id);
            return (
              <Reorder.Item
                key={id}
                value={id}
                className="flex cursor-grab items-center gap-3 rounded-2xl border border-border bg-elevated px-4 py-3 active:cursor-grabbing"
              >
                <span className="text-muted">⣿</span>
                <span className={`flex-1 font-medium ${isHidden ? "text-muted line-through" : ""}`}>{LABEL[id]}</span>
                {locked ? (
                  <span className="pill bg-surface text-[10px] text-muted">always on</span>
                ) : (
                  <button onClick={() => onToggle(id)} className="text-lg" aria-label={isHidden ? "Show" : "Hide"}>
                    {isHidden ? "🚫" : "👁"}
                  </button>
                )}
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      </div>
    </div>
  );
}
