import React, { useEffect, useRef } from "react";
import { MotionValue, useMotionValueEvent } from "framer-motion";
import { centroid, HEIGHT, mix, morphCells, type Point, rounded, WIDTH } from "@/core/style/mosaic";
import type { Placed } from "@/demo/emblem-shapes";

const CELL_SHARE = 0.55; // of a change each stone spends on its way; the rest staggers them, top first
/** How small a stone gets mid-flight, how far its path bows to one side, and how far it turns on the way */
const SHRINK = 0.5, BOW = 0.28, TURN = 0.5;
/** How much of the scroll either side of a stage holds its shape still, so a stage reads whole before it starts to go */
const HOLD = 0.2;
/** An unlit chapter on the stats shape */
const DIM = "#4a5068";
/** How far the emblem leans towards the pointer (degrees), and how far its glow and white core part in depth (emblem units) */
const LEAN_X = 7, LEAN_Y = 9, DEPTH = 2.2;

/** Eases in and out, gently at both ends */
const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp = (t: number) => Math.min(1, Math.max(0, t));

type Layer = "bloom" | "stone" | "core";

function Cells({ layer }: { layer: Layer }) {
    return <g>
        {morphCells.map((cell, k) => {
            const paint = layer === "core"
                ? { fill: "none", stroke: "#ffffff", strokeWidth: 0.42, strokeOpacity: 0.75 }
                : { "data-colour": "", fill: cell.colour.b, fillOpacity: 0.14, stroke: cell.colour.b, strokeWidth: layer === "bloom" ? 1.6 : 1.15 };
            return <g key={k}>
                <path data-cell={k} data-layer={layer} d={rounded(cell.b)} strokeLinejoin="round" {...paint}/>
            </g>;
        })}
    </g>;
}

/**
 * The hero's emblem, as the webapp's GlowingCross draws it (glass stones, a white-hot core and a glow), moved by the
 * scroll rather than a loop. `at` is where the story is, in stages (1.5: half-way from the second to the third); the
 * stones stand in that stage's shape (from emblem-shapes.ts) or, between two, are that far on their way. Each stone
 * eases off, shrinking to half and turning a little as it goes, along a path that bows to one side, so together they
 * swirl into the new shape rather than cross; they leave in a wave from the top. Scrolling back plays it backwards and
 * stopping part-way holds it there. Each stage holds still for a little scroll either side.
 *
 * It fades in on arrival (.story-emblem-in), and at rest holds still. It leans a little towards the pointer, its glow
 * set deeper and its white core nearer, so it reads as a window with
 * depth; on touch screens it drifts on its own. Under reduced motion, none of that: it only follows the scroll
 */
