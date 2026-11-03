import React, { useEffect } from "react";
import { motion, useAnimationControls } from "framer-motion";

export type Tip = { id: string; title: string; text: string };
export type Place = { x: number; y: number; width: number; above: boolean; arrow: number };

/**
 * Where a tooltip goes, inside `root`: under its target, or over it (`above`, or when there's no room below), kept on
 * screen sideways with its arrow on the target. `inset` points into a tall target from near its top instead
 */
export function placeTip(root: Element, target: Element, { above = false, inset }: { above?: boolean; inset?: number } = {}): Place {
    const box = root.getBoundingClientRect(), r = target.getBoundingClientRect();
    const width = Math.min(280, box.width - 24);
    const centre = r.left + r.width / 2 - box.left;
    const x = Math.min(Math.max(12, centre - width / 2), box.width - width - 12);
    const below = inset !== undefined ? r.top - box.top + inset : r.bottom - box.top + 12;
    const up = above || (inset === undefined && below + 130 > box.height);
    return { x, y: up ? r.top - box.top - 12 : below, width, above: up, arrow: Math.min(Math.max(16, centre - x), width - 16) };
}

/**
 * A wizard's tooltip, beside what it explains, with an arrow pointing at it; in help blue, as the app's help is. Each
 * time `nudge` goes up it shakes, to say it's waiting on the visitor
 */
export function Tooltip({ tip, place, nudge = 0 }: { tip: Tip; place: Place; nudge?: number }) {
    const shake = useAnimationControls();
    useEffect(() => {
        if (nudge) shake.start({ x: [0, -9, 9, -7, 7, -3, 0], transition: { duration: 0.45, ease: "easeInOut" } });
    }, [nudge, shake]);
    return <motion.div role="status" aria-live="polite" initial={{ opacity: 0, scale: 0.96, y: place.above ? 6 : -6 }}
                       animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
                       className="pointer-events-none absolute z-10" style={{ left: place.x, top: place.y, width: place.width, translateY: place.above ? "-100%" : 0 }}>
        <motion.div animate={shake} className="relative rounded-lg border border-ui-help/40 bg-ui-sheet px-3.5 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
            <span aria-hidden="true" className={`absolute size-3 rotate-45 border-ui-help/40 bg-ui-sheet ${place.above ? "-bottom-[7px] border-b border-r" : "-top-[7px] border-l border-t"}`}
                  style={{ left: place.arrow - 6 }}/>
            <p className="font-mono text-[11px] font-medium text-ui-help">{tip.title}</p>
            <p className="mt-1 text-[14px] leading-5 text-ui-text">{tip.text}</p>
        </motion.div>
    </motion.div>;
}
