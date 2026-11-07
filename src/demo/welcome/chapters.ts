import bible from "@/core/config/bible.json";
import colours from "@/app/play/[game]/map/config/colours.json";
import { score } from "@/app/play/[game]/score";
import { PRACTICE } from "@/demo/practice";

/** A chapter of the Bible, in reading order, in its region's light colour */
export type Chapter = { key: string; book: string; division: string; chapter: number; colour: string };

/** Every chapter of the Bible in reading order: 1,189 of them */
export const CHAPTERS: Chapter[] = bible.testaments.flatMap(t => t.divisions.flatMap(d => d.books.flatMap(b =>
    Array.from({ length: b.chapters }, (_, i) => ({
        key: b.key, book: b.name, division: d.name, chapter: i + 1,
        colour: (colours as Record<string, string>)[b.key] ?? "#b5b8bd",
    })))));

/** Where a chapter sits in reading order */
export const indexOf = (key: string, chapter: number) => CHAPTERS.findIndex(c => c.key === key && c.chapter === chapter);

/** A guess at the practice round (Psalm 127), scored as Play scores it, ready for the Guesses tiles */
export function guess(book: string, key: string, chapter: number) {
    const closeness = score(bible, PRACTICE, { book, chapter: `${chapter}` })!;
    return { book, bookKey: key, chapter: `${chapter}`, ...closeness, closeness };
}

/**
 * The watched round: Proverbs (the right corner of the Bible, but too far on), a psalm 40 verses short, then the
 * answer. Red-yellow, then green, then found: the traffic light in three moves
 */
export const ROUND = [
    guess("Proverbs", "PRO", 16),
    guess("Psalms", "PSA", 121),
    guess("Psalms", "PSA", 127),
];

/** Chapters a nine-day player has seen (about 4% of the Bible, with today's among them), for the progress scene */
export const SEEN = new Set([
    ...[1, 2, 3].map(c => indexOf("GEN", c)), indexOf("EXO", 20), indexOf("RUT", 1), indexOf("PSA", 23), indexOf("PSA", 127),
    indexOf("ISA", 40), indexOf("JHN", 1), indexOf("JHN", 3), indexOf("ACT", 2), indexOf("ROM", 8), indexOf("1JN", 1),
    ...[1, 2, 3, 4, 5].map(c => indexOf("MRK", c)), ...[1, 2, 3, 4].map(c => indexOf("PHP", c)), indexOf("JAS", 1),
    indexOf("PRO", 3), indexOf("ECC", 3), indexOf("JON", 1), ...[1, 2, 3, 4, 5, 6, 7, 8].map(c => indexOf("LUK", c)),
    indexOf("HEB", 11), indexOf("REV", 21), indexOf("REV", 22), indexOf("DAN", 3), indexOf("NEH", 8), indexOf("1SA", 17),
]);
