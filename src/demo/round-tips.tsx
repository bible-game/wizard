import React, { useCallback, useEffect, useRef, useState } from "react";
import { MousePointerIcon, PointerIcon } from "lucide-react";
import { motion } from "framer-motion";
import { StateUtil } from "@/core/util/state-util";
import { PRACTICE } from "@/demo/practice";
import { onZoom } from "@/demo/gridmap-handle";
import { SHIMMER } from "@/demo/tutorial";
import bible from "@/demo/bible.json";
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
    if (guess === answer) return `in ${answer}`;
    if (g.division === a.division) return `in ${a.division.replace(/^The /, "the ")}`;
    return `in the ${a.testament} Testament`;
}

/**
 * What the first guess says, in the visitor's own terms and one sentence, with the answer as its subject, as the arrow
 * reads: how far the answer is from the guess (in full, where the tile has it short), which way, and where it must be. Play
 * keeps the guess (its distance negative when the answer comes later)
 */
function explain(): string | null {
    const guess = StateUtil.getGame(PRACTICE.id).guesses[0];
    if (!guess) return null;
    const distance = Number(guess.distance ?? guess.closeness?.distance), later = distance < 0;
    const where = narrowed(guess.book, PRACTICE.book);
    const verses = `${Math.abs(distance).toLocaleString("en")} ${Math.abs(distance) === 1 ? "verse" : "verses"}`;
    return `The answer is ${verses} ${later ? "after" : "before"} ${chapterName(guess.book, guess.chapter)}${where ? `, ${where}` : ""}.`;
}

type Box = { x: number; y: number; width: number; height: number };
type Note = { id: "zoom" | "first"; text: string };

/** A mouse or trackpad (else a touch screen), as the page's own "Tap the map" / "Click to pick" tell them apart */
const fine = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const ZOOM = "Zoom on the map to reveal more detail";

/** The pointer the visitor zooms with: an arrow with a mouse or trackpad, a finger on a touch screen */
const Pointer = () => {
    const Icon = fine() ? MousePointerIcon : PointerIcon;
    return <Icon aria-hidden="true" className="row-note-glint size-3.5 shrink-0" strokeWidth={1.75}/>;
};

/**
 * The first round's notes, in the guesses' own row, where the empty slots give their room (tutorial.sass hides them while
 * a note shows): before any guess, that zooming on the map reveals more, with the pointer that does it and a slow
 * shimmer passing over it (tutorial.sass), until the visitor zooms; once the first guess lands,
 * what it means, until the next guess takes a slot. Everything else the page already says
 */
export default function RoundTips() {
    const [note, setNote] = useState<Note | null>(null);
    const [box, setBox] = useState<Box | null>(null);
    const first = useRef<string | null>(null);
    // once the visitor has zoomed the map, the zoom note has done its job
    const zoomed = useRef(false);
    // the clue's one shimmer, as the zoom note first arrives (tutorial.sass: the clue's pass, then the note's)
    const shimmered = useRef(false);

    const check = useCallback(() => {
        const page = document.querySelector("[data-game-ready]");
        if (!page) return;
        const tiles = page.querySelectorAll("ol[aria-label=Guesses] > li:not([aria-hidden])").length;
        const empty = [...page.querySelectorAll("ol[aria-label=Guesses] > li[aria-hidden]")];
        const playing = empty.length > 0 && !page.querySelector("[aria-label$='of 5 stars']");
        const id = !playing ? null : tiles === 0 ? (zoomed.current ? null : "zoom") : tiles === 1 ? "first" : null;
        if (id) page.setAttribute("data-row-note", id); else page.removeAttribute("data-row-note");
        if (id === "zoom" && !shimmered.current) {
            shimmered.current = true;
            page.setAttribute("data-clue-shimmer", "");
            window.setTimeout(() => page.removeAttribute("data-clue-shimmer"), SHIMMER + 200);
        }
        if (!id) { setNote(null); setBox(null); return; }
        if (id === "first") { remember(); first.current ??= explain(); }
        setNote(n => n?.id === id ? n : { id, text: id === "zoom" ? ZOOM : first.current ?? "" });
        const a = empty[0].getBoundingClientRect(), b = empty[empty.length - 1].getBoundingClientRect();
        setBox({ x: a.left, y: a.top, width: b.right - a.left, height: a.height });
    }, []);

    useEffect(() => onZoom(() => { if (!zoomed.current) { zoomed.current = true; check(); } }), [check]);

    useEffect(() => {
        check();
        const observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true });
        window.addEventListener("resize", check);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", check);
            document.querySelector("[data-game-ready]")?.removeAttribute("data-row-note");
        };
    }, [check]);

    if (!note || !box) return null;
    return <motion.p key={note.id} role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}
                     className="pointer-events-none fixed z-[30] flex items-center justify-center gap-2 rounded-lg border border-dashed border-play-line px-2.5 py-[3px] text-center text-[11px] leading-[13px] text-ui-muted"
                     style={{ left: box.x, top: box.y, width: box.width, minHeight: box.height }}>
        {note.id === "zoom" ? <Pointer/> : null}
        <span className={note.id === "zoom" ? "row-note-shimmer" : undefined}>{note.text}</span>
    </motion.p>;
}
