import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowRightIcon, BookOpenTextIcon, ChartColumnIncreasingIcon, ChevronDownIcon, LayoutDashboardIcon, LightbulbIcon, MenuIcon, UserRoundIcon, UserRoundPlusIcon } from "lucide-react";
import GlowingCross from "@/app/home/glowing-cross";
import { STEP } from "@/demo/story";
import { toast, Toaster } from "@/demo/toast";
import { litGlass } from "@/core/style/regions";
import { playTheme } from "@/core/style/play-theme";
import { PRACTICE } from "@/demo/practice";
import "@/demo/tutorial.sass";

/**
 * The beats, a resting place each: the hero, as the Bible Game's home has it; the daily flow, a beat for each of its
 * four steps; then today's game, the map come in, to play
 */
const FLOW = 4;
const BEATS = ["hero", ...Array.from({ length: FLOW }, () => "flow"), "close"] as const;
const LAST = BEATS.length - 1;

/** The flow's words, set as a clue is in the clue's place, under a quiet heading */
const FLOW_HEADING = "Purpose";
const FLOW_WORDS = "Explore the Bible, one chapter at a time";

/**
 * Whether we know this visitor's account (in the webapp, they have logged in on this device before: `known`). In the
 * wizard, ?known in the address says so, and ?known=0 forgets it; it's kept on the device between visits
 */
const KNOWN = "wizard.known";
function knownAccount(): boolean {
    const asked = new URLSearchParams(window.location.search).get("known");
    try {
        if (asked !== null) {
            if (asked === "0" || asked === "false") localStorage.removeItem(KNOWN); else localStorage.setItem(KNOWN, "1");
        }
        return localStorage.getItem(KNOWN) === "1";
    } catch { return asked !== null && asked !== "0"; }
}
/** The close: today's own clue, in the clue's place over the map, under the question it asks as its heading */
const CLOSE_WORDS = "Can you find today’s chapter?";
/** The clue's own type (summary.tsx) */
const CLUE = "font-mono text-[18px] font-normal leading-[1.45] tracking-normal text-play-text text-center text-balance";


/** The tile entrance, as guess.tsx's Tile comes in, after `delay` seconds */
const rise = (delay = 0.25) => ({ initial: { opacity: 0, y: 6, scale: 0.94 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, transition: { duration: 0.15 } },
    transition: { type: "spring" as const, stiffness: 420, damping: 28, delay } });
const tile = { type: "spring" as const, stiffness: 420, damping: 28 };

/**
 * The four steps, as stops on a route plotted across a star chart, each on a line of its own, stepping across and down
 * the page in the order a day takes them: Play, where the journey starts, then Read, Study and Stats. Each stop a tile
 * in its colour (the B's runs, cool to warm, as the hero's stones go), its icon over a faint grid of chapter dots, as
 * the map's cells hold theirs; beside it, never wrapping, its number and name in the mono, and beneath, in the light
 * italic, what it's for
 */
const STOPS = [
    { number: "01", name: "Play", what: "Uncover today’s mystery chapter", icon: LayoutDashboardIcon, colour: playTheme.teal },
    { number: "02", name: "Read", what: "Discover what Scripture says", icon: BookOpenTextIcon, colour: playTheme.purple },
    { number: "03", name: "Study", what: "Put your understanding to the test", icon: LightbulbIcon, colour: playTheme.rose },
    { number: "04", name: "Stats", what: "Build a habit of discovery", icon: ChartColumnIncreasingIcon, colour: playTheme.gold },
];
/** How long a leg takes to draw, and so how long its stop waits to arrive (s) */
const LEG_FOR = 0.55;
/** A colour at an opacity, from its hex */
const tint = (hex: string, a: number) => `${hex}${Math.round(a * 255).toString(16).padStart(2, "0")}`;

/** The route's measures, by the room it has: larger on a wide screen; a narrow one keeps every line whole */
const measures = (width: number) => width >= 400
    ? { tile: 56, radius: 15, icon: 24, gap: 18, row: 44, text: 16, most: 64 }
    : { tile: 48, radius: 13, icon: 21, gap: 14, row: 34, text: 14, most: 40 };

/**
 * A leg of the route: down from beneath one tile, a soft turn, across, a soft turn, and down to just above the next;
 * its corners drawn as wide arcs, as a plotted course bends, never as an elbow
 */
