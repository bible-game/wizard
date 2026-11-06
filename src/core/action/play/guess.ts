/**
 * Stand-in for the webapp's guess action (a server action against the passage service): scores the guess in the
 * browser, as Play does when it can, against the practice passage. Nothing is saved; the device keeps the only copy
 */
import bible from "@/demo/bible.json";
import { score } from "@/app/play/[game]/score";
import { Passage } from "@/core/model/play/passage";

export async function guess(date: string, book: string, chapter: string, passage: Passage) {
    const closeness = score(bible, passage, { book, chapter })!;
    return { book, chapter, distance: closeness.distance, percentage: closeness.percentage, closeness, passageBook: passage.book, passageChapter: passage.chapter };
}

export async function saveGuess(passageId: number, guess: any): Promise<void> { /* a visitor's device keeps the only copy */ }
