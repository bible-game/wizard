/**
 * The emblem check: holds each step shape of the landing emblem to the stone grammar measured from the B (GRAMMAR in
 * emblem-shapes.ts), so the family stays consistent. Prints each shape's measures and fails if a step shape strays.
 * Run with: npm run check:emblems
 */
import { GRAMMAR, measure, SHAPES } from "@/demo/emblem-shapes";

const reference = measure(SHAPES.b);
const STEPS = ["map", "book", "question", "stats"] as const;
const row = (name: string, m: ReturnType<typeof measure>, problems: string[] = []) =>
    `${name.padEnd(9)} ${String(m.count).padStart(2)} stones  ${m.width.toFixed(0).padStart(2)}×${m.height.toFixed(0).padStart(2)}  glass ${m.glass.toFixed(0).padStart(4)} (${(m.glass / reference.glass * 100).toFixed(0).padStart(3)}%)  stone ${m.median.toFixed(1)} / least ${m.least.toFixed(1)}  dim ${(m.dim * 100).toFixed(0).padStart(2)}%  white ${m.white}  ${problems.length ? "✗ " + problems.join("; ") : "✓"}`;

console.log(row("b", reference) + "  (reference)");
console.log(row("cross", measure(SHAPES.cross)) + "  (reference)");
let failed = 0;
for (const name of STEPS) {
    const m = measure(SHAPES[name]), problems: string[] = [];
    if (m.count < GRAMMAR.count.min || m.count > GRAMMAR.count.max) problems.push(`${m.count} stones, not ${GRAMMAR.count.min} to ${GRAMMAR.count.max}`);
    if (m.height < GRAMMAR.frame.minHeight) problems.push(`too short (${m.height.toFixed(0)})`);
    if (m.width < GRAMMAR.frame.minWidth) problems.push(`too narrow (${m.width.toFixed(0)})`);
    if (m.glass < reference.glass * (GRAMMAR.glassFor[name] ?? GRAMMAR.glass.min)) problems.push("too little glass");
    if (m.glass > reference.glass * GRAMMAR.glass.max) problems.push("too much glass");
    if (m.median < GRAMMAR.stone.median) problems.push(`stones too thin (${m.median.toFixed(1)})`);
    if (m.least < GRAMMAR.stone.min) problems.push(`a stone too thin (${m.least.toFixed(1)})`);
    if (m.dim > GRAMMAR.dimShare) problems.push(`too much dim (${(m.dim * 100).toFixed(0)}%)`);
    if (m.white) problems.push(`${m.white} white`);
    if (problems.length) failed++;
    console.log(row(name, m, problems));
}
if (failed) { console.log(`\n${failed} shape(s) outside the grammar`); process.exit(1); }
