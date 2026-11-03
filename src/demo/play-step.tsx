import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { MotionValue, useMotionValueEvent } from "framer-motion";
import { ArrowRightIcon, CheckIcon, PointerIcon, Share2Icon, StarIcon } from "lucide-react";
import { createGridmap, type Gridmap, type GridmapCell } from "@project-gridmap/library";
import { buildBibleGridmapData, colourParts, LIGHT_COLOURS, MAP_COLOURS, mapTheme } from "@/app/play/[game]/map/gridmap";
import { Guesses } from "@/app/play/[game]/guess";
import { ruledOut } from "@/app/play/[game]/ruled-out";
import { score } from "@/app/play/[game]/score";
import colours from "@/app/play/[game]/map/config/colours.json";
import { glow, tone } from "@/core/style/regions";
import { playTheme } from "@/core/style/play-theme";
import { PRACTICE } from "@/demo/practice";
import { middles, useTipLayer, type StepTip } from "@/demo/tour";
import Why from "@/demo/why";

/**
 * The one guess the scroll makes (as the Bible's config spells it): a psalm just 40 verses short, close enough to show
 * what a reading is and which way it points. Then the visitor takes over
 */
const WATCHED = [
    { book: "Psalms", key: "PSA", chapter: 121 },
];
const MAX_GUESSES = 5;

/** A guess, scored as Play scores it */
function scored(bible: any, book: string, key: string, chapter: number) {
    const closeness = score(bible, PRACTICE, { book, chapter: `${chapter}` })!;
    return { book, bookKey: key, chapter: `${chapter}`, ...closeness, closeness };
}

/**
 * The scenes: the clue, then one guess made for the visitor, which hands straight over to them. The scroll only
 * chooses the scene; moving into one plays it out on its own time, so a fling can't leave the round half-way
 */
const SCENES: { tip: StepTip; guess?: number }[] = [
    { tip: { id: "clue", target: "clue", title: "Today’s clue", text: "One chapter of the Bible is hidden behind this sentence. Scroll to see a first guess." } },
    { guess: 0, tip: { id: "turn", target: "slot-0", title: "Your turn", text: "Green is close, and the arrow points the way: it’s 40 verses after Psalm 121. Tap the chapter you think it is." } },
];
const TURN = SCENES.length - 1;

/** How far each scene holds the tour, as a share of the screen's height */
const SCENE = 32;
/** The Play step's share of the tour's scroll, and where a fling comes to rest: in the middle of each scene */
export const PLAY_LENGTH = SCENES.length * SCENE;
export const PLAY_SNAPS = middles(SCENES.length);

/** A scene's timings: the camera glides, the chapter is tapped, the tile fills, then the tooltip is wanted */
const GLIDE = 700, TAP = 720, FILL = 860, TAP_OFF = 1000, TIP = 950;

const sceneAt = (p: number) => Math.min(SCENES.length - 1, Math.floor(p * SCENES.length));
/** The watched guesses made by the end of a scene */
const madeBy = (scene: number) => Math.min(WATCHED.length, scene);
const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

type Camera = { cx: number; cy: number; k: number };
type MapHandle = {
    /** Glides to a scene's view over `ms` (0: at once) */
    glide: (scene: number, ms: number) => void;
    select: (cell: string | null) => void;
    rule: (guesses: any[], over: boolean) => void;
    /** Where a cell is on screen, for the tap */
    point: (cell: string) => { x: number; y: number };
};

const cellOf = (key: string, chapter: number | string) => `${key}/${chapter}`;

/**
 * The real map, moved by the round: its camera, selection and ruled-out chapters, as each scene asks. While `picking`,
 * it takes taps, as Play's does, and says which chapter was tapped
 */
