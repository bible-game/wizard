import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, MotionValue, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { placeTip, Tooltip, type Place, type Tip } from "@/demo/tooltip";

/** A step of the tour: its anchor id, its share of the scroll (as a share of the screen's height), and its screen */
export type TourStep = {
    id: string;
    length: number;
    render: (progress: MotionValue<number>, active: boolean) => React.ReactNode;
};

/** How far the scroll goes while the next step slides up over the last, at a hand-over: a share of the screen's height */
const FADE = 24;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** A step's share of the tour's scroll, as its own 0-1 progress, and how much it shows (0-1) at the hand-overs */
function useStep(progress: MotionValue<number>, total: number, start: number, length: number, first: boolean, last: boolean) {
    const local = useTransform(progress, p => clamp((p * total - start) / length));
    // the incoming step slides up over the outgoing one, opaque on the ground's colour while it does, so it covers it
    // rather than showing through; the outgoing one stays as it is until it's covered, then goes, so there's never a gap
    const entering = (p: number) => first ? 1 : clamp((p * total - start) / FADE);
    const shown = useTransform(progress, p => (!last && p * total >= start + length + FADE) || entering(p) === 0 ? 0 : 1);
    const ground = useTransform(progress, p => entering(p) < 1 ? "var(--ui-bg)" : "transparent");
    const y = useTransform(progress, p => `${(1 - ease(entering(p))) * 100}%`);
    const edge = useTransform(progress, p => entering(p) < 1 ? "0 -18px 36px rgba(0,0,0,0.55)" : "none");
    return { local, shown, ground, y, edge };
}

/**
 * The tutorial as one pinned screen under the rail: the page's scroll is shared out between the steps, and each step's
 * screen takes over the same place in turn, the next sliding up over the last, so the tour reads as one continuous
 * thing rather than separate sections. Each step gets its own 0-1 progress and whether it's the one showing. Every
 * step has an anchor (half a screen down, as tall as its share), so the rail's bars fill by them and a link to one
 * lands at its start. Under reduced motion the steps simply stack in the page, each as it ends
 */
export default function Tour({ steps }: { steps: TourStep[] }) {
    const reduce = useReducedMotion();
    const tour = useRef<HTMLDivElement>(null);
    const total = steps.reduce((sum, s) => sum + s.length, 0);
    const starts = steps.map((_, i) => steps.slice(0, i).reduce((sum, s) => sum + s.length, 0));
    const { scrollYProgress } = useScroll({ target: tour, offset: ["start start", "end end"] });
    const layers = steps.map((s, i) => useStep(scrollYProgress, total, starts[i], s.length, i === 0, i === steps.length - 1)); // eslint-disable-line react-hooks/rules-of-hooks
    const [active, setActive] = useState(0);
    useMotionValueEvent(scrollYProgress, "change", p => {
        const at = p * total;
        let now = 0;
        starts.forEach((start, i) => { if (at >= start) now = i; });
        setActive(now);
    });
    const ended = useMotionValue(1);

    if (reduce) return <div className="grid gap-6">
        {steps.map(step => <section key={step.id} id={step.id} className="relative -mx-6 flex h-[640px] flex-col max-[440px]:-mx-4">{step.render(ended, true)}</section>)}
    </div>;

    return <div ref={tour} className="relative" style={{ height: `calc(100svh + ${total}svh)` }}>
        {steps.map((step, i) => <div key={step.id} id={step.id} aria-hidden="true" className="pointer-events-none absolute inset-x-0"
                                     style={{ top: `calc(50svh + ${starts[i]}svh)`, height: `${step.length}svh`, scrollMarginTop: "50svh" }}/>)}

        <div className="sticky top-[calc(env(safe-area-inset-top)+54px)] -mx-6 h-[calc(100svh-54px-env(safe-area-inset-top))] overflow-hidden max-[440px]:-mx-4">
            {steps.map((step, i) => <motion.div key={step.id} style={{ opacity: layers[i].shown, y: layers[i].y, backgroundColor: layers[i].ground, boxShadow: layers[i].edge }}
                                                aria-hidden={i !== active} inert={i !== active}
                                                className="absolute inset-0 flex flex-col">
                {step.render(layers[i].local, i === active)}
            </motion.div>)}
        </div>
    </div>;
}

export type StepTip = Tip & { target: string; above?: boolean; inset?: number };

/**
 * A step's wizard tooltips: one at a time with its progress, from `tipAt` (given the step's 0-1 progress), each beside
 * the element its `target` names. `tip(name)` is the ref to put on that element; `root` goes on the step's screen;
 * `layer` renders the tooltip, only while the step is the one showing
 */
export function useStepTips(progress: MotionValue<number>, active: boolean, tipAt: (p: number) => StepTip | null, deps: unknown[] = []) {
    const root = useRef<HTMLDivElement>(null);
    const targets = useRef(new Map<string, Element>());
    const tip = useCallback((name: string) => (el: Element | null) => { if (el) targets.current.set(name, el); else targets.current.delete(name); }, []);
    const [current, setCurrent] = useState<StepTip | null>(() => tipAt(progress.get()));
    useMotionValueEvent(progress, "change", p => {
        const next = tipAt(p);
        setCurrent(prev => prev?.id === next?.id ? prev : next);
    });

    const [place, setPlace] = useState<Place>();
    useLayoutEffect(() => {
        const box = root.current, target = current && targets.current.get(current.target);
        if (box && target) setPlace(placeTip(box, target, { above: current.above, inset: current.inset }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current?.id, active, ...deps]);

    const layer = <AnimatePresence>{active && current && place ? <Tooltip key={current.id} tip={current} place={place}/> : null}</AnimatePresence>;
    return { root, tip, layer, current };
}

/** Tooltips shared out evenly over a step's progress, as most steps have them */
export const evenly = (tips: StepTip[]) => (p: number) => tips[Math.min(tips.length - 1, Math.floor(p * tips.length))];