export default function StoryEmblem({ stages, at, height = 168 }: { stages: Placed[][]; at: MotionValue<number>; height?: number }) {
    const root = useRef<HTMLDivElement>(null);
    const layers = useRef<{ bloom: SVGPathElement; stone: SVGPathElement; core: SVGPathElement }[]>([]);
    const depth = useRef<{ bloom: SVGGElement | null; core: SVGGElement | null }>({ bloom: null, core: null });
    const bloom = useRef<SVGGElement | null>(null);
    // each stage's colours, and where each stone sits in the wave as it leaves that stage
    const looks = useRef(stages.map(stage => stage.map((p, k) => ({ colour: p.dim ? DIM : morphCells[k].colour.b, opacity: p.hidden ? 0 : 1, wave: centroid(p.points)[1] / HEIGHT }))));

    /** The shape as the scroll has it */
    const draw = (s: number) => {
        if (!layers.current.length) return;
        const last = stages.length - 1;
        const i = Math.min(last - 1, Math.max(0, Math.floor(s)));
        const tt = clamp((Math.min(last, Math.max(0, s)) - i - HOLD) / (1 - 2 * HOLD));
        const from = stages[i], to = stages[i + 1], a = looks.current[i], b = looks.current[i + 1];
        morphCells.forEach((_, k) => {
            const local = clamp((tt - clamp(a[k].wave) * (1 - CELL_SHARE)) / CELL_SHARE);
            // one easing for the whole flight: it eases off, travels, and settles, with no stop on the way
            const g = ease(local), arc = Math.sin(Math.PI * g);
            const size = 1 - (1 - SHRINK) * arc;
            // the path bows to the right of the way it's going, so the stones swirl rather than cut straight across one another
            const [ax, ay] = centroid(from[k].points), [bx, by] = centroid(to[k].points);
            const bow: Point = [-(by - ay) * BOW * arc, (bx - ax) * BOW * arc];
            const turn = TURN * arc * (k % 2 ? 1 : -1), cos = Math.cos(turn), sin = Math.sin(turn);
            const points = from[k].points.map(([x, y], n) => [x + (to[k].points[n][0] - x) * g + bow[0], y + (to[k].points[n][1] - y) * g + bow[1]] as Point);
            const [cx, cy] = centroid(points);
            const d = rounded(points.map(([x, y]) => {
                const [dx, dy] = [(x - cx) * size, (y - cy) * size];
                return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos] as Point;
            }), 1.3 * size);
            const opacity = (a[k].opacity + (b[k].opacity - a[k].opacity) * g).toFixed(3);
            const colour = mix(a[k].colour, b[k].colour, g);

            const el = layers.current[k];
            for (const path of [el.bloom, el.stone, el.core]) {
                path.setAttribute("d", d);
                path.setAttribute("opacity", opacity);
            }
            el.bloom.setAttribute("fill", colour); el.bloom.setAttribute("stroke", colour);
            el.stone.setAttribute("fill", colour); el.stone.setAttribute("stroke", colour);
        });
        bloom.current?.setAttribute("opacity", (0.7 + 0.2 * Math.sin(Math.PI * tt)).toFixed(3));
    };

    useEffect(() => {
        const element = root.current!;
        layers.current = morphCells.map((_, k) => {
            const of = (layer: Layer) => element.querySelector<SVGPathElement>(`[data-cell="${k}"][data-layer="${layer}"]`)!;
            return { bloom: of("bloom"), stone: of("stone"), core: of("core") };
        });
        bloom.current = element.querySelector("[data-bloom]");
        depth.current = { bloom: element.querySelector("[data-depth=bloom]"), core: element.querySelector("[data-depth=core]") };
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        draw(at.get());
        if (reduce) return;

        // the lean: towards the pointer where there is one; on touch, a slow drift of its own
        const fine = window.matchMedia("(pointer: fine)").matches;
        const aim = { x: 0, y: 0 }, lean = { x: 0, y: 0 };
        const onPointer = (e: PointerEvent) => { aim.x = e.clientX / window.innerWidth * 2 - 1; aim.y = e.clientY / window.innerHeight * 2 - 1; };
        const onLeave = () => { aim.x = 0; aim.y = 0; };
        if (fine) { window.addEventListener("pointermove", onPointer); document.addEventListener("pointerleave", onLeave); }

        let frame = 0, drawn = at.get();
        const tick = (now: number) => {
            // the shape only when the scroll has moved it; the lean every frame
            const s = at.get();
            if (s !== drawn) { draw(s); drawn = s; }

            if (!fine) { aim.x = Math.sin(now / 2600) * 0.35; aim.y = Math.cos(now / 3300) * 0.3; }
            lean.x += (aim.x - lean.x) * 0.06; lean.y += (aim.y - lean.y) * 0.06;
            element.style.transform = `perspective(700px) rotateX(${(-lean.y * LEAN_X).toFixed(2)}deg) rotateY(${(lean.x * LEAN_Y).toFixed(2)}deg)`;
            depth.current.bloom?.setAttribute("transform", `translate(${(-lean.x * DEPTH).toFixed(2)} ${(-lean.y * DEPTH).toFixed(2)})`);
            depth.current.core?.setAttribute("transform", `translate(${(lean.x * DEPTH * 0.5).toFixed(2)} ${(lean.y * DEPTH * 0.5).toFixed(2)})`);
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("pointermove", onPointer);
            document.removeEventListener("pointerleave", onLeave);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    // under reduced motion there is no frame loop, so the scroll draws it
    useMotionValueEvent(at, "change", s => { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) draw(s); });

    const width = height * WIDTH / HEIGHT;
    return <div ref={root} aria-hidden="true" className="glowing-cross story-emblem-in [transform-style:preserve-3d]" style={{ width, height }}>
        <svg viewBox={`-6 -6 ${WIDTH + 12} ${HEIGHT + 12}`} className="glowing-cross-art">
            <defs>
                <filter id="story-emblem-bloom" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation={1.2} result="neon"/>
                    <feGaussianBlur in="SourceGraphic" stdDeviation={3.5} result="wide"/>
                    <feMerge><feMergeNode in="wide"/><feMergeNode in="neon"/></feMerge>
                </filter>
            </defs>
            <g data-depth="bloom">
                <g data-bloom="" opacity={0.7}>
                    <g filter="url(#story-emblem-bloom)" className="glowing-cross-bloom"><Cells layer="bloom"/></g>
                </g>
            </g>
            <Cells layer="stone"/>
            <g data-depth="core" className="glowing-cross-filament"><Cells layer="core"/></g>
        </svg>
    </div>;
}
