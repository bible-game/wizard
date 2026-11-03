import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { MotionValue, useMotionValueEvent } from "framer-motion";
import { CheckIcon, Share2Icon, StarIcon } from "lucide-react";
import { createGridmap, type Gridmap } from "@project-gridmap/library";
import { buildBibleGridmapData, colourParts, LIGHT_COLOURS, MAP_COLOURS, mapTheme } from "@/app/play/[game]/map/gridmap";
import { Guesses } from "@/app/play/[game]/guess";
import { ruledOut } from "@/app/play/[game]/ruled-out";
import { score } from "@/app/play/[game]/score";
import { PRACTICE } from "@/demo/practice";
import { middles, useTipLayer, type StepTip } from "@/demo/tour";

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

/**
 * The scenes, in order: the clue, the map, one per guess, the star, then Share. The scroll only chooses the scene;
 * moving into one plays it out on its own time, so a fling can't leave the round half-way through a move
 */
const SCENES: { tip: StepTip; guess?: number }[] = [
    { tip: { id: "clue", target: "clue", title: "The clue", text: "Every day, one chapter of the Bible is summarised in a sentence. Which chapter could this be?" } },
    { tip: { id: "map", target: "map", inset: 96, title: "The Bible, as one map", text: "Each block is a book and each cell a chapter. Zoom in and tap the one you think it is." } },
    { guess: 0, tip: { id: "slot-0", target: "slot-0", title: "Guess 1 of 5", text: "Psalm 139 is far away, so it’s red. The arrow says the answer comes later in the Bible." } },
    { guess: 1, tip: { id: "slot-1", target: "slot-1", title: "Guess 2 of 5", text: "Ezekiel 37 is nearer: yellow. It’s in the right testament, so the New Testament goes dark." } },
    { guess: 2, tip: { id: "slot-2", target: "slot-2", title: "Guess 3 of 5", text: "Hosea 11 is close: green, within 500 verses. Only the Minor Prophets stay lit." } },
    { guess: 3, tip: { id: "slot-3", target: "slot-3", title: "Guess 4 of 5", text: "Jonah 4 is the right book, just 37 verses after the answer. Only Jonah is left." } },
    { guess: 4, tip: { id: "slot-4", target: "slot-4", title: "Guess 5 of 5", text: "Jonah 1. Found it!" } },
    { tip: { id: "stars", target: "stars", above: true, title: "One star", text: "Found on the fifth and last guess. The fewer guesses it takes, the more stars you earn." } },
    { tip: { id: "share", target: "share", above: true, title: "Share your result", text: "Your guesses as coloured squares, without giving the chapter away. Share it to carry on." } },
];
const STAR_SCENE = 7;

/** How far each scene holds the tour, as a share of the screen's height */
const SCENE = 30;
/** The Play step's share of the tour's scroll, and where a fling comes to rest: in the middle of each scene */
export const PLAY_LENGTH = SCENES.length * SCENE;
export const PLAY_SNAPS = middles(SCENES.length);

/** A scene's timings: the camera glides, the chapter is tapped, the tile fills, then the tooltip is wanted */
const GLIDE = 700, TAP = 720, FILL = 860, TAP_OFF = 1000, TIP = 950;

const sceneAt = (p: number) => Math.min(SCENES.length - 1, Math.floor(p * SCENES.length));
/** The guesses made by the end of a scene */
const madeBy = (scene: number) => Math.min(PATH.length, Math.max(0, scene - 1));
const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

type Camera = { cx: number; cy: number; k: number };
type MapHandle = {
    /** Glides to a scene's view over `ms` (0: at once) */
    glide: (scene: number, ms: number) => void;
    select: (guess: number | null) => void;
    rule: (made: number) => void;
    /** Where a guess's chapter is on screen, for the tap */
    point: (guess: number) => { x: number; y: number };
};

