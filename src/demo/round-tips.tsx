import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { StateUtil } from "@/core/util/state-util";
import { PRACTICE } from "@/demo/practice";
import bible from "@/demo/bible.json";
import { compact } from "@/app/play/[game]/guess";
import "@/demo/tutorial.sass";

const SEEN = "wizard.round-tips";
export const roundTipsSeen = () => { try { return localStorage.getItem(SEEN) === "1"; } catch { return false; } };
const remember = () => { try { localStorage.setItem(SEEN, "1"); } catch { /* it shows again */ } };

/** A chapter as the reader says it: Psalms' chapters are each a psalm */
const chapterName = (book: string, chapter: string) => `${book === "Psalms" ? "Psalm" : book} ${chapter}`;

/** Where a book sits: its testament and division, as the Bible's structure has them */
function placeOf(book: string): { testament: string; division: string } | null {
    for (const testament of (bible as any).testaments)
        for (const division of testament.divisions)
            if (division.books.some((b: any) => b.name === book)) return { testament: testament.name, division: division.name };
    return null;
}

/** Where the answer must be, as narrowly as the guess shows it: its book, its division, or its testament */
function narrowed(guess: string, answer: string): string {
    const g = placeOf(guess), a = placeOf(answer);
    if (!g || !a) return "";
    if (guess === answer) return `the answer is in ${answer}`;
    if (g.division === a.division) return `the answer is in ${a.division.replace(/^The /, "the ")}`;
    return `the answer is in the ${a.testament} Testament`;
}

/**
 * What the first guess says, in the visitor's own terms and one sentence: how far it was (in the tile's own shorthand),
 * which side of the answer it falls (as its arrow says), but where that still leaves the answer. Play keeps the guess
 * (its distance negative when the answer comes later)
 */
function explain(): string | null {
    const guess = StateUtil.getGame(PRACTICE.id).guesses[0];
    if (!guess) return null;
    const distance = Number(guess.distance ?? guess.closeness?.distance), later = distance < 0;
    const where = narrowed(guess.book, PRACTICE.book);
    const verses = `${compact.format(Math.abs(distance))} ${Math.abs(distance) === 1 ? "verse" : "verses"}`;
    return `${chapterName(guess.book, guess.chapter)} comes ${verses} ${later ? "beforehand" : "afterwards"}${where ? `, but ${where}` : ""}.`;
}

type Box = { x: number; y: number; width: number; height: number };

/**
 * The first round's one explanation, in the guesses' own row: once the first guess lands, the four empty slots beside
 * it give their room to what it means (tutorial.sass hides them while it shows), until the next guess takes a slot.
 * Everything else the page already says
 */
export default function RoundTips() {
    const [text, setText] = useState<string | null>(null);
    const [box, setBox] = useState<Box | null>(null);

    const check = useCallback(() => {
        const page = document.querySelector("[data-game-ready]");
        if (!page) return;
        const tiles = page.querySelectorAll("ol[aria-label=Guesses] > li:not([aria-hidden])").length;
        const empty = [...page.querySelectorAll("ol[aria-label=Guesses] > li[aria-hidden]")];
        const first = tiles === 1 && empty.length > 0 && !page.querySelector("[aria-label$='of 5 stars']");
        page.toggleAttribute("data-first-reading", first);
        if (!first) { setText(null); setBox(null); return; }
        remember();
        setText(t => t ?? explain());
        const a = empty[0].getBoundingClientRect(), b = empty[empty.length - 1].getBoundingClientRect();
        setBox({ x: a.left, y: a.top, width: b.right - a.left, height: a.height });
    }, []);

    useEffect(() => {
        check();
        const observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true });
        window.addEventListener("resize", check);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", check);
            document.querySelector("[data-game-ready]")?.removeAttribute("data-first-reading");
        };
    }, [check]);

    if (!text || !box) return null;
    return <motion.p role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}
                     className="pointer-events-none fixed z-[30] flex items-center justify-center rounded-lg border border-dashed border-play-line px-2.5 py-[3px] text-center text-[11px] leading-[13px] text-ui-muted"
                     style={{ left: box.x, top: box.y, width: box.width, minHeight: box.height }}>
        {text}
    </motion.p>;
}
