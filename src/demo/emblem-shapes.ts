import { align, centroid, glass, lattice, morphCells, type Point, sixCorners } from "@/core/style/mosaic";

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


/** Pixel art as stones on a lightly jittered lattice: `#` is a stone */
function pixels(rows: string[], left: number, top: number, size: number, seed: number): Point[][] {
    const xs = [...Array(rows[0].length + 1)].map((_, i) => left + i * size);
    const ys = [...Array(rows.length + 1)].map((_, j) => top + j * size);
    return lattice(xs, ys, (i, j) => rows[j][i] === "#", seed).map(glass).map(sixCorners);
}

/** 00 Hero and Purpose: the logo's B, then the cross (the B's spare stones fold into the cross's) */
const B: Shape = morphCells.map(c => ({ points: c.b }));
const CROSS: Shape = morphCells.map(c => ({ points: c.cross, hidden: c.extra }));

/**
 * 01 Play: the grid map, as a tall panel of books in columns, each book a block of its own size, as Play lays out the
 * Bible's sections. The leading between columns and books runs a little off true, as the lead of a window does, so it
 * reads as glass like the B and the cross: every edge is shared by the stones either side, so the gaps stay even
 */
const MAP: Shape = (() => {
    const columns = [{ width: 21, books: 10 }, { width: 17, books: 9 }, { width: 20, books: 10 }, { width: 18, books: 9 }];
    const top = 2, bottom = 94, mid = (top + bottom) / 2;
    // each column boundary as a gently slanted line, x at a given y
    let edge = -8;
    const bounds = [edge, ...columns.map(c => (edge += c.width))].map((x, b) => {
        const lean = b === 0 || b === columns.length ? 0 : (noise(b, 11) - 0.5) * 0.06;
        return (y: number) => x + lean * (y - mid);
    });
    return columns.flatMap((column, c) => {
        const weights = [...Array(column.books)].map((_, b) => 0.5 + noise(b, c + 3));
        const total = weights.reduce((sum, w) => sum + w, 0);
        // the cuts between books, each a little off level: its height at the column's left and right
        let at = top;
        const cuts = [{ l: top, r: top }, ...weights.map((w, b) => {
            at += (bottom - top) * w / total;
            const tilt = b === column.books - 1 ? 0 : (noise(b, c + 21) - 0.5) * 1.6;
            return { l: at - tilt, r: at + tilt };
        })];
        const left = bounds[c], right = bounds[c + 1];
        return cuts.slice(0, -1).map((u, b) => {
            const d = cuts[b + 1];
            return { points: sixCorners(glass([[left(u.l), u.l], [right(u.r), u.r], [right(d.r), d.r], [left(d.l), d.l]])) };
        });
    });
})();

/**
 * 02 Read: an open book, each page a heading and its lines of text, each line a word or three. The pages curve down
 * into the spine, as an open book's do, so each line bows a little lower towards the middle
 */
const BOOK: Shape = (() => {
    const spine = 30, half = 40;
    const sag = (x: number) => 4.5 * Math.pow(1 - Math.min(1, Math.abs(x - spine) / half), 2);
    // a word as a bar following the page's curve
    const word = (x0: number, x1: number, y: number, h: number): Point[] =>
        sixCorners(glass([[x0, y + sag(x0)], [x1, y + sag(x1)], [x1, y + h + sag(x1)], [x0, y + h + sag(x0)]]));
    const pages = [{ left: -10, right: 28 }, { left: 32, right: 70 }];
    return pages.flatMap((page, p) => {
        const width = page.right - page.left;
        const heading = { points: word(page.left + width * 0.25, page.right - width * 0.25, 8, 6) };
        const lines = [...Array(8)].flatMap((_, l) => {
            const y = 20 + l * 8.5;
            // the last line of a paragraph stops short; two lines on each page have three words
            const end = l === 3 || l === 7 ? page.left + width * (0.45 + 0.2 * noise(l, p)) : page.right;
            const words = l === 1 || l === 5 ? 3 : 2;
            const cuts = [page.left, ...[...Array(words - 1)].map((_, w) => page.left + (end - page.left) * ((w + 1) / words + 0.12 * (noise(l * 3 + w, p + 7) - 0.5))), end];
            return cuts.slice(0, -1).map((from, w) => ({ points: word(from, cuts[w + 1], y, 5.5) }));
        });
        return [heading, ...lines];
    });
})();

/** 03 Study: a question mark */
const QUESTION: Shape = pixels([
    "..#####..",
    ".#######.",
    "###...###",
    "##.....##",
    ".....###.",
    "....###..",
    "....##...",
    "....##...",
    ".........",
    "....##...",
    "....##...",
], -6, 4, 8, 5).map(points => ({ points }));

/**
 * 04 Statistics: chapters lit and unlit, as the stats page colours the Bible you've seen: a panel as tall as the others,
 * on the same slightly uneven leading as the map
 */
const LIT = "11011010011101110111001110110111011";
const STATS: Shape = pixels(["#####", "#####", "#####", "#####", "#####", "#####", "#####"], -3, 2.5, 13, 9)
    .map((points, k) => ({ points, dim: LIT[k] === "0" }));

export const SHAPES = { b: B, cross: CROSS, map: MAP, book: BOOK, question: QUESTION, stats: STATS };
export type ShapeName = keyof typeof SHAPES | "none";

/** Where each stone of the emblem stands in each shape: its corners turned to line up with where it came from */
export type Placed = { points: Point[]; hidden: boolean; dim: boolean };

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
            return { points: align(p.points, slot.points), hidden: !!slot.hidden, dim: !!slot.dim };
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
        const placed = name === "b" ? last : name === "cross" ? CROSS.map((s, k) => ({ points: align(last[k].points, s.points), hidden: !!s.hidden, dim: false })) : place(last, SHAPES[name]);
        out.push(placed);
        last = placed;
    }
    return out;
}