const leg = (x1: number, y1: number, x2: number, y2: number) => {
    const mid = (y1 + y2) / 2, r = Math.max(0, Math.min(12, (x2 - x1) / 2, (y2 - y1) / 2 - 1));
    return `M${x1} ${y1} V${mid - r} A${r} ${r} 0 0 0 ${x1 + r} ${mid} H${x2 - r} A${r} ${r} 0 0 1 ${x2} ${mid + r} V${y2}`;
};

/**
 * A stop's tile: a hairline border in its colour, a second, fainter line just inside it (a lens's edge), a lit top
 * edge, and, behind the icon, a few chapter dots in the map's own grid; lit sharply rather than with a haze
 */
function StopTile({ colour, icon: Icon, size, radius, iconSize }: { colour: string; icon: typeof MenuIcon; size: number; radius: number; iconSize: number }) {
    return <span className="relative flex shrink-0 items-center justify-center"
                 style={{
                     width: size, height: size, borderRadius: radius, color: colour,
                     background: `radial-gradient(${tint(colour, 0.22)} 0.9px, transparent 1.1px) 0 0 / 8px 8px, linear-gradient(180deg, ${tint(colour, 0.16)}, ${tint(colour, 0.06)})`,
                     boxShadow: `inset 0 0 0 1px ${tint(colour, 0.55)}, inset 0 0 0 3px rgba(9, 10, 20, 0.55), inset 0 0 0 4px ${tint(colour, 0.14)}, inset 0 1px 0 1px ${tint("#ffffff", 0.1)}, 0 0 0 0.5px ${tint(colour, 0.25)}, 0 0 14px -6px ${tint(colour, 0.7)}`,
                 }}>
        <Icon style={{ width: iconSize, height: iconSize }} strokeWidth={1.5} aria-hidden="true"/>
    </span>;
}

/**
 * The route, as far as the scroll has come: `shown` stops (1 to 4). Each line steps a little further across than the
 * one above, as far as the room allows, the whole centred; each step of the scroll draws the next leg on (a fine
 * dotted course running from one stop's colour into the next's), then the stop it reaches rises in as a guess's tile
 * does. The course sets out from a small ring beneath Play, as a chart marks where a journey begins, and arrives at
 * each stop with a fine chevron. Scrolling back takes them away again
 */