/** The real map, moved by the round: its camera, selection and ruled-out chapters, as each scene asks. Taps aren't taken */
const RoundMap = forwardRef<MapHandle, { testaments: any[]; guesses: any[] }>(function RoundMap({ testaments, guesses }, handle) {
    const element = useRef<HTMLDivElement>(null);
    const api = useRef<MapHandle | null>(null);

    useEffect(() => {
        const container = element.current!;
        const map: Gridmap = createGridmap({
            container, data: buildBibleGridmapData(testaments), colours: MAP_COLOURS, selectedColours: LIGHT_COLOURS,
            colourParts: colourParts(true), colourBy: "item", itemLabels: "full", markType: "number", numberMinPx: 9, layout: "fit",
            showSections: true, sectionLabelSize: 9.5, theme: mapTheme(),
        });
        const internal = map as unknown as {
            model: { world: unknown; items: { id: string; cells: { id: string; centerX: number; centerY: number }[] }[] };
            frame: (rect: unknown) => Camera;
            state: { selected: unknown };
            render: () => void;
        };
        // each guess's book framed with room around it, so its neighbours show where it sits
        const around = (id: string, zoom: number) => {
            const cam = internal.frame(internal.model.items.find(i => i.id === id));
            return { ...cam, k: cam.k * zoom };
        };
        const whole = internal.frame(internal.model.world);
        const views = PATH.map(g => around(g.key, g.zoom));
        const viewOf = (scene: number) => scene < 2 ? whole : views[Math.min(PATH.length - 1, scene - 2)];
        const cell = (i: number) => internal.model.items.flatMap(it => it.cells).find(c => c.id === `${PATH[i].key}/${PATH[i].chapter}`)!;

        let camera: Camera = whole, frame = 0;
        const put = (c: Camera) => { camera = c; map.setCamera(c.cx, c.cy, c.k); };
        put(whole);

        api.current = {
            glide(scene, ms) {
                cancelAnimationFrame(frame);
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
            select(guess) {
                if (guess === null) { internal.state.selected = null; internal.render(); }
                else map.selectCell(`${PATH[guess].key}/${PATH[guess].chapter}`);
            },
            rule(made) {
                map.setDisabledCells(made < PATH.length ? ruledOut(testaments, guesses.slice(0, made), PRACTICE.book).keys() : []);
            },
            point(guess) {
                const c = cell(guess);
                return { x: (c.centerX - camera.cx) * camera.k + container.clientWidth / 2, y: (c.centerY - camera.cy) * camera.k + container.clientHeight / 2 };
            },
        };
        return () => { cancelAnimationFrame(frame); map.destroy(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testaments]);

    useImperativeHandle(handle, () => ({
        glide: (s, ms) => api.current?.glide(s, ms),
        select: g => api.current?.select(g),
        rule: m => api.current?.rule(m),
        point: g => api.current?.point(g) ?? { x: 0, y: 0 },
    }), []);
    return <div ref={element} className="pointer-events-none absolute inset-0"/>;
});

/**
 * 01 Play, watched: the practice round (Jonah 1), played on the real map through all five guesses, with a wizard's
 * tooltips explaining each part as it comes. The scroll chooses the scene; each one then plays out in time. The one
 * star lights at the star scene, and `onEarn` gets it to fly into the key figure; then, as on Play, it can be shared
 */
export default function PlayStep({ progress, active, nudge, bible, onEarn, onShare, copied }: {
    progress: MotionValue<number>; active: boolean; nudge: number; bible: any; onEarn: (from: Element | null) => void; onShare: () => void; copied: boolean;
}) {
    const star = useRef<SVGSVGElement>(null);
    const map = useRef<MapHandle>(null);
    const guesses = useMemo(() => exampleRound(bible), [bible]);
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
        // going back, or staying put: the tiles and dimming change at once, and the camera returns
        if (target <= shownMade.current) {
            shownMade.current = target; setMade(target);
            map.current?.rule(target);
            map.current?.select(target > 0 ? target - 1 : null);
            map.current?.glide(scene, GLIDE * 0.8);
            later(GLIDE * 0.8, () => setShownScene(scene));
        } else {
            // forward: glide to the guess, tap it, then the tile fills and the map narrows; a fling past several scenes
            // plays only the last one, with every tile up to it filled
            map.current?.select(null);
            map.current?.glide(scene, GLIDE);
            const tapped = guess ?? target - 1;
            later(TAP, () => { map.current?.select(tapped); setTap({ ...(map.current?.point(tapped) ?? { x: 0, y: 0 }), on: true }); });
            later(FILL, () => { shownMade.current = target; setMade(target); map.current?.rule(target); });
            later(TAP_OFF, () => setTap(t => ({ ...t, on: false })));
            later(TIP, () => setShownScene(scene));
        }
        return () => timers.forEach(clearTimeout);
    }, [scene]);

    const found = made === PATH.length;
    const lit = found && scene >= STAR_SCENE && shownScene >= STAR_SCENE;
    const { root, tip, layer } = useTipLayer(shownScene === scene ? SCENES[scene].tip : null, active, [made, lit], nudge);

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
            <RoundMap ref={map} testaments={bible.testaments} guesses={guesses}/>
            <span className="mini-map-touch" data-on={tap.on || undefined} style={{ left: tap.x, top: tap.y }}/>
            {/* the end of the round, as on Play: the stars, then Share once the star is earned */}
            {found ? <div ref={tip("stars")} className="absolute inset-x-4 bottom-4 grid gap-3 rounded-lg border border-play-line bg-play-sheet p-3 animate-[hero-fade_0.3s_ease-out]">
                <div className="flex items-center justify-center gap-2">
                    {[...Array(5)].map((_, i) => <StarIcon key={i} ref={i === 0 ? star : undefined} aria-hidden="true" strokeWidth={1.5}
                                                           className={`size-6 transition duration-300 ${i < STARS && (lit || earned.current) ? "text-ui-accent drop-shadow-[0_0_6px_rgba(212,180,85,0.45)]" : "text-ui-faint"}`}
                                                           fill={i < STARS && (lit || earned.current) ? "currentColor" : "none"}/>)}
                </div>
                {lit || earned.current ? <button ref={tip("share")} type="button" onClick={onShare} aria-live="polite"
                                                 className="ui-button ui-primary h-11 animate-[hero-fade_0.3s_ease-out] !text-[15px] [&_svg]:size-[18px]">
                    {copied ? <><CheckIcon/>Copied</> : <><Share2Icon/>Share</>}
                </button> : null}
            </div> : null}
        </div>
        {layer}
    </div>;
}
