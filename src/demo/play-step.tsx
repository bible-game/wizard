import React, { useEffect, useMemo, useRef, useState } from "react";
import { MotionValue, useMotionValueEvent } from "framer-motion";
import { CheckIcon, Share2Icon, StarIcon } from "lucide-react";
import { createGridmap, type Gridmap } from "@project-gridmap/library";
import { buildBibleGridmapData, colourParts, LIGHT_COLOURS, MAP_COLOURS, mapTheme } from "@/app/play/[game]/map/gridmap";
import { Guesses } from "@/app/play/[game]/guess";
import { ruledOut } from "@/app/play/[game]/ruled-out";
import { score } from "@/app/play/[game]/score";
import { PRACTICE } from "@/demo/practice";
import { useStepTips, type StepTip } from "@/demo/tour";

/** How far each beat holds the tour, as a share of the screen's height */
const BEAT = 38;

/** The round the scroll plays: all five guesses, each one narrowing the map, the last one finding Jonah 1 */
const PATH = [
    { book: "Psalms", key: "PSA", chapter: 139, zoom: 0.55 },
    { book: "Ezekiel", key: "EZK", chapter: 37, zoom: 0.5 },
    { book: "Hosea", key: "HOS", chapter: 11, zoom: 0.45 },
    { book: "Jonah", key: "JON", chapter: 4, zoom: 0.4 },
    { book: "Jonah", key: "JON", chapter: 1, zoom: 0.55 },
];
export const STARS = 5 + 1 - PATH.length;

/** The guesses, scored as Play scores them */
export function exampleRound(bible: any) {
    return PATH.map(({ book, key, chapter }) => {
        const closeness = score(bible, PRACTICE, { book, chapter: `${chapter}` })!;
        return { book, bookKey: key, chapter: `${chapter}`, ...closeness, closeness };
    });
}

/** The beats: the clue, then one per guess. Each guess beat glides to its book, taps the chapter, then fills the tile */
const n = 1 + PATH.length;

type Tip = StepTip;

/**
 * The wizard's tooltips, by beat: while the map glides, the tip from before goes; once the tile fills, the next one
 * points at it. Text only: the map and tiles show the rest
 */
function tipAt(beat: number, t: number): Tip | null {
    if (beat === 0) return { id: "clue", target: "clue", title: "The clue", text: "Every day, one chapter of the Bible is summarised in a sentence. Which chapter could this be?" };
    if (beat === 1 && t < 0.6) return { id: "map", target: "map", inset: 96, title: "The Bible, as one map", text: "Each block is a book and each cell a chapter. Zoom in and tap the one you think it is." };
    if (t < 0.6) return null;
    const slot = (i: number, title: string, text: string): Tip => ({ id: `slot-${i}`, target: `slot-${i}`, title, text });
    if (beat === 1) return slot(0, "Guess 1 of 5", "Psalm 139 is far away, so it’s red. The arrow says the answer comes later in the Bible.");
    if (beat === 2) return slot(1, "Guess 2 of 5", "Ezekiel 37 is nearer: yellow. It’s in the right testament, so the New Testament goes dark.");
    if (beat === 3) return slot(2, "Guess 3 of 5", "Hosea 11 is close: green, within 500 verses. Only the Minor Prophets stay lit.");
    if (beat === 4) return slot(3, "Guess 4 of 5", "Jonah 4 is the right book, just 37 verses after the answer. Only Jonah is left.");
    if (t < 0.7) return slot(4, "Guess 5 of 5", "Jonah 1. Found it!");
    if (t < 0.86) return { id: "stars", target: "stars", above: true, title: "One star", text: "Found on the fifth and last guess. The fewer guesses it takes, the more stars you earn." };
    return { id: "share", target: "share", above: true, title: "Share your result", text: "Your guesses as coloured squares, without giving the chapter away. Friends who tap it land here." };
}


/** The last beat runs longer than the others, for the star and then Share */
const LAST = 1.8;
const SPAN = n - 1 + LAST;