function Route({ shown }: { shown: number }) {
    const box = useRef<HTMLDivElement>(null);
    const lines = useRef<(HTMLDivElement | null)[]>([]);
    const [width, setWidth] = useState(0);
    const [line, setLine] = useState(0);
    useLayoutEffect(() => {
        const element = box.current;
        if (!element) return;
        const measure = () => {
            setWidth(element.clientWidth);
            setLine(Math.max(0, ...lines.current.map(l => l?.offsetWidth ?? 0)));
        };
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        measure();
        document.fonts?.ready.then(measure);
        return () => observer.disconnect();
    }, []);
    const m = measures(width);
    const across = Math.max(12, Math.min(m.most, (width - line) / (STOPS.length - 1)));
    const pad = Math.max(0, (width - line - across * (STOPS.length - 1)) / 2);
    const left = (i: number) => pad + i * across, top = (i: number) => i * (m.tile + m.row);
    const height = top(STOPS.length - 1) + m.tile;
    const start = { x: left(0) + m.tile / 2, y: top(0) + m.tile + 6 };

    return <div ref={box} className="relative mx-auto w-full max-w-[30rem]" style={{ height }}>
        <svg width={width} height={height} className="absolute inset-0 overflow-visible" aria-hidden="true">
            <defs>
                {STOPS.slice(1).map((to, i) => <linearGradient key={i} id={`route-colour-${i}`} gradientUnits="userSpaceOnUse"
                                                                x1={0} y1={top(i) + m.tile} x2={0} y2={top(i + 1)}>
                    <stop offset="0.1" stopColor={STOPS[i].colour}/><stop offset="0.9" stopColor={to.colour}/>
                </linearGradient>)}
            </defs>
            {/* where the journey begins: a small ring beneath Play */}
            <motion.circle cx={start.x} cy={start.y} r={2.25} fill="none" stroke={STOPS[0].colour} strokeWidth={1}
                           initial={{ opacity: 0 }} animate={{ opacity: shown > 0 ? 0.9 : 0 }} transition={{ duration: 0.4, delay: shown > 0 ? 0.4 : 0 }}/>
            {STOPS.slice(1).map((to, i) => {
                const x1 = left(i) + m.tile / 2, y1 = i === 0 ? start.y + 4 : top(i) + m.tile + 7;
                const x2 = left(i + 1) + m.tile / 2, y2 = top(i + 1) - 8;
                const drawn = i + 1 < shown, d = leg(x1, y1, x2, y2);
                return <g key={i}>
                    {/* the dotted course, revealed by a mask drawn along it, so its dots appear in order */}
                    <mask id={`route-${i}`} maskUnits="userSpaceOnUse">
                        <motion.path d={d} fill="none" stroke="white" strokeWidth={10} strokeLinecap="round" initial={{ opacity: 0, pathLength: 0 }}
                                     animate={drawn ? { opacity: 1, pathLength: 1 } : { opacity: 0, pathLength: 0 }}
                                     transition={{ duration: drawn ? LEG_FOR : 0.15, ease: [0.45, 0, 0.25, 1] }}/>
                    </mask>
                    <path d={d} mask={`url(#route-${i})`} fill="none" stroke={`url(#route-colour-${i})`} strokeWidth={1.4} strokeLinecap="round" strokeDasharray="0.01 4.2"/>
                    {/* the arrival: a fine chevron, once the course has reached it */}
                    <motion.path d={`M${x2 - 3.5} ${y2 - 1.75} L${x2} ${y2 + 1.75} L${x2 + 3.5} ${y2 - 1.75}`} fill="none" stroke={to.colour} strokeWidth={1.25}
                                 strokeLinecap="round" strokeLinejoin="round" initial={{ opacity: 0 }} animate={{ opacity: drawn ? 1 : 0 }}
                                 transition={{ duration: 0.2, delay: drawn ? LEG_FOR * 0.9 : 0 }}/>
                </g>;
            })}
        </svg>
        {STOPS.map(({ number, name, what, icon, colour }, i) => {
            const here = i < shown;
            return <motion.div key={name} ref={el => { lines.current[i] = el; }} className="absolute flex items-center whitespace-nowrap"
                               style={{ left: left(i), top: top(i), gap: m.gap }}
                               initial={{ opacity: 0, y: 6, scale: 0.94 }}
                               animate={here ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 6, scale: 0.94 }}
                               transition={here ? { ...tile, delay: i === 0 ? 0.15 : LEG_FOR * 0.9 } : { duration: 0.15 }}>
                <StopTile colour={colour} icon={icon} size={m.tile} radius={m.radius} iconSize={m.icon}/>
                <span className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase leading-4 tracking-[0.16em]">
                        <span className="tabular-nums text-ui-muted">{number}</span><span style={{ color: colour }}>{name}</span>
                    </span>
                    <span className="font-light italic leading-tight text-play-text" style={{ fontSize: m.text }}>{what}</span>
                </span>
            </motion.div>;
        })}
    </div>;
}

/** Play: the page's own primary action, as the guess button and the tutorial's Next have it */
/** The two buttons at the close, as action.tsx's: the bar's shape, then the lead's white or the follower's dark */
const BAR = "pointer-events-auto flex h-12 items-center justify-center gap-2 rounded-lg border px-3 text-[15px] font-semibold transition active:scale-[0.98]";
const LEAD = "border-transparent bg-play-text text-play-bg";
const FOLLOW = "border-play-line bg-play-surface text-play-text";

const PlayButton = ({ onPlay, className = "" }: { onPlay: () => void; className?: string }) =>
    <button type="button" onClick={onPlay}
            className={`group pointer-events-auto flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-play-text px-5 text-[16px] font-medium text-play-bg active:scale-[0.98] ${className}`}>
        Play<ArrowRightIcon aria-hidden="true" className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" strokeWidth={2}/>
    </button>;

/** The Play page's places, by the webapp's structure (app/play/[game]/game.tsx, summary.tsx), as tutorial.tsx finds them */
const places = (page: Element) => ({
    header: page.querySelector("header"),
    clue: page.querySelector(":scope > div > section > button:first-child"),
    guesses: page.querySelector("ol[aria-label=Guesses]"),
    map: page.querySelector(":scope > div.flex-1"),
    bar: page.querySelector(":scope > section"),
});
type Box = { x: number; y: number; width: number; height: number };
const boxOf = (el: Element | null): Box | null => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; };
const at = (b: Box) => ({ left: b.x, top: b.y, width: b.width, height: b.height });

/**
 * The landing, over the Play page with the page's own parts held back (onboarding.tsx sets data-landing). Six beats,
 * each a CSS snap point (the browser does the scrolling):
 * - the hero, as the Bible Game's home has it: the B, always turning to the cross and back, the tagline, Play today's
 *   chapter (in the map's colours), and How it works at the foot
 * - the flow, a beat a step: in the clue's place its heading, in the map's place the route, a stop more each beat
 * - today's game: the map comes in, with words in the clue's place set as a clue is, Play today's chapter in the guess
 *   bar, and the footer; Play dissolves the landing into the game, the tutorial on a first visit or the round
 * The header holds the menu throughout
 */
