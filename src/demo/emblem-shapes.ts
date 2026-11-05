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

/** A rectangle as a glass stone, with the six corners every stone has */
const stone = (x0: number, y0: number, x1: number, y1: number): Point[] => sixCorners(glass([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]));

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
 * 01 Play: the grid map, as a tall rectangle of books in columns, each book a block of its own size, as Play lays out
 * the Bible's sections
 */
const MAP: Shape = (() => {
    const columns = [{ width: 21, books: 10 }, { width: 17, books: 9 }, { width: 20, books: 10 }, { width: 18, books: 9 }];
    const top = 2, bottom = 94;
    let x = -8;
    return columns.flatMap((column, c) => {
        const weights = [...Array(column.books)].map((_, b) => 0.5 + noise(b, c + 3));
        const total = weights.reduce((s, w) => s + w, 0);
        let y = top;
        const blocks = weights.map(w => { const h = (bottom - top) * w / total; const block = stone(x, y, x + column.width, y + h); y += h; return block; });
        x += column.width;
        return blocks.map(points => ({ points }));
    });
})();

/** 02 Read: an open book, each page a heading and its lines of text, each line a word or three */
const BOOK: Shape = (() => {
    const pages = [{ left: -10, right: 28 }, { left: 32, right: 70 }];
    return pages.flatMap((page, p) => {
        const width = page.right - page.left;
        const heading = { points: stone(page.left + width * 0.25, 10, page.right - width * 0.25, 16) };
        const lines = [...Array(8)].flatMap((_, l) => {
            const y = 22 + l * 8.5;
            // the last line of a paragraph stops short; two lines on each page have three words
            const end = l === 3 || l === 7 ? page.left + width * (0.45 + 0.2 * noise(l, p)) : page.right;
            const words = l === 1 || l === 5 ? 3 : 2;
            const cuts = [page.left, ...[...Array(words - 1)].map((_, w) => page.left + (end - page.left) * ((w + 1) / words + 0.12 * (noise(l * 3 + w, p + 7) - 0.5))), end];
            return cuts.slice(0, -1).map((from, w) => ({ points: stone(from, y, cuts[w + 1], y + 5.5) }));
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

/** 04 Statistics: chapters lit and unlit, as the stats page colours the Bible you've seen */
const LIT = "110110100111011101110011101101110110";
const STATS: Shape = (() => {
    const size = 11, left = 30 - 3 * size, top = 48 - 3 * size;
    return [...Array(36)].map((_, k) => {
        const i = k % 6, j = Math.floor(k / 6);
        return { points: stone(left + i * size, top + j * size, left + (i + 1) * size, top + (j + 1) * size), dim: LIT[k] === "0" };
    });
})();

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
