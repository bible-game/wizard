import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowRightIcon, BookOpenTextIcon, ChartColumnIncreasingIcon, ChevronDownIcon, LayoutDashboardIcon, LightbulbIcon, MenuIcon, UserRoundIcon, UserRoundPlusIcon } from "lucide-react";
import GlowingCross from "@/app/home/glowing-cross";
import { toast, Toaster } from "@/demo/toast";
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
/**
 * Where each beat rests, down the scroll (svh): a longer scroll into the steps and out of them to today's game, so each
 * change of screen is a deliberate move, and a steady one from star to star
 */
const REST = [0, 100, 180, 260, 340, 440];

/** The flow's words, set as a clue is in the clue's place, under a quiet heading */
const FLOW_HEADING = "Purpose";
const FLOW_WORDS = "Explore the human story";

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
 * The four steps, as the stars of a small constellation, in the order a day takes them: Play, where it starts, then
 * Read, Study and Stats, zigzagging down the page as a figure on a star chart does. Each star in its colour (the B's
 * runs, cool to warm, as the hero's stones go), lit with the step's icon: the map's own blocks for Play, an open book
 * for Read, a lightbulb for Study, a rising chart for Stats. Beside it its number and name in the mono, and beneath, in
 * the interface's quiet sans and never wrapping, what it's for, as the Figma's Landing 1.2.0 put it
 */
const STOPS = [
    { number: "01", name: "Play", what: "Visualise the Bible", icon: LayoutDashboardIcon, colour: playTheme.teal },
    { number: "02", name: "Read", what: "Digest today’s chapter", icon: BookOpenTextIcon, colour: playTheme.purple },
    { number: "03", name: "Study", what: "Stretch your understanding", icon: LightbulbIcon, colour: playTheme.rose },
    { number: "04", name: "Stats", what: "Track your progress", icon: ChartColumnIncreasingIcon, colour: playTheme.gold },
];
/** How long a line of the figure takes to draw, and so how long the star it reaches waits to light (s) */
const LINE_FOR = 0.6;
/** A colour at an opacity, from its hex */
const tint = (hex: string, a: number) => `${hex}${Math.round(a * 255).toString(16).padStart(2, "0")}`;

/** The constellation's measures, by the room it has: larger and more open on a wide screen */
const measures = (width: number) => width >= 400
    ? { star: 15, row: 120, zig: 80, label: 44, text: 16, mono: 12 }
    : { star: 10, row: 90, zig: 42, label: 29, text: 13, mono: 11 };
/**
 * The figure's shape: how far across each star sits (a share of `zig`) and how far down from the last (a share of
 * `row`), uneven as a real figure is; each reach across stays short enough that no line runs into the words above it
 */
const FIGURE = { across: [0, 0.8, 0.15, 1], down: [0, 1, 1.12, 0.92] };

/**
 * A star of the figure. Before the scroll reaches it, a faint point, so the whole figure can be made out from the
 * start; then it lights: a small lens in its colour (a fine ring about a faintly tinted disc, in a tight halo) and
 * within it the step's icon, drawn in its colour and glowing with it, as the stars light for a round's progress
 */
function Star({ colour, icon: Icon, r, lit, delay }: { colour: string; icon: typeof MenuIcon; r: number; lit: boolean; delay: number }) {
    const ease = { duration: 0.5, ease: [0.22, 0.8, 0.24, 1] as const, delay: lit ? delay : 0 };
    const ring = r * 1.75, size = r * 1.55;
    return <g>
        <circle r={2.2} fill={tint("#ffffff", 0.55)}/>
        <motion.g initial={{ opacity: 0, scale: 0.6 }} animate={lit ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }} transition={ease}>
            <circle r={ring * 1.3} fill={tint(colour, 0.08)}/>
            <circle r={ring} fill={tint(colour, 0.1)} stroke={tint(colour, 0.6)} strokeWidth={0.9}/>
            <circle r={ring - 2.5} fill="none" stroke={tint(colour, 0.14)} strokeWidth={0.75}/>
            <Icon x={-size / 2} y={-size / 2} width={size} height={size} color={colour} strokeWidth={1.6}
                  style={{ filter: `drop-shadow(0 0 2.5px ${tint(colour, 0.85)})` }}/>
        </motion.g>
    </g>;
}

/**
 * The constellation, as far as the scroll has come: `shown` stars (1 to 4). The stars zigzag down, the whole centred
 * in its room; each step of the scroll draws the next line of the figure on (a hairline running from one star's
 * colour into the next's, stopping short of each), then the star it reaches lights, and its words arrive beside it.
 * Scrolling back puts them out again
 */