export default function LandingOverlay({ onPlay }: { onPlay: () => void }) {
    const [page, setPage] = useState<Element | null>(null);
    const [boxes, setBoxes] = useState<Record<string, Box | null>>({});
    const [beat, setBeat] = useState(0);
    const marker = useRef<HTMLDivElement>(null);
    const step = useRef(window.innerHeight * STEP / 100);

    // the page, once it's there
    useEffect(() => {
        const find = () => setPage(p => p && p.isConnected ? p : document.querySelector("[data-game-ready]"));
        find();
        const observer = new MutationObserver(find);
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);

    // its places, again as the layout changes
    const measure = useCallback(() => {
        if (!page) return;
        const p = places(page);
        setBoxes({ header: boxOf(p.header), clue: boxOf(p.clue), guesses: boxOf(p.guesses), map: boxOf(p.map), bar: boxOf(p.bar) });
        if (marker.current?.offsetTop) step.current = marker.current.offsetTop;
    }, [page]);
    useLayoutEffect(measure, [measure]);
    useEffect(() => {
        if (!page) return;
        const observer = new ResizeObserver(measure);
        observer.observe(page);
        window.addEventListener("resize", measure);
        return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
    }, [page, measure]);

    // which beat the scroll is on; the map is held back (tutorial.sass) until the last, today's game
    const { scrollY } = useScroll();
    useMotionValueEvent(scrollY, "change", y => setBeat(Math.max(0, Math.min(LAST, Math.round(y / step.current)))));
    useEffect(() => {
        if (!page) return;
        page.toggleAttribute("data-map-shown", beat === LAST);
        return () => page.removeAttribute("data-map-shown");
    }, [page, beat]);
    const next = () => window.scrollTo({ top: Math.min(LAST, beat + 1) * step.current, behavior: "smooth" });

    // the beats are the page's resting places; a visit always opens on the first, never where a reload left the page
    useEffect(() => {
        const html = document.documentElement, was = history.scrollRestoration;
        html.style.scrollSnapType = "y mandatory";
        history.scrollRestoration = "manual";
        window.scrollTo(0, 0);
        return () => { html.style.scrollSnapType = ""; history.scrollRestoration = was; };
    }, []);

    const [known] = useState(knownAccount);
    // Log in, mocked: as if the visitor had signed in, then on into today's game
    const logIn = () => { toast("Logged in"); onPlay(); };

    const kind = BEATS[beat];
    const { header, clue, guesses, map, bar } = boxes;

    return <div className="relative z-[65]" style={{ height: `calc(100svh + ${LAST * STEP}svh)` }}>
        {BEATS.map((_, i) => <div key={i} ref={i === 1 ? marker : undefined} aria-hidden="true" className="pointer-events-none absolute inset-x-0 h-px"
                                  style={{ top: `${i * STEP}svh`, scrollSnapAlign: "start" }}/>)}

        {/* for screen readers, the whole story as text: the places below change as the scroll moves */}
        <div className="sr-only">
            <h1>Explore the Bible with a daily passage-guessing game</h1>
            <h2>{FLOW_HEADING}: {FLOW_WORDS}</h2>
            <ol>{STOPS.map(s => <li key={s.name}>{s.number} {s.name}: {s.what}</li>)}</ol>
            <h2>{CLOSE_WORDS}</h2>
            <p>Today’s clue: {PRACTICE.summary}</p>
        </div>

        <div className="pointer-events-none fixed inset-0">
            {/* the header's place: the menu */}
            {header ? <div className="absolute flex items-center justify-between px-2" style={at(header)}>
                <button type="button" aria-label="Open menu" onClick={() => toast("Opens the menu")}
                        className="pointer-events-auto relative flex size-11 items-center justify-center rounded-lg text-ui-text hover:bg-ui-raised">
                    <MenuIcon className="size-6"/>
                    <span aria-hidden="true" className="absolute right-2 top-2 size-2.5 rounded-full bg-ui-notice ring-2 ring-ui-bg"/>
                </button>
            </div> : null}

            {/* the hero, as the Bible Game's home (app/landing.tsx): the emblem, the tagline, Play, and How it works */}
            <AnimatePresence>
                {kind === "hero" ? <motion.div key="hero" aria-hidden="true" exit={{ opacity: 0, transition: { duration: 0.25 } }}
                                               className="absolute inset-0 flex flex-col items-center justify-center gap-10 px-4 pb-24 text-center">
                    <GlowingCross height={170}/>
                    <p className="home-hero-text home-tagline">Explore the Bible <em>with a daily passage-guessing game</em></p>
                    <div className="home-hero-actions"><PlayButton onPlay={onPlay} className="max-w-[18rem]"/></div>
                </motion.div> : null}
            </AnimatePresence>

            {/* the clue's place: the flow's heading, or the close's words set as the clue is, arriving letter by letter */}
            {clue ? <div aria-hidden="true" className="absolute flex items-center justify-center px-6 pb-4 pt-1" style={at(clue)}>
                <AnimatePresence mode="wait">
                    {kind === "flow" ? <motion.div key="flow" exit={{ opacity: 0, transition: { duration: 0.15 } }} className="flex flex-col items-center">
                        <p className="mb-1.5 font-mono text-[11px] uppercase leading-4 tracking-[0.14em] text-ui-muted">{FLOW_HEADING}</p>
                        <p className={`landing-words ${CLUE}`}>{FLOW_WORDS}</p>
                    </motion.div> : kind === "close" ? <motion.div key="close" exit={{ opacity: 0, transition: { duration: 0.15 } }} className="flex flex-col items-center">
                        <p className="mb-1.5 font-mono text-[11px] uppercase leading-4 tracking-[0.14em] text-ui-muted">{CLOSE_WORDS}</p>
                        <p className={`landing-words ${CLUE}`}>{PRACTICE.summary}</p>
                    </motion.div> : null}
                </AnimatePresence>
            </div> : null}

            {/* the map's place, through the flow: the route, a stop more each beat */}
            {map ? <div className="absolute flex items-center justify-center px-4" style={at(map)}>
                <AnimatePresence>
                    {kind === "flow" ? <motion.div key="flow" className="w-full" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                        <Route shown={beat}/>
                    </motion.div> : null}
                </AnimatePresence>
            </div> : null}

            {/* How it works, at the foot from the hero through the flow, bobbing as the home's does, to take the next step */}
            {/* the way on, at the foot, bobbing as the home's does: How it works from the hero; through the steps, only the
                chevron, until they're all in and what follows is the game itself, to see in action */}
            {kind !== "close" ? <div className="absolute inset-x-0 bottom-0 flex justify-center">
                <button type="button" onClick={next} aria-label={kind === "hero" ? undefined : "Next"} className="home-hero-cue pointer-events-auto">
                    <AnimatePresence mode="wait" initial={false}>
                        {kind === "hero" ? <motion.span key="how" exit={{ opacity: 0 }}>How it works</motion.span>
                            : beat === LAST - 1 ? <motion.span key="see" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>See it in action</motion.span>
                            : null}
                    </AnimatePresence>
                    <ChevronDownIcon className="size-5" aria-hidden="true"/>
                </button>
            </div> : null}

            {/* the guess bar's place, at the close: two buttons side by side, as the round's end has Copy and Read (action.tsx):
                for a visitor we don't know, Sign up beside Play, the lead; for one whose account we know, Play beside Log in, the
                lead, which signs them in and takes them on into today's game */}
            {bar ? <div className="absolute flex items-center px-4" style={at(bar)}>
                <AnimatePresence>
                    {kind === "close" ? <motion.div key="play" {...rise(0.15)} className="grid w-full grid-cols-2 gap-2">
                        {known ? <>
                            <button type="button" onClick={onPlay} className={`${BAR} ${FOLLOW}`}>
                                Play<ArrowRightIcon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.25}/>
                            </button>
                            <button type="button" onClick={logIn} className={`${BAR} ${LEAD}`}>
                                <UserRoundIcon className="size-4 shrink-0" strokeWidth={2.25} aria-hidden="true"/>Log in
                            </button>
                        </> : <>
                            <button type="button" onClick={() => toast("Opens Sign up")} className={`${BAR} ${FOLLOW}`}>
                                <UserRoundPlusIcon className="size-4 shrink-0" strokeWidth={2.25} aria-hidden="true"/>Sign up
                            </button>
                            <button type="button" onClick={onPlay} className={`group ${BAR} ${LEAD}`}>
                                Play<ArrowRightIcon aria-hidden="true" className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" strokeWidth={2.25}/>
                            </button>
                        </>}
                    </motion.div> : null}
                </AnimatePresence>
            </div> : null}
        </div>
        <Toaster/>
    </div>;
}
