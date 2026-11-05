import React, { useEffect, useMemo, useRef } from "react";
import { MotionValue, useMotionValueEvent } from "framer-motion";
import { centroid, HEIGHT, mix, morphCells, type Point, rounded, WIDTH } from "@/core/style/mosaic";
import type { Placed, ShapeName } from "@/demo/emblem-shapes";

const CELL_SHARE = 0.55; // of a change each stone spends on its way; the rest staggers them, top first
/** How small a stone gets mid-flight, how far its path bows to one side, and how far it turns on the way */
const SHRINK = 0.5, BOW = 0.28, TURN = 0.5;
/** How much of the scroll either side of a stage holds its shape still, so a stage reads whole before it starts to go */
const HOLD = 0.2;
/** An unlit chapter on the stats shape */
const DIM = "#4a5068";
/**
 * The entrance: each stone starts as a point of light scattered round the emblem (RING_IN to RING_OUT from its middle,
 * in emblem units), then spirals in (SPIN turns of a radian) as it grows into its place, the inner stones first
 */
const RING_IN = 55, RING_OUT = 130, SPIN = 2.4, POINT = 0.07;
/** Each stone's flight, in seconds, and how far its start is put back by its distance from the middle */
const FLIGHT = 1.5, STAGGER = 1.3;
/** Deterministic noise in [0, 1) */
const noise = (i: number, seed: number) => { const n = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453; return n - Math.floor(n); };
/** Where each stone sets off from: golden-angle spokes, each at its own distance, as offsets from the emblem's middle */
const SCATTER = morphCells.map((_, k) => {
    const angle = k * 2.39996 + noise(k, 1) * 0.6, r = RING_IN + (RING_OUT - RING_IN) * noise(k, 2);
    return [Math.cos(angle) * r, Math.sin(angle) * r] as Point;
});
const LATEST = Math.max(...morphCells.map(c => c.entrance));
/** How far stone k is through its entrance, `t` seconds in: [eased 0-1, raw 0-1] */
const arrival = (k: number, t: number) => {
    const raw = clamp((t - morphCells[k].entrance / LATEST * STAGGER) / FLIGHT);
    return [1 - Math.pow(1 - raw, 3), raw];
};
/** When the last stone lands */
export const ENTRANCE = STAGGER + FLIGHT;

/** How far the emblem leans towards the pointer (degrees), and how far its glow and white core part in depth (emblem units) */
const LEAN_X = 7, LEAN_Y = 9, DEPTH = 2.2;

/** Eases in and out, gently at both ends */
const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp = (t: number) => Math.min(1, Math.max(0, t));
const bell = (d: number, width: number) => Math.exp(-(d * d) / width);

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

/** A stone's light at rest: `glow` brightens it (0-1); `light` brings an unlit chapter up to its own colour (0-1) */
type Life = { glow: number; light: number };
type Stone = { x: number; y: number; hidden: boolean; dim: boolean };
/** A stage's life at rest: each stone's light `t` seconds after the shape settled */
type Living = (stones: Stone[]) => (k: number, t: number) => Life;

const still: Life = { glow: 0, light: 0 };
const shown = (stones: Stone[]) => stones.map((s, k) => ({ ...s, k })).filter(s => !s.hidden);
const nearest = (stones: Stone[], x: number, y: number) =>
    shown(stones).reduce((best, s) => Math.hypot(s.x - x, s.y - y) < Math.hypot(best.x - x, best.y - y) ? s : best).k;

/**
 * Each shape's life once it has settled, so a stage that's read whole has something to watch:
 * - the cross: light spreading from where the beams meet
 * - the map: a guess hops across two books and lands on today's chapter, which breathes
 * - the book: a reading light runs along the lines, word by word
 * - the question: a light runs down the curve; the dot blinks, as a cursor waits
 * - the stats: the unlit chapters light one by one, a streak building, then rest and begin again
 */
