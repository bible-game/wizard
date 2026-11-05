import React, { useEffect, useRef, useState } from "react";
import { motionValue, MotionValue, useMotionValueEvent } from "framer-motion";
import { CHAPTERS } from "@/demo/welcome/chapters";

const N = CHAPTERS.length;
const IDLE = motionValue(0);

/**
 * The whole Bible as one field of 1,189 chapters, in reading order, row by row, each in its region's colour, so the books
 * read as bands: the Law's cyan, the histories' periwinkle, the wisdom books' coral and on to Revelation. 41 x 29 is
 * exactly 1,189, so the field closes square on both phones (29 across) and wide screens (41 across).
 *
 * Unlit chapters are glass outlines; lit ones fill solid. `progress` (0-1) lights them in reading order, a soft edge
 * running ahead, all in CSS from one variable (--lit), so a scroll never redraws 1,189 cells. Or `seen` lights a set.
 */
export default function ChapterField({ columns, progress, seen, focus, readout = false, className = "" }: {
    columns: 29 | 41;
    progress?: MotionValue<number>;
    seen?: Set<number>;
    /** a chapter that pulses (today's) */
    focus?: number;
    /** names the chapter under the pointer */
    readout?: boolean;
    className?: string;
}) {
    const svg = useRef<SVGSVGElement>(null);
    const rows = N / columns;
    const [hover, setHover] = useState<number>();

    const set = (p: number) => svg.current?.style.setProperty("--lit", `${p * (N + 40)}`);
    useEffect(() => { if (progress) set(progress.get()); }, [progress, columns]); // eslint-disable-line react-hooks/exhaustive-deps
    useMotionValueEvent(progress ?? IDLE, "change", set);

    const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
        const box = svg.current!.getBoundingClientRect();
        const c = Math.floor((e.clientX - box.left) / box.width * columns), r = Math.floor((e.clientY - box.top) / box.height * rows);
        setHover(c >= 0 && c < columns && r >= 0 && r < rows ? r * columns + c : undefined);
    };

    const at = (i: number) => ({ x: (i % columns) * 10 + 1, y: Math.floor(i / columns) * 10 + 1 });
    const shown = hover ?? focus;
    const named = shown !== undefined ? CHAPTERS[shown] : undefined;

    return <figure className={`wl-field ${className}`}>
        <svg ref={svg} viewBox={`0 0 ${columns * 10} ${rows * 10}`} className="block h-auto w-full" aria-hidden="true"
             data-scroll={progress ? "" : undefined}
             onPointerMove={readout ? onMove : undefined} onPointerLeave={readout ? () => setHover(undefined) : undefined}>
            {CHAPTERS.map((c, i) => {
                const { x, y } = at(i);
                const lit = seen?.has(i);
                return <g key={i} style={{ "--i": i, color: c.colour } as React.CSSProperties}>
                    <rect x={x} y={y} width={8} height={8} rx={2} className="wl-cell"/>
                    {progress || lit ? <rect x={x} y={y} width={8} height={8} rx={2} className={progress ? "wl-cell-lit" : "wl-cell-seen"}/> : null}
                </g>;
            })}
            {shown !== undefined ? (() => {
                const { x, y } = at(shown);
                return <g className={hover === undefined ? "wl-focus" : undefined} style={{ color: CHAPTERS[shown].colour }}>
                    <rect x={x - 1.5} y={y - 1.5} width={11} height={11} rx={3} className="wl-cell-ring"/>
                    <rect x={x} y={y} width={8} height={8} rx={2} fill="currentColor"/>
                </g>;
            })() : null}
        </svg>
        {readout ? <figcaption className="mt-3 flex h-5 items-center justify-between font-mono text-[12px] font-medium text-ui-faint">
            <span style={{ color: named?.colour }}>{named ? `${named.book} ${named.chapter}` : " "}</span>
            <span>{named?.division}</span>
        </figcaption> : null}
    </figure>;
}