const RoundMap = forwardRef<MapHandle, { testaments: any[]; picking: boolean; onPick: (cell: string) => void }>(function RoundMap({ testaments, picking, onPick }, handle) {
    const element = useRef<HTMLDivElement>(null);
    const api = useRef<MapHandle | null>(null);
    const pick = useRef(onPick), taking = useRef(picking);
    pick.current = onPick; taking.current = picking;

    useEffect(() => {
        const container = element.current!;
        const map: Gridmap = createGridmap({
            container, data: buildBibleGridmapData(testaments), colours: MAP_COLOURS, selectedColours: LIGHT_COLOURS,
            colourParts: colourParts(true), colourBy: "item", itemLabels: "full", markType: "number", numberMinPx: 9, layout: "fit",
            showSections: true, sectionLabelSize: 9.5, theme: mapTheme(),
            labels: { tooltip: () => "" },
            onSelectCell(cell: GridmapCell) { if (taking.current) pick.current(cell.id); },
        });
        const internal = map as unknown as {
            model: { world: unknown; items: { id: string; cells: { id: string; x: number; y: number; width: number; height: number; centerX: number; centerY: number }[] }[] };
            frame: (rect: unknown) => Camera;
            state: { selected: unknown };
            render: () => void;
        };
        const item = (id: string) => internal.model.items.find(i => i.id === id)!;
        const near = () => {
            // the chapters just after the guessed psalm, close enough that every chapter's number shows and is easy to
            // tap; the guess itself is on its tile above, so it can fall off the edge on a narrow phone
            const cell = (n: number) => item("PSA").cells.find(c => c.id === `PSA/${n}`)!;
            const size = cell(125).width;
            const k = Math.min(84 / size, Math.max(64 / size, internal.frame({ x: cell(121).x, y: cell(121).y, width: cell(130).x + size - cell(121).x, height: size }).k));
            return { cx: cell(125).centerX, cy: cell(125).centerY, k };
        };
        // worked out when they're wanted, from the map's layout as it is then (the library re-lays it out on a resize)
        const viewOf = (scene: number) => scene === 0 ? internal.frame(internal.model.world) : near();
        const whole = viewOf(0);
        const allCells = internal.model.items.flatMap(it => it.cells);

        let camera: Camera = whole, frame = 0, view = 0;
        const put = (c: Camera) => { camera = c; map.setCamera(c.cx, c.cy, c.k); };
        put(whole);

        // should the map change size (the page's fonts arriving, a phone turning), the library refits it to the whole
        // Bible: once it has, go back to the scene's view, worked out afresh
        let resized = 0;
        const observer = new ResizeObserver(() => {
            clearTimeout(resized);
            resized = window.setTimeout(() => { cancelAnimationFrame(frame); put(viewOf(view)); }, 120);
        });
        observer.observe(container);

        api.current = {
            glide(scene, ms) {
                cancelAnimationFrame(frame);
                view = scene;
                const from = camera, to = viewOf(scene);
                if (ms <= 0 || (from.cx === to.cx && from.cy === to.cy && from.k === to.k)) { put(to); return; }
                const start = performance.now();
                // the scale changes geometrically, so it reads as one move rather than a slide
                const step = (now: number) => {
                    const g = ease(Math.min(1, (now - start) / ms));
                    put({ k: from.k * Math.pow(to.k / from.k, g), cx: from.cx + (to.cx - from.cx) * g, cy: from.cy + (to.cy - from.cy) * g });
                    if (g < 1) frame = requestAnimationFrame(step);
                };
                frame = requestAnimationFrame(step);
            },
            select(cell) {
                if (cell === null) { internal.state.selected = null; internal.render(); } else map.selectCell(cell);
            },
            rule(guesses, over) {
                map.setDisabledCells(over ? [] : ruledOut(testaments, guesses, PRACTICE.book).keys());
            },
            point(id) {
                const c = allCells.find(c => c.id === id)!;
                return { x: (c.centerX - camera.cx) * camera.k + container.clientWidth / 2, y: (c.centerY - camera.cy) * camera.k + container.clientHeight / 2 };
            },
        };
        return () => { observer.disconnect(); cancelAnimationFrame(frame); clearTimeout(resized); map.destroy(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testaments]);

    useImperativeHandle(handle, () => ({
        glide: (s, ms) => api.current?.glide(s, ms),
        select: c => api.current?.select(c),
        rule: (g, o) => api.current?.rule(g, o),
        point: c => api.current?.point(c) ?? { x: 0, y: 0 },
    }), []);
    // only the visitor's turn takes the finger; before it, a swipe over the map still scrolls the page
    return <div ref={element} className={`absolute inset-0 ${picking ? "" : "pointer-events-none"}`}/>;
});

/**
 * 01 Play: the practice round (Psalm 127) on the real map. The scroll makes one guess, which shows what a reading is,
 * then hands over: the visitor taps and guesses the rest themselves, as on Play. Finding it lights its
 * stars (5 + 1 − guesses), which `onEarn` flies into the key figure; then, as on Play, it can be shared
 */
export default function PlayStep({ progress, active, nudge, bible, onEarn, onShare, copied }: {
    progress: MotionValue<number>; active: boolean; nudge: number; bible: any;
    onEarn: (from: Element | null, stars: number) => void; onShare: (guesses: any[]) => void; copied: boolean;
}) {
    const star = useRef<SVGSVGElement>(null);
    const map = useRef<MapHandle>(null);
    const watched = useMemo(() => WATCHED.map(g => scored(bible, g.book, g.key, g.chapter)), [bible]);
    const [mine, setMine] = useState<any[]>([]);
    const [scene, setScene] = useState(() => sceneAt(progress.get()));
    useMotionValueEvent(progress, "change", p => setScene(sceneAt(p)));

    // what the round shows: it follows the scene in time, not in scroll
    const [made, setMade] = useState(0);
    const [shownScene, setShownScene] = useState(-1);
    const [tap, setTap] = useState({ x: 0, y: 0, on: false });
    const shownMade = useRef(0);
    useEffect(() => {
        const timers: number[] = [];
        const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
        const target = madeBy(scene), guess = SCENES[scene].guess;
        setShownScene(-1);
        if (target <= shownMade.current) {
            // going back, or on to the visitor's turn: the tiles and dimming change at once, and the camera moves
            shownMade.current = target; setMade(target);
            map.current?.select(null);
            map.current?.glide(scene, GLIDE * 0.8);
            later(GLIDE * 0.8, () => setShownScene(scene));
        } else {
            // forward: glide to the guess, tap it, then the tile fills and the map narrows; a fling past several scenes
            // plays only the last one, with every tile up to it filled
            const tapped = guess ?? target - 1, id = cellOf(WATCHED[tapped].key, WATCHED[tapped].chapter);
            map.current?.select(null);
            map.current?.glide(scene, GLIDE);
            later(TAP, () => { map.current?.select(id); setTap({ ...(map.current?.point(id) ?? { x: 0, y: 0 }), on: true }); });
            later(FILL, () => { shownMade.current = target; setMade(target); });
            later(TAP_OFF, () => setTap(t => ({ ...t, on: false })));
            later(TIP, () => setShownScene(scene));
        }
        return () => timers.forEach(clearTimeout);
    }, [scene]);

    // the visitor's own guesses, after the watched ones
    const guesses = useMemo(() => [...watched.slice(0, made), ...(made === WATCHED.length ? mine : [])], [watched, made, mine]);
    const found = guesses.some(g => g.distance === 0);
    const over = found || guesses.length >= MAX_GUESSES;
    const stars = found ? 5 + 1 - guesses.length : 0;
    useEffect(() => { map.current?.rule(guesses, over); }, [guesses, over]);

    // the visitor's turn: a tap picks a chapter, and the guess bar guesses it
    const turn = scene === TURN && shownScene === TURN && !over;
    const [picked, setPicked] = useState<string | null>(null);
    const books = useMemo(() => bible.testaments.flatMap((t: any) => t.divisions.flatMap((d: any) => d.books)), [bible]);
    const pickedBook = picked ? books.find((b: any) => b.key === picked.split("/")[0]) : null;
    const pickedChapter = picked ? parseInt(picked.split("/")[1]) : null;
    const already = !!picked && guesses.some(g => cellOf(g.bookKey, g.chapter) === picked);
    function guess() {
        if (!pickedBook || !pickedChapter || already) return;
        navigator.vibrate?.(12);
        setMine(m => [...m, scored(bible, pickedBook.name, pickedBook.key, pickedChapter)]);
        setPicked(null);
    }

    // found: the stars light, and fly up; then Share is what's wanted
    const [lit, setLit] = useState(false);
    const earned = useRef(false);
    useEffect(() => {
        if (!over || earned.current) return;
        earned.current = true;
        const timer = window.setTimeout(() => { setLit(true); if (stars) onEarn(star.current, stars); }, 450);
        return () => clearTimeout(timer);
    }, [over, stars, onEarn]);
    const ending: StepTip = found
        ? { id: "found", target: "result", above: true, title: `Found it · ${stars} ${stars === 1 ? "star" : "stars"}`, text: "The fewer guesses it takes, the more stars you earn. Share your result to carry on." }
        : { id: "lost", target: "result", above: true, title: "It was Psalm 127", text: "No stars this time, but now you know your way around. Share your result to carry on." };
    const wanted = lit ? ending : shownScene === scene ? SCENES[scene].tip : null;
    const { root, tip, layer } = useTipLayer(wanted, active, [made, lit, mine.length], nudge);

    // each guess tile is a tooltip target: registered on every render, so new tiles are there before the tooltip is placed
    const slots = (el: HTMLDivElement | null) => el?.querySelectorAll("li").forEach((li, i) => tip(`slot-${i}`)(li));
    const tint: string = (pickedBook && (colours as Record<string, string>)[pickedBook.key]) || playTheme.text;
    const ready = !!picked && !already;

    return <div ref={root} className="play-ui relative flex h-full flex-col">
        <Why>Find today’s chapter: every guess shows you where it sits in the Bible.</Why>
        {/* Play's own screen, edge to edge: the clue, the guesses, then the map filling the rest */}
        <p ref={tip("clue")} className="mx-auto shrink-0 text-balance px-6 pb-3 pt-3 text-center font-mono text-[17px] leading-[25px] text-play-text">{PRACTICE.summary}</p>
        <div ref={slots} className="shrink-0 pb-3"><Guesses guesses={guesses} answer={over && !found ? { book: PRACTICE.book, bookKey: "PSA", chapter: PRACTICE.chapter } : undefined}/></div>
        <div ref={tip("map")} className="relative min-h-0 flex-1 border-t border-play-line">
            <RoundMap ref={map} testaments={bible.testaments} picking={turn} onPick={setPicked}/>
            <span className="mini-map-touch" data-on={tap.on || undefined} style={{ left: tap.x, top: tap.y }}/>
            {/* the end of the round, as on Play: the stars, then Share */}
            {over ? <div ref={tip("result")} className="absolute inset-x-4 bottom-4 grid gap-3 rounded-lg border border-play-line bg-play-sheet p-3 animate-[hero-fade_0.3s_ease-out]">
                <div className="flex items-center justify-center gap-2">
                    {[...Array(5)].map((_, i) => <StarIcon key={i} ref={i === 0 ? star : undefined} aria-hidden="true" strokeWidth={1.5}
                                                           className={`size-6 transition duration-300 ${i < stars && lit ? "text-ui-accent drop-shadow-[0_0_6px_rgba(212,180,85,0.45)]" : "text-ui-faint"}`}
                                                           fill={i < stars && lit ? "currentColor" : "none"}/>)}
                </div>
                <button type="button" onClick={() => onShare(guesses)} aria-live="polite"
                        className="ui-button ui-primary h-11 !text-[15px] [&_svg]:size-[18px]">
                    {copied ? <><CheckIcon/>Copied</> : <><Share2Icon/>Share</>}
                </button>
            </div> : null}
        </div>
        {/* the guess bar, as Play's: there from start to end (empty once the round is over), so the map never changes size;
            live at the visitor's turn */}
        <div className={`shrink-0 border-t border-play-line px-4 py-3 ${over ? "invisible" : ""}`}>
            {turn && picked ? <button type="button" onClick={guess} disabled={already}
                              style={ready ? { background: tone(tint, "solid"), boxShadow: glow(tint) } : undefined}
                              className={`flex h-12 w-full items-center justify-center gap-2 rounded-lg px-4 text-[16px] font-medium transition active:scale-[0.98] ${ready ? "text-play-bg" : "bg-play-raised text-play-faint"}`}>
                <span className="truncate">{already ? "Already guessed: " : ""}{pickedBook?.name === "Psalms" ? "Psalm" : pickedBook?.name} {pickedChapter}</span>
                {ready ? <ArrowRightIcon className="size-5 shrink-0" strokeWidth={2}/> : null}
            </button> : <div aria-hidden="true" className={`flex h-12 items-center justify-center gap-2 rounded-lg border border-dashed border-play-line bg-play-surface text-[16px] transition-colors ${turn ? "text-play-text" : "text-play-faint"}`}>
                <PointerIcon className="size-5" strokeWidth={1.75}/>Tap the map
            </div>}
        </div>
        {layer}
    </div>;
}