const LIVES: Partial<Record<ShapeName, Living>> = {
    cross: stones => {
        const centre = shown(stones).reduce((c, s, _, all) => [c[0] + s.x / all.length, c[1] + s.y / all.length], [0, 0]);
        const far = Math.max(...shown(stones).map(s => Math.hypot(s.x - centre[0], s.y - centre[1])));
        return (k, t) => {
            const d = Math.hypot(stones[k].x - centre[0], stones[k].y - centre[1]) / far;
            return { glow: 0.65 * bell(d - ((t * 0.45) % 1.5 - 0.15), 0.02), light: 0 };
        };
    },
    map: stones => {
        const hops = [nearest(stones, 62, 82), nearest(stones, -2, 20)], today = nearest(stones, 21, 46);
        return (k, t) => {
            const hop = hops.findIndex((h, n) => h === k && t > 0.35 + n * 0.55 && t < 0.35 + (n + 1) * 0.55);
            if (hop >= 0) return { glow: 1 - (t - 0.35 - hop * 0.55) / 0.55 * 0.7, light: 0 };
            if (k === today && t > 1.45) return { glow: 0.55 + 0.45 * Math.pow(Math.sin((t - 1.45) * 2.2 + Math.PI / 2), 2), light: 0 };
            return still;
        };
    },
    book: stones => {
        // reading order: the left page then the right, each line by line, each word left to right
        const order = shown(stones).sort((a, b) => (a.x > 30 ? 1 : 0) - (b.x > 30 ? 1 : 0) || Math.round(a.y / 4) - Math.round(b.y / 4) || a.x - b.x);
        const at = new Map(order.map((s, r) => [s.k, r]));
        const pace = 0.11, period = order.length * pace + 1.8;
        return (k, t) => {
            const r = at.get(k);
            if (r === undefined) return still;
            return { glow: 0.85 * bell((t % period) / pace - 2 - r, 2.2), light: 0 };
        };
    },
    question: stones => (k, t) => {
        const { y } = stones[k];
        if (y > 70) return { glow: 0.9 * clamp(Math.sin(t * Math.PI * 1.4) * 3), light: 0 };
        return { glow: 0.7 * bell(((t % 2.8) / 2) * 90 - y, 70), light: 0 };
    },
    stats: stones => {
        const unlit = shown(stones).filter(s => s.dim).map(s => s.k);
        const gap = 0.32, start = 0.5, period = start + unlit.length * gap + 2.4;
        return (k, t) => {
            const j = unlit.indexOf(k);
            if (j < 0) return still;
            const tc = t % period, on = start + j * gap;
            // all lit, then they dim back together before the streak starts over
            const back = clamp((period - 0.6 - tc) / 0.6);
            return { glow: tc > on ? 0.9 * Math.exp(-(tc - on) * 3.5) : 0, light: clamp((tc - on) / 0.25) * back };
        };
    },
};

/**
 * The hero's emblem, as the webapp's GlowingCross draws it (glass stones, a white-hot core and a glow), moved by the
 * scroll rather than a loop. `at` is where the story is, in stages (1.5: half-way from the second to the third); the
 * stones stand in that stage's shape (from emblem-shapes.ts) or, between two, are that far on their way. Each stone
 * eases off, shrinking to half and turning a little as it goes, along a path that bows to one side, so together they
 * swirl into the new shape rather than cross; they leave in a wave from the top. Scrolling back plays it backwards and
 * stopping part-way holds it there. Each stage holds still for a little scroll either side.
 *
 * It enters from points of light scattered round it, spiralling in to form the B, the inner stones first (SCATTER).
 * At rest it lives: each step's shape plays its own small loop (LIVES).
 * It leans a little towards the pointer, its glow set deeper and its white core nearer, so it reads as a window with
 * depth; on touch screens it drifts on its own. Under reduced motion, none of that: it only follows the scroll
 */
