import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, MotionValue, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { placeTip, Tooltip, type Place, type Tip } from "@/demo/tooltip";

/**
 * A step of the tour: its anchor id, its share of the scroll (as a share of the screen's height), where in its own
 * progress a fling should come to rest (`snaps`, 0-1), and its screen
 */
export type TourStep = {
    id: string;
    length: number;
    snaps?: number[];
    render: (progress: MotionValue<number>, active: boolean) => React.ReactNode;
};

/** How long a step takes to slide up over the last (or back down off it), once the scroll has crossed into it */
const SLIDE = 0.55;
const SLIDE_EASE = [0.22, 0.8, 0.24, 1] as const;

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The tutorial as one pinned screen under the rail: the page's scroll is shared out between the steps, and each step's
 * screen takes over the same place in turn. The scroll only decides which step it is: crossing into the next one
 * slides it up over the last on its own time (and back down when scrolling back), so a fling can't leave a screen
 * half-way. Snap points, where each step asks for them, bring a fling to rest on a moment rather than between two.
 * Each step gets its own 0-1 progress (for anything the scroll moves continuously, like Read's text) and whether it's
 * the one showing. Every step has an anchor (half a screen down, as tall as its share), so the rail's bars fill by them
 * and a link to one lands at its start. Under reduced motion the steps simply stack in the page, each as it ends
 */
export default function Tour({ steps }: { steps: TourStep[] }) {
    const reduce = useReducedMotion();
    const tour = useRef<HTMLDivElement>(null);
    const total = steps.reduce((sum, s) => sum + s.length, 0);
    const starts = steps.map((_, i) => steps.slice(0, i).reduce((sum, s) => sum + s.length, 0));
    const { scrollYProgress } = useScroll({ target: tour, offset: ["start start", "end end"] });
    const locals = steps.map((s, i) => useTransform(scrollYProgress, p => clamp((p * total - starts[i]) / s.length))); // eslint-disable-line react-hooks/rules-of-hooks

    const at = (p: number) => { let now = 0; starts.forEach((start, i) => { if (p * total >= start) now = i; }); return now; };
    const [active, setActive] = useState(() => at(scrollYProgress.get()));
    const current = useRef(active);
    // the step being slid away from (or slid off), kept showing until the slide is done
    const [leaving, setLeaving] = useState<number | null>(null);
    useMotionValueEvent(scrollYProgress, "change", p => {
        const now = at(p);
        if (now === current.current) return;
        setLeaving(current.current);
        current.current = now;
        setActive(now);
    });

    // the slide's own end clears it; this makes sure, should a slide have nothing left to move
    useEffect(() => {
        if (leaving === null) return;
        const timer = window.setTimeout(() => setLeaving(null), SLIDE * 1000 + 120);
        return () => clearTimeout(timer);
    }, [leaving, active]);

    // a fling comes to rest on the nearest snap point, if it's close; nowhere else is held
    useEffect(() => {
        if (reduce) return;
        const html = document.documentElement;
        html.style.scrollSnapType = "y proximity";
        return () => { html.style.scrollSnapType = ""; };
    }, [reduce]);

    const ended = useMotionValue(1);
    if (reduce) return <div className="grid gap-6">
        {steps.map(step => <section key={step.id} id={step.id} className="relative -mx-6 flex h-[640px] flex-col max-[440px]:-mx-4">{step.render(ended, true)}</section>)}
    </div>;

    return <div ref={tour} className="relative" style={{ height: `calc(100svh + ${total}svh)` }}>
        {steps.map((step, i) => <div key={step.id} id={step.id} aria-hidden="true" className="pointer-events-none absolute inset-x-0"
                                     style={{ top: `calc(50svh + ${starts[i]}svh)`, height: `${step.length}svh`, scrollMarginTop: "50svh" }}/>)}
        {steps.flatMap((step, i) => (step.snaps ?? []).map(f => <div key={`${step.id}-${f}`} aria-hidden="true" className="pointer-events-none absolute inset-x-0 h-px"
                                                                     style={{ top: `${starts[i] + f * step.length}svh`, scrollSnapAlign: "start" }}/>))}

        <div className="sticky top-[calc(env(safe-area-inset-top)+54px)] -mx-6 h-[calc(100svh-54px-env(safe-area-inset-top))] overflow-hidden max-[440px]:-mx-4">
            {steps.map((step, i) => {
                const showing = i === active || i === leaving;
                // the top one of the pair moves: the incoming step going forward, the outgoing one going back
                const moving = leaving !== null && i === Math.max(active, leaving);
                const y = i <= active ? "0%" : "100%";
                return <motion.div key={step.id} initial={false} animate={{ y }} transition={{ duration: SLIDE, ease: SLIDE_EASE }}
                                   onAnimationComplete={() => { if (i === Math.max(active, leaving ?? -1)) setLeaving(null); }}
                                   aria-hidden={i !== active} inert={i !== active}
                                   style={{ zIndex: i, visibility: showing ? "visible" : "hidden", backgroundColor: moving ? "var(--ui-bg)" : "transparent",
                                       boxShadow: moving ? "0 -18px 36px rgba(0,0,0,0.55)" : "none" }}
                                   className="absolute inset-0 flex flex-col">
                    {step.render(locals[i], i === active)}
                </motion.div>;
            })}
        </div>
    </div>;
}

export type StepTip = Tip & { target: string; above?: boolean; inset?: number };

/** How long a tooltip waits before it shows: a fling past it shows nothing, and a pause brings it up */
const SETTLE = 220;

/**
 * A step's wizard tooltip, given which one it should be now: it shows once that has held for a moment, beside the
 * element its `target` names, and goes at once when it changes. `tip(name)` is the ref to put on that element; `root`
 * goes on the step's screen; `layer` renders the tooltip, only while the step is the one showing
 */
export function useTipLayer(wanted: StepTip | null, active: boolean, deps: unknown[] = []) {
    const root = useRef<HTMLDivElement>(null);
    const targets = useRef(new Map<string, Element>());
    const tip = useCallback((name: string) => (el: Element | null) => { if (el) targets.current.set(name, el); else targets.current.delete(name); }, []);

    const [current, setCurrent] = useState<StepTip | null>(null);
    useEffect(() => {
        setCurrent(null);
        if (!wanted || !active) return;
        const timer = window.setTimeout(() => setCurrent(wanted), SETTLE);
        return () => clearTimeout(timer);
    }, [wanted?.id, active]); // eslint-disable-line react-hooks/exhaustive-deps

    const [place, setPlace] = useState<Place>();
    useLayoutEffect(() => {
        const box = root.current, target = current && targets.current.get(current.target);
        if (box && target) setPlace(placeTip(box, target, { above: current.above, inset: current.inset }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current?.id, ...deps]);

    const layer = <AnimatePresence>{active && current && place ? <Tooltip key={current.id} tip={current} place={place}/> : null}</AnimatePresence>;
    return { root, tip, layer, current };
}

/** A step's tooltips, chosen by its progress through `tipAt` */
export function useStepTips(progress: MotionValue<number>, active: boolean, tipAt: (p: number) => StepTip | null, deps: unknown[] = []) {
    const [wanted, setWanted] = useState<StepTip | null>(() => tipAt(progress.get()));
    useMotionValueEvent(progress, "change", p => {
        const next = tipAt(p);
        setWanted(prev => prev?.id === next?.id ? prev : next);
    });
    return useTipLayer(wanted, active, deps);
}

/** Tooltips shared out evenly over a step's progress, as most steps have them */
export const evenly = (tips: StepTip[]) => (p: number) => tips[Math.min(tips.length - 1, Math.floor(p * tips.length))];

/** Snap points for a step whose tooltips are shared out evenly: each tooltip's middle */
export const middles = (count: number) => [...Array(count)].map((_, i) => (i + 0.5) / count);