function Constellation({ shown }: { shown: number }) {
    const box = useRef<HTMLDivElement>(null);
    const labels = useRef<(HTMLDivElement | null)[]>([]);
    const [width, setWidth] = useState(0);
    const [label, setLabel] = useState(0);
    useLayoutEffect(() => {
        const element = box.current;
        if (!element) return;
        const measure = () => {
            setWidth(element.clientWidth);
            setLabel(Math.max(0, ...labels.current.map(l => l?.offsetWidth ?? 0)));
        };
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        measure();
        document.fonts?.ready.then(measure);
        return () => observer.disconnect();
    }, []);
    const m = measures(width);
    const used = m.zig + m.label + label;
    const pad = Math.max(m.star * 2, (width - used) / 2);
    const at = (i: number) => ({
        x: pad + FIGURE.across[i] * m.zig,
        y: m.star * 2 + FIGURE.down.slice(0, i + 1).reduce((sum, d) => sum + d, 0) * m.row,
    });
    const height = at(STOPS.length - 1).y + m.star * 2 + 12;

    return <div ref={box} className="relative mx-auto w-full max-w-[30rem]" style={{ height }}>
        <svg width={width} height={height} className="absolute inset-0 overflow-visible" aria-hidden="true">
            <defs>
                {STOPS.slice(1).map((to, i) => {
                    const a = at(i), b = at(i + 1);
                    return <linearGradient key={i} id={`figure-${i}`} gradientUnits="userSpaceOnUse" x1={a.x} y1={a.y} x2={b.x} y2={b.y}>
                        <stop offset="0" stopColor={STOPS[i].colour}/><stop offset="1" stopColor={to.colour}/>
                    </linearGradient>;
                })}
            </defs>
            {/* the figure's lines, each stopping short of its stars, as a chart draws them */}
            {STOPS.slice(1).map((_, i) => {
                const a = at(i), b = at(i + 1), dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy), gap = m.star * 2.15;
                const ux = dx / len, uy = dy / len, drawn = i + 1 < shown;
                return <motion.line key={i} x1={a.x + ux * gap} y1={a.y + uy * gap} x2={b.x - ux * gap} y2={b.y - uy * gap}
                                    stroke={`url(#figure-${i})`} strokeWidth={1} strokeLinecap="round"
                                    initial={{ pathLength: 0, opacity: 0 }} animate={drawn ? { pathLength: 1, opacity: 0.7 } : { pathLength: 0, opacity: 0 }}
                                    transition={{ duration: drawn ? LINE_FOR : 0.15, ease: [0.45, 0, 0.25, 1] }}/>;
            })}
            {STOPS.map((stop, i) => {
                const { x, y } = at(i);
                return <g key={stop.name} transform={`translate(${x} ${y})`}>
                    <Star colour={stop.colour} icon={stop.icon} r={m.star} lit={i < shown} delay={i === 0 ? 0.15 : LINE_FOR * 0.85}/>
                </g>;
            })}
        </svg>
        {STOPS.map(({ number, name, what, colour }, i) => {
            const { x, y } = at(i), lit = i < shown;
            return <motion.div key={name} ref={el => { labels.current[i] = el; }} className="absolute flex flex-col gap-1 whitespace-nowrap"
                               style={{ left: x + m.label, top: y - (m.mono * 1.4 + 4 + m.text * 1.25) / 2 }}
                               initial={{ opacity: 0, x: -4 }} animate={lit ? { opacity: 1, x: 0 } : { opacity: 0, x: -4 }}
                               transition={lit ? { duration: 0.5, ease: "easeOut", delay: (i === 0 ? 0.15 : LINE_FOR * 0.85) + 0.1 } : { duration: 0.15 }}>
                <span className="flex items-center gap-1.5 font-mono uppercase tracking-[0.16em]" style={{ fontSize: m.mono, lineHeight: 1.4 }}>
                    <span className="tabular-nums text-ui-muted">{number}</span><span style={{ color: colour }}>{name}</span>
                </span>
                <span className="leading-tight text-ui-muted" style={{ fontSize: m.text }}>{what}</span>
            </motion.div>;
        })}
    </div>;
}

/** The two buttons at the close, as action.tsx's: the bar's shape, then the lead's white or the follower's dark */
const BAR = "pointer-events-auto flex h-12 items-center justify-center gap-2 rounded-lg border px-3 text-[15px] font-semibold transition active:scale-[0.98]";
const LEAD = "border-transparent bg-play-text text-play-bg";
const FOLLOW = "border-play-line bg-play-surface text-play-text";

const PlayButton = ({ onPlay, className = "" }: { onPlay: () => void; className?: string }) =>
    <button type="button" onClick={onPlay}
            className={`group pointer-events-auto flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-play-text px-5 text-[16px] font-medium text-play-bg active:scale-[0.98] ${className}`}>
        Play today&apos;s chapter<ArrowRightIcon aria-hidden="true" className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" strokeWidth={2}/>
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
    // where each beat rests, in pixels, measured from the snap points themselves
    const markers = useRef<(HTMLDivElement | null)[]>([]);
    const rests = useRef(REST.map(r => window.innerHeight * r / 100));

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
        if (markers.current.every(m => m)) rests.current = markers.current.map(m => m!.offsetTop);
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
    // the beat is the resting place nearest the scroll
    const nearest = (y: number) => rests.current.reduce((best, r, i) => Math.abs(r - y) < Math.abs(rests.current[best] - y) ? i : best, 0);
    useMotionValueEvent(scrollY, "change", y => setBeat(nearest(y)));
    useEffect(() => {
        if (!page) return;
        page.toggleAttribute("data-map-shown", beat === LAST);
        return () => page.removeAttribute("data-map-shown");
    }, [page, beat]);
    const next = () => window.scrollTo({ top: rests.current[Math.min(LAST, beat + 1)], behavior: "smooth" });

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

    // each resting place holds (scroll-snap-stop), so a quick swipe can't pass a star by
    return <div className="relative z-[65]" style={{ height: `calc(100svh + ${REST[LAST]}svh)` }}>
        {REST.map((rest, i) => <div key={i} ref={el => { markers.current[i] = el; }} aria-hidden="true" className="pointer-events-none absolute inset-x-0 h-px"
                                    style={{ top: `${rest}svh`, scrollSnapAlign: "start", scrollSnapStop: "always" }}/>)}

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
            {/* the figure sits nearer the words above it than the foot, so the two read as one */}
            {map ? <div className="absolute flex items-start justify-center px-4" style={{ ...at(map), paddingTop: Math.min(64, map.height * 0.1) }}>
                <AnimatePresence>
                    {kind === "flow" ? <motion.div key="flow" className="w-full" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                        <Constellation shown={beat}/>
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
