import { align, centroid, COOL, glass, mix, morphCells, type Point, sample, sixCorners, WARM } from "@/core/style/mosaic";
import regionColours from "@/app/play/[game]/map/config/colours.json";

/**
 * The landing emblem's shapes, one per stage of the story, all laid as glass stones in the B's coordinate space (about
 * -11 to 71 across, 0 to 96 down), so the stones of the B can travel between them. A shape may have fewer stones than
 * the B: the spare ones fold, unseen, into the stone nearest them.
 */

/** A stone as a stage shows it: its corners, whether it's there at all, and a colour of its own (else the stone's) */
export type Slot = { points: Point[]; hidden?: boolean; colour?: string; dim?: boolean };
export type Shape = Slot[];

/** Deterministic noise in [0, 1) */
const noise = (i: number, seed: number) => { const n = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453; return n - Math.floor(n); };


/**
 * The stone grammar, measured from the B, which every shape keeps so they read as one family: the same frame, the same
 * amount of glass, stones of the same weight, cut by the same hand, all of them lit. `npm run check:emblems` holds each
 * step shape to it (the B and the cross are the references).
 * - frame: about the B's 81 x 94 units; at least FRAME.minHeight tall and FRAME.minWidth wide
 * - glass: the stones' total area within GLASS of the B's; a glyph (the question mark, as the cross) may run lighter
 *   (glassFor), its stroke slimmer so it reads as a mark
 * - stones: a typical stone at least STONE.median thick (its short side), none under STONE.min
 * - light: at most DIM_SHARE of the stones dim, and none white; dim is for meaning (unread, unlit) only
 * - count: 28 to 38 stones; the B's spare stones fold away into the nearest (as into the cross's 28), so a shape may use
 *   fewer, bigger stones where that keeps them at the B's weight
 */
export const GRAMMAR = {
    frame: { minHeight: 84, minWidth: 54 },
    glass: { min: 0.78, max: 1.18 },
    glassFor: { question: 0.6 } as Record<string, number>,
    stone: { median: 8, min: 5.5 },
    dimShare: 0.25,
    count: { min: 28, max: 38 },
    dim: ["#4a5068", "#5b6079"],
    white: ["#e6e8f5", "#ffffff"],
};