export default function StoryEmblem({ stages, names, at, height = 168 }: { stages: Placed[][]; names: ShapeName[]; at: MotionValue<number>; height?: number }) {
    const root = useRef<HTMLDivElement>(null);
    const layers = useRef<{ bloom: SVGPathElement; stone: SVGPathElement; core: SVGPathElement }[]>([]);
    const depth = useRef<{ bloom: SVGGElement | null; core: SVGGElement | null }>({ bloom: null, core: null });
    const bloom = useRef<SVGGElement | null>(null);
    // each stage's colours, and where each stone sits in the wave as it leaves that stage
    const looks = useRef(stages.map(stage => stage.map((p, k) => ({ colour: p.dim ? DIM : morphCells[k].colour.b, opacity: p.hidden ? 0 : 1, wave: centroid(p.points)[1] / HEIGHT }))));
    // each stage's stones as its life needs them, and the life itself
    const lives = useMemo(() => stages.map((stage, i) => {
        const stones = stage.map(p => { const [x, y] = centroid(p.points); return { x, y, hidden: p.hidden, dim: p.dim }; });
        const living = LIVES[names[i]];
        return living ? living(stones) : undefined;
    }), [stages, names]);

    /**
     * The shape as the scroll has it, and the life at rest on top: `rest` (0-1) is how settled, `t` how long since;
     * `intro` is how far into the entrance (seconds; past ENTRANCE, it's done)
     */
    const draw = (s: number, rest: number, t: number, intro = ENTRANCE) => {
        if (!layers.current.length) return;
        const last = stages.length - 1;
        const i = Math.min(last - 1, Math.max(0, Math.floor(s)));
        const tt = clamp((Math.min(last, Math.max(0, s)) - i - HOLD) / (1 - 2 * HOLD));
        const from = stages[i], to = stages[i + 1], a = looks.current[i], b = looks.current[i + 1];
        const settled = Math.round(Math.min(last, Math.max(0, s)));
        const life = rest > 0 ? lives[settled] : undefined;
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
            // the entrance: from its point of light, round the spiral, growing into place
            const [e, raw] = intro < ENTRANCE ? arrival(k, intro) : [1, 1];
            const [ox, oy] = [WIDTH / 2 + SCATTER[k][0] - cx, HEIGHT / 2 + SCATTER[k][1] - cy];
            const spin = SPIN * (1 - e), far = 1 - e;
            const [px, py] = [cx + (ox * Math.cos(spin) - oy * Math.sin(spin)) * far, cy + (ox * Math.sin(spin) + oy * Math.cos(spin)) * far];
            const grow = size * (POINT + (1 - POINT) * e), twist = turn + spin * 1.5;
            const [tc, ts] = [Math.cos(twist), Math.sin(twist)];
            const d = rounded(points.map(([x, y]) => {
                const [dx, dy] = [(x - cx) * grow, (y - cy) * grow];
                return [px + dx * tc - dy * ts, py + dx * ts + dy * tc] as Point;
            }), 1.3 * grow);
            const opacity = ((a[k].opacity + (b[k].opacity - a[k].opacity) * g) * clamp(raw * 5)).toFixed(3);
            let colour = mix(a[k].colour, b[k].colour, g);

            const { glow, light } = life ? life(k, t) : still;
            // a point of light in flight burns bright, cooling as it lands
            const lift = Math.max(clamp(glow * rest), 1 - e);
            if (light > 0) colour = mix(colour, morphCells[k].colour.b, light * rest);

            const el = layers.current[k];
            for (const path of [el.bloom, el.stone, el.core]) {
                path.setAttribute("d", d);
                path.setAttribute("opacity", opacity);
            }
            el.bloom.setAttribute("fill", colour); el.bloom.setAttribute("stroke", colour);
            el.stone.setAttribute("fill", colour); el.stone.setAttribute("stroke", colour);
            el.stone.setAttribute("fill-opacity", (0.14 + 0.42 * lift).toFixed(3));
            el.bloom.setAttribute("stroke-width", (1.6 + 1.4 * lift).toFixed(3));
            el.core.setAttribute("stroke-opacity", (0.75 + 0.25 * lift).toFixed(3));
        });
        bloom.current?.setAttribute("opacity", (0.7 + 0.2 * Math.sin(Math.PI * tt) + (intro < ENTRANCE ? 0.25 * (1 - intro / ENTRANCE) : 0)).toFixed(3));
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
        draw(at.get(), 0, 0, reduce ? ENTRANCE : 0);
        if (reduce) return;

        // the lean: towards the pointer where there is one; on touch, a slow drift of its own
        const fine = window.matchMedia("(pointer: fine)").matches;
        const aim = { x: 0, y: 0 }, lean = { x: 0, y: 0 };
        const onPointer = (e: PointerEvent) => { aim.x = e.clientX / window.innerWidth * 2 - 1; aim.y = e.clientY / window.innerHeight * 2 - 1; };
        const onLeave = () => { aim.x = 0; aim.y = 0; };
        if (fine) { window.addEventListener("pointermove", onPointer); document.addEventListener("pointerleave", onLeave); }

        let frame = 0, settledOn = -1, since = 0, born = -1;
        const tick = (now: number) => {
            if (born < 0) born = now;
            const intro = (now - born) / 1000;
            const s = at.get();
            const stage = Math.round(s);
            const rest = clamp((HOLD - Math.abs(s - stage)) / (HOLD * 0.6));
            if (rest > 0 && settledOn !== stage) { settledOn = stage; since = now; }
            if (rest === 0) settledOn = -1;
            // the life waits for the entrance's last stone to land
            const landed = born + (ENTRANCE - 0.35) * 1000;
            draw(s, rest, rest > 0 ? Math.max(0, now - Math.max(since, landed)) / 1000 : 0, intro);

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
    useMotionValueEvent(at, "change", s => { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) draw(s, 0, 0); });

    const width = height * WIDTH / HEIGHT;
    return <div ref={root} aria-hidden="true" className="glowing-cross [transform-style:preserve-3d]" style={{ width, height }}>
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
