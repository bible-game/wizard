import React, { useEffect, useRef, useState } from "react";

export const SECTIONS = [
    { id: "how-it-works", label: "Play" },
    { id: "read", label: "Read" },
    { id: "study", label: "Study" },
    { id: "stats", label: "Stats" },
];

/**
 * The tutorial's steps, numbered, each with a bar that fills as its stretch of the scroll goes by, and the key figure at
 * the end. Laid out like the app's header: equal side columns (the figure's, and an empty one to match), so the steps
 * sit in the middle. A step's element is its anchor in a stage (half a screen down, as tall as the step's scroll), so
 * its bar fills as the middle of the screen crosses it. The bars are drawn straight from the scroll, without re-rendering
 */
export default function Rail({ figure }: { figure: React.ReactNode }) {
    const [current, setCurrent] = useState(0);
    const bars = useRef<(HTMLSpanElement | null)[]>([]);

    useEffect(() => {
        let frame = 0;
        const measure = () => {
            frame = 0;
            const middle = window.innerHeight / 2;
            let now = 0;
            SECTIONS.forEach(({ id }, i) => {
                const rect = document.getElementById(id)?.getBoundingClientRect();
                const filled = rect ? Math.min(1, Math.max(0, (middle - rect.top) / rect.height)) : 0;
                if (filled > 0) now = i;
                const bar = bars.current[i];
                if (bar) bar.style.transform = `scaleX(${filled})`;
            });
            setCurrent(now);
        };
        const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
        measure();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(frame); };
    }, []);

    return <div className="sticky top-[env(safe-area-inset-top)] z-20 -mx-6 grid h-[54px] grid-cols-[72px_minmax(0,1fr)_72px] items-center bg-ui-bg/95 px-2 max-[440px]:-mx-4">
        <span aria-hidden="true"/>
        <nav aria-label="Tutorial steps" className="min-w-0">
            <ol className="flex justify-center gap-1">
                {SECTIONS.map(({ id, label }, index) => {
                    const state = index === current ? "current" : index < current ? "done" : "next";
                    return <li key={id} className="min-w-0 max-w-[5.5rem] flex-1">
                        <a href={`#${id}`} aria-current={state === "current" ? "step" : undefined}
                           className={`flex min-h-11 flex-col items-center justify-center gap-1.5 ${state === "next" ? "text-ui-faint" : state === "done" ? "text-ui-muted" : "text-ui-text"}`}>
                            <span className="flex items-baseline gap-1 whitespace-nowrap text-[12px] font-medium leading-4">
                                <span className={`font-mono text-[10px] ${state === "current" ? "text-play-gold" : ""}`}>{String(index + 1).padStart(2, "0")}</span>
                                {label}
                            </span>
                            <span aria-hidden="true" className="relative h-[3px] w-full overflow-hidden rounded-full bg-ui-line">
                                <span ref={el => { bars.current[index] = el; }}
                                      className={`absolute inset-0 origin-left rounded-full ${state === "current" ? "bg-play-gold" : "bg-ui-muted"}`}
                                      style={{ transform: "scaleX(0)" }}/>
                            </span>
                        </a>
                    </li>;
                })}
            </ol>
        </nav>
        <div className="flex justify-end">{figure}</div>
    </div>;
}