/** A shape's measures against the grammar: frame, total glass, stone thickness (median and least), dim share */
export function measure(shape: Shape) {
    const stones = shape.filter(s => !s.hidden);
    const area = (ps: Point[]) => Math.abs(ps.reduce((sum, p, k) => { const q = ps[(k + 1) % ps.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
    const perimeter = (ps: Point[]) => ps.reduce((sum, p, k) => { const q = ps[(k + 1) % ps.length]; return sum + Math.hypot(q[0] - p[0], q[1] - p[1]); }, 0);
    // a stone's thickness: 4 x area / perimeter, its short side for a long stone and its side for a square one
    const thick = stones.map(s => 4 * area(s.points) / perimeter(s.points)).sort((a, b) => a - b);
    const xs = stones.flatMap(s => s.points.map(p => p[0])), ys = stones.flatMap(s => s.points.map(p => p[1]));
    const colours = stones.map((s, k) => (s.colour ?? morphCells[k]?.colour.b ?? "").toLowerCase());
    return {
        count: stones.length,
        width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys),
        glass: stones.reduce((sum, s) => sum + area(s.points), 0),
        median: thick[Math.floor(thick.length / 2)], least: thick[0],
        dim: colours.filter(c => GRAMMAR.dim.includes(c)).length / stones.length,
        white: colours.filter(c => GRAMMAR.white.includes(c)).length,
    };
}

/** A stone from its outline: inset by the lead, given six corners */
const stone = (outline: Point[], colour: string): Slot => ({ points: sixCorners(glass(outline)), colour });

/**
 * A bar of `count` stones from x0 to x1 between y0 and y1, cut at uneven places, each cut a little off true and the
 * bar's edges a little uneven, as hand-cut glass is; or, `precise`, every cut and edge true, as the grid map is drawn.
 * `shares` sets each stone's length (else they vary by `seed`)
 */
function bar(x0: number, x1: number, y0: number, y1: number, count: number, seed: number, shares?: number[], precise = false): Point[][] {
    const sizes = shares ?? [...Array(count)].map((_, k) => 0.75 + 0.5 * noise(k, seed));
    const total = sizes.reduce((sum, v) => sum + v, 0);
    const lean = (k: number) => precise ? 0 : (noise(k, seed + 31) - 0.5) * 1.8;
    const edge = (k: number, top: boolean) => precise ? 0 : (noise(k, seed + (top ? 47 : 53)) - 0.5) * 1.1;
    const cuts = [x0];
    sizes.forEach(v => cuts.push(cuts[cuts.length - 1] + (x1 - x0) * v / total));
    return sizes.map((_, k) => {
        const a = cuts[k], b = cuts[k + 1];
        const la = k === 0 ? 0 : lean(k), lb = k === count - 1 ? 0 : lean(k + 1);
        return [[a + la, y0 + edge(k, true)], [b + lb, y0 + edge(k + 1, true)], [b - lb, y1 + edge(k + 1, false)], [a - la, y1 + edge(k, false)]];
    });
}

/** 00 Hero and Purpose: the logo's B, then the cross (the B's spare stones fold into the cross's) */
const B: Shape = morphCells.map(c => ({ points: c.b }));
const CROSS: Shape = morphCells.map(c => ({ points: c.cross, hidden: c.extra }));

/**
 * 01 Play: the grid map in glass, as Play lays the Bible out: the Old Testament above, the New below, each in its
 * divisions, each division in its region's colour and sized by its chapters (the New a touch taller than its chapters
 * alone would make it, and no division narrower than MIN_DIVISION, so every stone keeps the B's weight). Within a
 * division, a stone per book or run of books (Psalms in two), 30 in all, the B's spare stones folding away. The books are
 * cut as a treemap, halves of near-equal chapters; the lead between
 * divisions and testaments is wider, so the structure reads first. Every cut runs true, as the grid map's lines do, and
 * every stone glows in the B's own colours: each division a stretch of the B's cool or warm run in its region's family
 * (Law blue to cyan, History periwinkle, Wisdom red to orange, the prophets mint and gold, and so on). Figma: Emblem
 * 1.2.0 Map
 */
type Book = { label: string; chapters: number };
/** A division: its books, its region's colour (for the step's tint and the stats), and its glass: a stretch of one of the
 * B's runs (COOL or WARM, from and to), in the B's own luminous colours, so the map glows as the B does */
type Division = { name: string; colour: string; glass: [typeof COOL | typeof WARM, number, number]; books: Book[] };
const REGION = regionColours as Record<string, string>;
const run = (label: string, chapters: number): Book => ({ label, chapters });
const OT_TOP: Division[] = [
    { name: "Law", colour: REGION.GEN, glass: [COOL, 0.45, 0.8], books: [run("GEN", 50), run("EXO", 40), run("LEV", 27), run("NUM", 36), run("DEU", 34)] },
    { name: "History", colour: REGION.JOS, glass: [COOL, 0, 0.4], books: [run("JOS JDG RUT", 49), run("1SA 2SA", 55), run("1KI 2KI", 47), run("1CH 2CH", 65), run("EZR NEH EST", 33)] },
];
const OT_BOTTOM: Division[] = [
    { name: "Wisdom", colour: REGION.JOB, glass: [WARM, 0, 0.3], books: [run("JOB", 42), run("PSA 1–72", 72), run("PSA 73–150", 78), run("PRO", 31), run("ECC SNG", 20)] },
    { name: "Major Prophets", colour: REGION.ISA, glass: [COOL, 0.8, 1], books: [run("ISA", 66), run("JER LAM", 57), run("EZK DAN", 60)] },
    { name: "Minor Prophets", colour: REGION.HOS, glass: [WARM, 0.62, 0.85], books: [run("HOS–MIC", 39), run("NAM–MAL", 28)] },
];
const NT: Division[] = [
    { name: "Gospels", colour: REGION.MAT, glass: [WARM, 0.5, 0.75], books: [run("MAT", 28), run("MRK", 16), run("LUK JHN", 45)] },
    { name: "Early Church", colour: REGION.ACT, glass: [COOL, 0.92, 1], books: [run("ACT", 28)] },
    { name: "Paul", colour: REGION.ROM, glass: [COOL, 0.45, 0.8], books: [run("ROM", 16), run("1CO 2CO", 29), run("GAL–2TH", 28), run("1TI–HEB", 27)] },
    { name: "General Letters", colour: REGION.JAS, glass: [WARM, 0.18, 0.38], books: [run("JAS–JUD", 21)] },
    { name: "Prophecy", colour: REGION.REV, glass: [COOL, 0, 0.2], books: [run("REV", 22)] },
];
const MAP: Shape = (() => {
    const X0 = -4, X1 = 64, Y0 = 1, Y1 = 95, TESTAMENT_GAP = 4.8, DIVISION_LEAD = 1.5, MIN_DIVISION = 9.5;
    const chapters = (books: Book[]) => books.reduce((sum, b) => sum + b.chapters, 0);
    const size = (divisions: Division[]) => divisions.reduce((sum, d) => sum + chapters(d.books), 0);
    const lerp = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    type Quad = [Point, Point, Point, Point];
    // the books as a treemap: halves of near-equal chapters, cut the long way, true, as the grid map is drawn
    const treemap = (books: Book[], q: Quad): Quad[] => {
        if (books.length === 1) return [q];
        const total = chapters(books);
        let acc = 0, best = 1, bestErr = Infinity;
        for (let k = 1; k < books.length; k++) { acc += books[k - 1].chapters; const err = Math.abs(acc - total / 2); if (err < bestErr) { bestErr = err; best = k; } }
        const a = books.slice(0, best), b = books.slice(best), share = chapters(a) / total;
        const [tl, tr, br, bl] = q;
        const w = Math.hypot(tr[0] - tl[0], tr[1] - tl[1]), h = Math.hypot(bl[0] - tl[0], bl[1] - tl[1]);
        if (w >= h) {
            const top = lerp(tl, tr, share), bottom = lerp(bl, br, share);
            return [...treemap(a, [tl, top, bottom, bl]), ...treemap(b, [top, tr, br, bottom])];
        }
        const left = lerp(tl, bl, share), right = lerp(tr, br, share);
        return [...treemap(a, [tl, tr, right, left]), ...treemap(b, [left, right, br, bl])];
    };
    // divisions side by side across a band, by chapters, none narrower than MIN_DIVISION
    const band = (divisions: Division[], x: number, y: number, w: number, h: number) => {
        let widths = divisions.map(d => w * chapters(d.books) / size(divisions));
        const extra = widths.reduce((sum, v) => sum + Math.max(0, MIN_DIVISION - v), 0);
        const roomy = widths.reduce((sum, v) => sum + (v >= MIN_DIVISION ? v : 0), 0);
        if (extra) widths = widths.map(v => v < MIN_DIVISION ? MIN_DIVISION : v - extra * v / roomy);
        let at = x;
        return divisions.map((d, i) => { const block = { d, x: at, y, w: widths[i], h }; at += widths[i]; return block; });
    };
    const W = X1 - X0, H = Y1 - Y0 - TESTAMENT_GAP;
    const ot = size([...OT_TOP, ...OT_BOTTOM]), nt = size(NT);
    const ntH = Math.max(H * nt / (ot + nt), H * 0.27), otH = H - ntH;
    const topH = otH * size(OT_TOP) / ot;
    const blocks = [...band(OT_TOP, X0, Y0, W, topH), ...band(OT_BOTTOM, X0, Y0 + topH, W, otH - topH), ...band(NT, X0, Y0 + otH + TESTAMENT_GAP, W, ntH)];
    // each stone takes its colour from its division's stretch of the B's run, by where it sits, top to bottom, as the
    // B's runs flow down its strokes
    return blocks.flatMap(({ d, x, y, w, h }) => {
        const inner: Quad = [[x + DIVISION_LEAD, y + DIVISION_LEAD], [x + w - DIVISION_LEAD, y + DIVISION_LEAD], [x + w - DIVISION_LEAD, y + h - DIVISION_LEAD], [x + DIVISION_LEAD, y + h - DIVISION_LEAD]];
        const [run, from, to] = d.glass;
        return treemap(d.books, inner).map(q => {
            const [cx, cy] = q.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]);
            const t = Math.min(1, Math.max(0, ((cy - y) / h) * 0.75 + ((cx - x) / w) * 0.25));
            return { points: sixCorners(glass(q)), colour: sample(run, from + (to - from) * t) };
        });
    });
})();

/**
 * 02 Read: an open book, and light rising from it. The book lies low in the frame, seen a little from above, two stones
 * tall: two pages rising from the spine to their outer corners, each a line of four stones lit as the rays over them,
 * and beneath them the cover (the page blocks in three) in the same colours carried down; the spine's tab in mint,
 * under the middle ray. Over it an arch of light broken into seven rays,
 * set evenly round the arch with dark between them, each an inner and an outer stone; the gaps open as the arch does.
 * The rays glow in the B's runs: warm on the left (red up to gold), mint at the top, cool on the right down to
 * periwinkle. Every cut true. 15 stones in the book and 14 in the light: 29. Figma: Emblem 1.2.0 Book
 */
const BOOK: Shape = (() => {
    type Quad = { st: Point; ot: Point; ob: Point; sb: Point }; // spine top, outer top, outer bottom, spine bottom
    const lerp = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    // a cell of a quad, from u0 to u1 along it (spine to outer edge) and v0 to v1 down it, every cut straight
    const cell = (q: Quad, u0: number, u1: number, v0: number, v1: number): Point[] => {
        const at = (u: number, v: number) => lerp(lerp(q.st, q.ot, u), lerp(q.sb, q.ob, u), v);
        return [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
    };
    const mirror = ([x, y]: Point): Point => [60 - x, y];
    const out: Slot[] = [];

    // the book, two stones tall: each page a line of four, its page block beneath in three, then the spine's tab
    const left: Quad = { st: [30, 70], ot: [-7, 63], ob: [-8, 74], sb: [30, 81] };
    const right: Quad = { st: mirror(left.st), ot: mirror(left.ot), ob: mirror(left.ob), sb: mirror(left.sb) };
    [left, right].forEach((page, side) => {
        // the pages lit as the rays over them: warm from red at the left edge to gold at the spine, cool from mint at
        // the spine to periwinkle at the right edge (t: 0 at the spine, 1 at the outer edge)
        const lit = (t: number) => side === 0 ? sample(WARM, 0.55 * (1 - t)) : sample(COOL, 0.98 - 0.98 * t);
        const cuts = [0, 0.27, 0.52, 0.76, 1];
        cuts.slice(0, -1).forEach((u, k) => out.push(stone(cell(page, u, cuts[k + 1], 0, 1), lit((u + cuts[k + 1]) / 2))));
        // the cover beneath, in the pages' colours carried down
        const inner = lerp(page.sb, page.ob, 0.15);
        const block: Quad = { st: inner, ot: page.ob, ob: [page.ob[0] + (side ? 1 : -1), page.ob[1] + 9], sb: [inner[0], inner[1] + 9] };
        [[0, 0.32], [0.32, 0.65], [0.65, 1]].forEach(([a, b]) => out.push(stone(cell(block, a, b, 0, 1), lit(0.15 + 0.85 * (a + b) / 2))));
    });
    out.push(stone([[24.5, 81.5], [35.5, 81.5], [35.5, 91.5], [24.5, 91.5]], sample(COOL, 1))); // the spine's tab in mint, under the middle ray

    // the light: seven rays round an arch from the spine (degrees, 0 to the right, up negative), squashed across to fit
    // the frame; each ray an inner stone [from, to, width] and an outer one, the outer narrower so the gaps open
    const C: Point = [30, 68], SQUASH = 0.72, RAYS = 7, FIRST = 203, LAST = 337;
    const INNER = [13.5, 33, 18.5], OUTER = [35.5, 64, 15];
    const at = (deg: number, r: number): Point => [C[0] + Math.cos(deg * Math.PI / 180) * r * SQUASH, C[1] + Math.sin(deg * Math.PI / 180) * r];
    const colour = (t: number) => t < 0.5 ? sample(WARM, t * 2) : sample(COOL, (1 - t) * 2 * 0.98 + 0.02);
    for (const [r0, r1, width] of [INNER, OUTER]) for (let k = 0; k < RAYS; k++) {
        const mid = FIRST + (LAST - FIRST) * k / (RAYS - 1), a = mid - width / 2, b = mid + width / 2;
        out.push(stone([at(a, r1), at(b, r1), at(b, r0), at(a, r0)], colour(k / (RAYS - 1))));
    }
    return out;
})();

/**
 * 03 Study: a question mark drawn as a glyph, slimmer than the B's strokes so it reads as a mark rather than a block: a
 * stroke that sets off from a tapered tip at the left, rises over the top, and comes down through the neck in one smooth
 * curve that arrives at the stem upright, so the stem ends level; then a dot as wide as the stroke. The stroke is two rows
 * of stones with staggered joints, as the B's strokes are, coloured as the B is: cool up the left (mint to periwinkle),
 * warm from the top (red through orange and amber to gold at the stem and dot). 24 stones in the stroke (12 a row) and 4
 * in the dot: 28. Every cut true. Like the cross, a glyph, so lighter in glass than the B (GRAMMAR.glassFor). Figma:
 * Emblem 1.2.0 Question
 */
const QUESTION: Shape = (() => {
    const CX = 30, CY = 33.5, R = 24, START = 166, END = 404, W = 20, PULL = 9, NECK = 60, STEM_END = 76.5, DOT = 81;
    const rad = (a: number) => a * Math.PI / 180;
    // the stroke's centre line, sampled: the hook's arc; then the neck, a curve that leaves the arc along it and arrives
    // at the stem upright; then the stem, straight down
    const pts: Point[] = [];
    for (let a = START; a <= END; a += 2) pts.push([CX + R * Math.cos(rad(a)), CY + R * Math.sin(rad(a))]);
    const p0 = pts[pts.length - 1], tangent: Point = [-Math.sin(rad(END)), Math.cos(rad(END))];
    const p1: Point = [p0[0] + tangent[0] * PULL, p0[1] + tangent[1] * PULL], p2: Point = [CX, NECK], p3: Point = [CX, STEM_END - 7];
    for (let t = 0.05; t <= 1.0001; t += 0.05) {
        const u = 1 - t;
        pts.push([u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0], u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]]);
    }
    for (let y = STEM_END - 6; y <= STEM_END + 0.001; y += 1) pts.push([CX, y]);
    // arc length along it, and the point and normal at any length
    const len = [0];
    for (let k = 1; k < pts.length; k++) len.push(len[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    const L = len[len.length - 1];
    const at = (s: number) => {
        let k = len.findIndex(v => v >= s);
        if (k <= 0) k = 1;
        const t = (s - len[k - 1]) / (len[k] - len[k - 1] || 1);
        const [a, b] = [pts[k - 1], pts[k]], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as Point, n: [-(b[1] - a[1]) / d, (b[0] - a[0]) / d] as Point };
    };
    // the stroke tapers from the tip and holds its width from a sixth of the way
    const width = (s: number) => W * (0.8 + 0.2 * Math.min(1, s / (L / 6)));
    const off = (s: number, side: number) => { const { p, n } = at(s); return [p[0] + n[0] * side * width(s) / 2, p[1] + n[1] * side * width(s) / 2] as Point; };
    // the B's runs: cool up the left, warm from the top
    const RUN: [number, string][] = [[0, "#55f0bf"], [0.12, "#40e6f2"], [0.26, "#6d9cff"], [0.37, "#8f8dff"], [0.43, "#ff5244"], [0.56, "#ff7d35"], [0.7, "#ffb12e"], [0.84, "#ffd034"], [1, "#ffd94a"]];
    const colourAt = (t: number) => { const k = RUN.findIndex(([v]) => v >= t); if (k <= 0) return RUN[0][1]; const [a, ca] = RUN[k - 1], [b, cb] = RUN[k]; return mix(ca, cb, (t - a) / (b - a)); };
    const out: Slot[] = [];
    // the outer row, joints evenly along; the inner row, its joints between them
    const STONES = 12;
    const outer = [...Array(STONES + 1)].map((_, k) => k * L / STONES);
    const inner = [0, ...[...Array(STONES - 1)].map((_, k) => (k + 0.5) * L / STONES), L];
    for (const [side, cuts] of [[1, outer], [-1, inner]] as const) {
        for (let k = 0; k < cuts.length - 1; k++) {
            const [a, b] = [cuts[k], cuts[k + 1]];
            out.push(stone([off(a, 0), off(b, 0), off(b, side), off(a, side)], colourAt((a + b) / 2 / L)));
        }
    }
    // the dot: four stones as wide as the stroke, every cut true
    const [x0, x1, y0, y1] = [CX - W / 2, CX + W / 2, DOT, 95], my = (DOT + 95) / 2;
    [[[x0, y0], [CX, y0], [CX, my], [x0, my]], [[CX, y0], [x1, y0], [x1, my], [CX, my]],
        [[x0, my], [CX, my], [CX, y1], [x0, y1]], [[CX, my], [x1, my], [x1, y1], [CX, y1]]]
        .forEach((cell, k) => out.push(stone(cell as Point[], k % 3 ? "#ffd94a" : "#ffd034")));
    return out;
})();

/**
 * 04 Statistics: the statistics page's progress, at the B's weight and in its colours. Three divisions, each a heading
 * stone over its books; each book a bar of five stones, lit as far as it's been read, the rest dim: Wisdom, the major and
 * the minor prophets, read unevenly, as a player's Bible is. Each division glows in the same stretch of the B's runs it
 * takes on the map (Wisdom red to orange, the major prophets cyan to mint, the minor amber to gold), flowing along each
 * bar as progress does; every cut true and the leading even, as the map's. 3 headings and 7 bars of 5: 38 stones.
 * Figma: Emblem 1.2.0 Stats
 */
const STATS: Shape = (() => {
    const UNREAD = "#4a5068";
    const [wisdom, major, minor] = OT_BOTTOM;
    const groups = [
        { division: wisdom, read: [3, 5] },
        { division: major, read: [2, 4] },
        { division: minor, read: [5, 4, 3] },
    ];
    const X0 = -0.5, X1 = 59.5, PITCH = 8.8, GROUP_GAP = 3.4, HEADING = 0.46;
    const out: Slot[] = [];
    let y = 0.6, row = 0;
    groups.forEach(({ division, read }, gi) => {
        const [run, from, to] = division.glass;
        const along = (t: number) => sample(run, from + (to - from) * t);
        // the heading: a word in the division's glass, as the page's division headings are
        const [heading] = bar(X0, X0 + (X1 - X0) * HEADING, y, y + PITCH, 1, 70 + gi, undefined, true);
        out.push(stone(heading, along(0)));
        y += PITCH;
        for (const lit of read) {
            bar(X0, X1, y, y + PITCH, 5, 10 + row, [1, 1, 1, 1, 1], true)
                .forEach((cell, k) => out.push(stone(cell, k < lit ? along(k / 4) : UNREAD)));
            y += PITCH; row++;
        }
        y += GROUP_GAP;
    });
    return out;
})();

export const SHAPES = { b: B, cross: CROSS, map: MAP, book: BOOK, question: QUESTION, stats: STATS };
export type ShapeName = keyof typeof SHAPES | "none";

/** Where each stone of the emblem stands in each shape: its corners turned to line up with where it came from */
export type Placed = { points: Point[]; hidden: boolean; dim: boolean; colour?: string };

/**
 * Lays a shape's slots onto the stones, so each stone takes the nearest free slot to where it stood in the shape before
 * (nearest pairs first): the stones travel the shortest ways and rarely cross. Spare stones fold into the nearest slot
 */
function place(previous: Placed[], shape: Shape): Placed[] {
    const from = previous.map(p => centroid(p.points));
    const to = shape.map(s => centroid(s.points));
    const pairs = from.flatMap((f, k) => to.map((t, s) => ({ k, s, d: Math.hypot(f[0] - t[0], f[1] - t[1]) }))).sort((a, b) => a.d - b.d);
    const stoneSlot = new Array<number>(previous.length).fill(-1), taken = new Set<number>();
    for (const { k, s } of pairs) if (stoneSlot[k] < 0 && !taken.has(s)) { stoneSlot[k] = s; taken.add(s); }
    // then untangle: swap any two stones' slots while that shortens their journeys (squared, so no one travels far),
    // which leaves few paths crossing
    const cost = (k: number, s: number) => (from[k][0] - to[s][0]) ** 2 + (from[k][1] - to[s][1]) ** 2;
    for (let pass = 0, better = true; better && pass < 40; pass++) {
        better = false;
        for (let a = 0; a < stoneSlot.length; a++) for (let b = a + 1; b < stoneSlot.length; b++) {
            const sa = stoneSlot[a], sb = stoneSlot[b];
            if (sa < 0 || sb < 0) continue;
            if (cost(a, sb) + cost(b, sa) < cost(a, sa) + cost(b, sb) - 1e-6) { stoneSlot[a] = sb; stoneSlot[b] = sa; better = true; }
        }
    }
    return previous.map((p, k) => {
        if (stoneSlot[k] >= 0) {
            const slot = shape[stoneSlot[k]];
            return { points: align(p.points, slot.points), hidden: !!slot.hidden, dim: !!slot.dim, colour: slot.colour };
        }
        // a spare: folded small into the nearest slot
        const nearest = to.reduce((best, t, s) => Math.hypot(t[0] - from[k][0], t[1] - from[k][1]) < Math.hypot(to[best][0] - from[k][0], to[best][1] - from[k][1]) ? s : best, 0);
        const c = to[nearest];
        return { points: align(p.points, shape[nearest].points).map(([x, y]) => [c[0] + (x - c[0]) * 0.15, c[1] + (y - c[1]) * 0.15] as Point), hidden: true, dim: false };
    });
}

/** The story's shapes in order, each placed from the one before */
export function sequence(names: ShapeName[]): Placed[][] {
    const out: Placed[][] = [];
    let last: Placed[] = B.map(s => ({ points: s.points, hidden: false, dim: false }));
    for (const name of names) {
        if (name === "none") {
            // gone: each stone closes to a point where it stood, and fades
            out.push(last.map(p => { const c = centroid(p.points); return { points: p.points.map(([x, y]) => [c[0] + (x - c[0]) * 0.1, c[1] + (y - c[1]) * 0.1] as Point), hidden: true, dim: false }; }));
            continue;
        }
        // the B: as it starts, or, coming back to it, every stone home to its own place in it
        const placed = name === "b" ? (out.length ? B.map((b, k) => ({ points: align(last[k].points, b.points), hidden: false, dim: false })) : last) : name === "cross" ? CROSS.map((s, k) => ({ points: align(last[k].points, s.points), hidden: !!s.hidden, dim: false })) : place(last, SHAPES[name]);
        out.push(placed);
        last = placed;
    }
    return out;
}
