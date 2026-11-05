import React, { useEffect, useRef } from "react";
import { MotionValue, useMotionValueEvent } from "framer-motion";
import { centroid, HEIGHT, mix, morphCells, type Point, rounded, WIDTH } from "@/core/style/mosaic";
import type { Placed } from "@/demo/emblem-shapes";

const CELL_SHARE = 0.6; // of a change each stone spends on its way; the rest staggers them top to bottom
const CLOSE = 0.25, OPEN = 0.75, STAR = 0.16; // each stone closes to a star, glides, then opens (as use-mosaic-morph.ts)
/** How much of the scroll either side of a stage holds its shape still, so a stage reads whole before it starts to go */
const HOLD = 0.2;
/** An unlit chapter on the stats shape */
const DIM = "#4a5068";

const glide = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
const clamp = (t: number) => Math.min(1, Math.max(0, t));

type Layer = "bloom" | "stone" | "core";

function Cells({ layer }: { layer: Layer }) {
    return <g>
        {morphCells.map((cell, k) => {
            const paint = layer === "core"
                ? { fill: "none", stroke: "#ffffff", strokeWidth: 0.42, strokeOpacity: 0.75 }
                : { "data-colour": "", fill: cell.colour.b, fillOpacity: 0.14, stroke: cell.colour.b, strokeWidth: layer === "bloom" ? 1.6 : 1.15 };
            return <g key={k} className="glowing-cross-cell" style={{ animationDelay: `${cell.entrance}ms` }}>
                <path data-cell={k} d={rounded(cell.b)} strokeLinejoin="round" {...paint}/>
            </g>;
        })}
    </g>;
}

/**
 * The hero's emblem, as the webapp's GlowingCross draws it (glass stones, a white-hot core and a glow), moved by the
 * scroll rather than a loop. `at` is where the story is, in stages (1.5: half-way from the second to the third); the
 * stones stand in that stage's shape (from emblem-shapes.ts) or, between two, are that far on their way: each closes to a
 * star, glides and opens, in a wave from the top, so scrolling back plays it backwards and stopping part-way holds it
 * there. Each stage holds still for a little scroll either side
 */
export default function StoryEmblem({ stages, at, height = 168 }: { stages: Placed[][]; at: MotionValue<number>; height?: number }) {
    const root = useRef<HTMLDivElement>(null);
    const layers = useRef<SVGPathElement[][]>([]);
    const bloom = useRef<SVGGElement | null>(null);
    // each stage's colours, and where each stone sits in the wave as it leaves that stage
    const looks = useRef(stages.map(stage => stage.map((p, k) => ({ colour: p.dim ? DIM : morphCells[k].colour.b, opacity: p.hidden ? 0 : 1, wave: centroid(p.points)[1] / HEIGHT }))));

    const draw = (s: number) => {
        if (!layers.current.length) return;
        const last = stages.length - 1;
        const i = Math.min(last - 1, Math.max(0, Math.floor(s)));
        const t = clamp((Math.min(last, Math.max(0, s)) - i - HOLD) / (1 - 2 * HOLD));
        const from = stages[i], to = stages[i + 1], a = looks.current[i], b = looks.current[i + 1];
        morphCells.forEach((_, k) => {
            const local = clamp((t - clamp(a[k].wave) * (1 - CELL_SHARE)) / CELL_SHARE);
            const g = glide(clamp((local - CLOSE) / (OPEN - CLOSE)));
            const size = local < CLOSE ? 1 - (1 - STAR) * glide(local / CLOSE) : local > OPEN ? STAR + (1 - STAR) * glide((local - OPEN) / (1 - OPEN)) : STAR;
            const points = from[k].points.map(([x, y], n) => [x + (to[k].points[n][0] - x) * g, y + (to[k].points[n][1] - y) * g] as Point);
            const [cx, cy] = centroid(points);
            const d = rounded(points.map(([x, y]) => [cx + (x - cx) * size, cy + (y - cy) * size] as Point), 1.3 * size);
            const opacity = (a[k].opacity + (b[k].opacity - a[k].opacity) * glide(local)).toFixed(3);
            const colour = mix(a[k].colour, b[k].colour, g);
            layers.current[k].forEach(el => {
                el.setAttribute("d", d);
                el.setAttribute("opacity", opacity);
                if (el.hasAttribute("data-colour")) { el.setAttribute("fill", colour); el.setAttribute("stroke", colour); }
            });
        });
        bloom.current?.setAttribute("opacity", (0.7 + 0.2 * Math.sin(Math.PI * t)).toFixed(3));
    };

    useEffect(() => {
        const element = root.current!;
        layers.current = morphCells.map((_, k) => Array.from(element.querySelectorAll<SVGPathElement>(`[data-cell="${k}"]`)));
        bloom.current = element.querySelector("[data-bloom]");
        draw(at.get());
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    useMotionValueEvent(at, "change", draw);

    const width = height * WIDTH / HEIGHT;
    return <div ref={root} aria-hidden="true" className="glowing-cross" style={{ width, height }}>
        <svg viewBox={`-6 -6 ${WIDTH + 12} ${HEIGHT + 12}`} className="glowing-cross-art">
            <defs>
                <filter id="story-emblem-bloom" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation={1.2} result="neon"/>
                    <feGaussianBlur in="SourceGraphic" stdDeviation={3.5} result="wide"/>
                    <feMerge><feMergeNode in="wide"/><feMergeNode in="neon"/></feMerge>
                </filter>
            </defs>
            <g data-bloom="" opacity={0.7}>
                <g filter="url(#story-emblem-bloom)" className="glowing-cross-bloom"><Cells layer="bloom"/></g>
            </g>
            <Cells layer="stone"/>
            <g className="glowing-cross-filament"><Cells layer="core"/></g>
        </svg>
    </div>;
}