/** Where the round is at a point in the scroll: which beat, how far through it, and the guesses made so far */
function at(p: number) {
    const beats = p * SPAN;
    const beat = Math.min(n - 1, Math.floor(beats));
    const t = Math.min(1, Math.max(0, (beats - beat) / (beat === n - 1 ? LAST : 1)));
    const made = beat === 0 ? 0 : t >= 0.6 ? beat : beat - 1;
    return { beat, t, made, tapping: beat > 0 && t >= 0.45 && t < 0.62 };
}

const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** The real map, steered by the scroll: its camera, selection and ruled-out chapters follow the round, and taps aren't taken */
function ScrubMap({ testaments, guesses, progress, onTap }: {
    testaments: any[]; guesses: any[]; progress: MotionValue<number>; onTap: (tap: { x: number; y: number; on: boolean }) => void;
}) {
    const element = useRef<HTMLDivElement>(null);
    const update = useRef<(p: number) => void>(() => {});

    useEffect(() => {
        const container = element.current!;
        const map: Gridmap = createGridmap({
            container, data: buildBibleGridmapData(testaments), colours: MAP_COLOURS, selectedColours: LIGHT_COLOURS,
            colourParts: colourParts(true), colourBy: "item", itemLabels: "full", markType: "number", numberMinPx: 9, layout: "fit",
            showSections: true, sectionLabelSize: 9.5, theme: mapTheme(),
        });
        const internal = map as unknown as {
            model: { world: unknown; items: { id: string; cells: { id: string; centerX: number; centerY: number }[] }[] };
            frame: (rect: unknown) => { k: number; cx: number; cy: number };
            state: { selected: unknown };
            render: () => void;
        };
        // each guess's book framed with room around it, so its neighbours show where it sits
        const around = (id: string, zoom: number) => {
            const cam = internal.frame(internal.model.items.find(i => i.id === id));
            return { ...cam, k: cam.k * zoom };
        };
        const cameras = [internal.frame(internal.model.world), ...PATH.map(g => around(g.key, g.zoom))];
        const cell = (id: string) => internal.model.items.flatMap(i => i.cells).find(c => c.id === id)!;
        const idOf = (i: number) => `${PATH[i].key}/${PATH[i].chapter}`;

        let shownMade = -1, shownSelected: string | null = null;
        update.current = (p: number) => {
            const { beat, t, made, tapping } = at(p);
            // glide in the first part of a beat: the scale changes geometrically, so it reads as one move rather than a slide
            const from = cameras[Math.max(0, beat - 1)], to = cameras[beat];
            const g = beat === 0 ? 1 : ease(Math.min(1, t / 0.4));
            const k = from.k * Math.pow(to.k / from.k, g);
            const cx = from.cx + (to.cx - from.cx) * g, cy = from.cy + (to.cy - from.cy) * g;
            map.setCamera(cx, cy, k);

            if (made !== shownMade) {
                shownMade = made;
                map.setDisabledCells(made < PATH.length ? ruledOut(testaments, guesses.slice(0, made), PRACTICE.book).keys() : []);
            }

            // the chapter being guessed is selected from the tap until the next glide begins
            const target = beat > 0 && t >= 0.45 ? idOf(beat - 1) : null;
            if (target !== shownSelected) {
                shownSelected = target;
                if (target) map.selectCell(target); else { internal.state.selected = null; internal.render(); }
            }

            const tapCell = beat > 0 ? cell(idOf(beat - 1)) : null;
            onTap(tapCell
                ? { x: (tapCell.centerX - cx) * k + container.clientWidth / 2, y: (tapCell.centerY - cy) * k + container.clientHeight / 2, on: tapping }
                : { x: 0, y: 0, on: false });
        };
        update.current(progress.get());
        return () => map.destroy();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testaments]);

    useMotionValueEvent(progress, "change", p => update.current(p));
    return <div ref={element} className="pointer-events-none absolute inset-0"/>;
}

