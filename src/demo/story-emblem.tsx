import React, { useEffect, useMemo, useRef } from "react";
import { centroid, HEIGHT, mix, morphCells, type Point, rounded, WIDTH } from "@/core/style/mosaic";
import type { Placed } from "@/demo/emblem-shapes";

/** How long the stones take to travel from one shape to the next */
const MORPH = 1500;
const CELL_SHARE = 0.65; // of the morph each stone spends on its way; the rest staggers them top to bottom
const CLOSE = 0.25, OPEN = 0.75, STAR = 0.16; // each stone closes to a star, glides, then opens (as use-mosaic-morph.ts)
/** An unlit chapter on the stats shape */
const DIM = "#4a5068";

const glide = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
const clamp = (t: number) => Math.min(1, Math.max(0, t));

type Drawn = { points: Point[]; size: number; opacity: number; colour: string };

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
 * The hero's emblem, as the webapp's GlowingCross draws it (glass stones, a white-hot core and a glow), but led by the
 * story rather than a loop: given the shapes of each stage (`stages`, from emblem-shapes.ts) and the stage it's at, the
 * stones drift to that shape, each closing to a star on the way, in a wave from the top (from the bottom going back).
 * A change of stage mid-way starts from wherever the stones are. Under reduced motion they move at once
 */
export default function StoryEmblem({ stages, stage, height = 168 }: { stages: Placed[][]; stage: number; height?: number }) {
    const root = useRef<HTMLDivElement>(null);
    const colours = useMemo(() => morphCells.map(c => c.colour.b), []);
    const drawn = useRef<Drawn[]>(morphCells.map((c, k) => ({ points: c.b, size: 1, opacity: 1, colour: colours[k] })));
    const last = useRef(stage);
    const started = useRef(false);

    useEffect(() => {
        const element = root.current;
        if (!element) return;
        const layers = morphCells.map((_, k) => Array.from(element.querySelectorAll<SVGPathElement>(`[data-cell="${k}"]`)));
        const bloom = element.querySelector<SVGGElement>("[data-bloom]");
        // first drawn as the B (the server's render): nothing to move unless the page opened further down
        if (!started.current) { started.current = true; if (stage === 0) return; }
        const forward = stage >= last.current;
        last.current = stage;

        const target = stages[stage];
        const from = drawn.current.map(d => ({ ...d }));
        const to = target.map((p, k): Drawn => ({ points: p.points, size: 1, opacity: p.hidden ? 0 : 1, colour: p.dim ? DIM : colours[k] }));

        const paint = (k: number, d: Drawn) => {
            const [cx, cy] = centroid(d.points);
            const path = rounded(d.points.map(([x, y]) => [cx + (x - cx) * d.size, cy + (y - cy) * d.size] as Point), 1.3 * d.size);
            layers[k].forEach(el => {
                el.setAttribute("d", path);
                el.setAttribute("opacity", d.opacity.toFixed(3));
                if (el.hasAttribute("data-colour")) { el.setAttribute("fill", d.colour); el.setAttribute("stroke", d.colour); }
            });
        };

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            to.forEach((d, k) => { drawn.current[k] = d; paint(k, d); });
            return;
        }

        // the wave runs by each stone's height where it starts
        const heights = from.map(d => centroid(d.points)[1] / HEIGHT);
        const start = performance.now();
        let frame = 0;
        const tick = (now: number) => {
            const elapsed = clamp((now - start) / MORPH);
            from.forEach((a, k) => {
                const b = to[k];
                const lead = forward ? heights[k] : 1 - heights[k];
                const local = clamp((elapsed - clamp(lead) * (1 - CELL_SHARE)) / CELL_SHARE);
                const g = glide(clamp((local - CLOSE) / (OPEN - CLOSE)));
                // the size closes from wherever it was, to a star, then opens to the new stone's
                const size = local < CLOSE ? a.size + (STAR - a.size) * glide(local / CLOSE)
                    : local > OPEN ? STAR + (b.size - STAR) * glide((local - OPEN) / (1 - OPEN)) : STAR;
                const d: Drawn = {
                    points: a.points.map(([x, y], i) => [x + (b.points[i][0] - x) * g, y + (b.points[i][1] - y) * g] as Point),
                    size,
                    opacity: a.opacity + (b.opacity - a.opacity) * glide(local),
                    colour: mix(a.colour, b.colour, g),
                };
                drawn.current[k] = d;
                paint(k, d);
            });
            bloom?.setAttribute("opacity", (0.7 + 0.2 * Math.sin(Math.PI * elapsed)).toFixed(3));
            if (elapsed < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [stage, stages, colours]);

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
