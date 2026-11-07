import React from "react";
import "@/app/play/play.sass";
import Game from "@/app/play/[game]/game";
import bible from "@/core/config/bible.json";
import { PRACTICE } from "@/demo/practice";

const flatten = (group: any[], subgroup: string) => group.flatMap(item => item[subgroup]);
const divisions = flatten((bible as any).testaments, "divisions");
const books = flatten(divisions, "books");

/** Today, as Play names a day in its path (YYYY-MM-DD) */
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/**
 * `landing`: under the landing, the map drawn clean (Game's own `landing`).
 * `demo`: the tutorial's round, shown rather than played (Game's own `demo`: it starts empty and keeps nothing).
 * Today's game, as the webapp's Play page (app/play/[game]/page.tsx) mounts it, with the webapp's own components
 * (copied by scripts/sync-play.py): a visitor, not logged in, on today's date, whose passage is the practice round's.
 * The Game fills in the passage's division and testament itself, as it does for the service's
 */
export default function PlayPage({ device = "mobile", demo = false, landing = false }: { device?: string; demo?: boolean; landing?: boolean }) {
    const passage = { id: PRACTICE.id, title: PRACTICE.summary, summary: PRACTICE.summary, book: PRACTICE.book, chapter: PRACTICE.chapter } as any;
    return <main className="relative z-1 w-full">
        <Game game={today()} bible={bible} divisions={divisions} books={books} device={device} passage={passage}
              played={undefined} loggedIn={false} info={undefined} known={false} demo={demo} landing={landing}/>
    </main>;
}