/** The Play step's share of the tour's scroll: every beat, the last one longer */
export const PLAY_LENGTH = SPAN * BEAT;

/**
 * 01 Play, watched: the practice round (Jonah 1) played by the scroll on the real map, through all five guesses, with
 * a wizard's tooltips explaining each part as it comes. Its one star lights as the last guess finds the chapter, and
 * `onEarn` gets the star to fly it into the key figure; then, as on Play, the result can be shared
 */
export default function PlayStep({ progress, active, bible, onEarn, onShare, copied }: {
    progress: MotionValue<number>; active: boolean; bible: any; onEarn: (from: Element | null) => void; onShare: () => void; copied: boolean;
}) {
    const star = useRef<SVGSVGElement>(null);
    const guesses = useMemo(() => exampleRound(bible), [bible]);
    const [state, setState] = useState(() => at(progress.get()));
    const [tap, setTap] = useState({ x: 0, y: 0, on: false });
    useMotionValueEvent(progress, "change", p => {
        const next = at(p);
        setState(prev => prev.beat === next.beat && prev.made === next.made && Math.round(prev.t * 10) === Math.round(next.t * 10) ? prev : next);
    });

    const { made, t } = state;
    const found = made === PATH.length;
    const lit = found && t >= 0.7;
    const { root, tip, layer } = useStepTips(progress, active, p => { const a = at(p); return tipAt(a.beat, a.t); }, [made, lit]);

    // the star is earned the first time it lights, and flies up from here
    const earned = useRef(false);
    useEffect(() => {
        if (lit && !earned.current) { earned.current = true; onEarn(star.current); }
    }, [lit, onEarn]);

    // each guess tile is a tooltip target: registered on every render, so new tiles are there before the tooltip is placed
    const slots = (el: HTMLDivElement | null) => el?.querySelectorAll("li").forEach((li, i) => tip(`slot-${i}`)(li));

    return <div ref={root} className="play-ui relative flex h-full flex-col">
        {/* Play's own screen, edge to edge: the clue, the guesses, then the map filling the rest */}
        <p ref={tip("clue")} className="mx-auto shrink-0 text-balance px-6 pb-3 pt-4 text-center font-mono text-[17px] leading-[25px] text-play-text">{PRACTICE.summary}</p>
        <div ref={slots} className="shrink-0 pb-3"><Guesses guesses={guesses.slice(0, made)}/></div>
        <div ref={tip("map")} className="relative min-h-0 flex-1 border-t border-play-line">
            <ScrubMap testaments={bible.testaments} guesses={guesses} progress={progress} onTap={setTap}/>
            <span className="mini-map-touch" data-on={tap.on || undefined} style={{ left: tap.x, top: tap.y }}/>
            {/* the end of the round, as on Play: the stars, then Share once the star is earned */}
            {found ? <div ref={tip("stars")} className="absolute inset-x-4 bottom-4 grid gap-3 rounded-lg border border-play-line bg-play-sheet p-3">
                <div className="flex items-center justify-center gap-2">
                    {[...Array(5)].map((_, i) => <StarIcon key={i} ref={i === 0 ? star : undefined} aria-hidden="true" strokeWidth={1.5}
                                                           className={`size-6 transition duration-300 ${i < STARS && lit ? "text-ui-accent drop-shadow-[0_0_6px_rgba(212,180,85,0.45)]" : "text-ui-faint"}`}
                                                           fill={i < STARS && lit ? "currentColor" : "none"}/>)}
                </div>
                {lit ? <button ref={tip("share")} type="button" onClick={onShare} aria-live="polite"
                               className="ui-button ui-primary h-11 animate-[hero-fade_0.3s_ease-out] !text-[15px] [&_svg]:size-[18px]">
                    {copied ? <><CheckIcon/>Copied</> : <><Share2Icon/>Share</>}
                </button> : null}
            </div> : null}
        </div>
        {layer}
    </div>;
}
