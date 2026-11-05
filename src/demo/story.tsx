import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, MotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import { ChevronDownIcon, MailIcon, PlayIcon } from "lucide-react";
import { SiDiscord, SiGithub } from "@icons-pack/react-simple-icons";
import Header from "@/demo/header";
import StoryEmblem from "@/demo/story-emblem";
import { sequence, type ShapeName } from "@/demo/emblem-shapes";
import { toast, Toaster } from "@/demo/toast";
import { PLAY_ROUTE } from "@/demo/first-run";
import { PRACTICE } from "@/demo/practice";
import { playTheme } from "@/core/style/play-theme";

/** A stage: its shape, its number and name and line, and the region colour its step takes (the ground, the step bar) */
type Stage = { shape: ShapeName; number?: string; label?: string; text?: string; colour?: string };

/**
 * The story, a stage per stop of the scroll: the hero, what Bible Game is for, its three daily steps, the record they
 * leave, then the B again with today's clue, then Join us. Each step in a region's colour, in the order the map runs
 */
const STAGES: Stage[] = [
    { shape: "b" },
    { shape: "cross", number: "00", label: "Purpose", text: "Explore the *human story*" },
    { shape: "map", number: "01", label: "Play", text: "Build *familiarity* each day", colour: playTheme.teal },
    { shape: "book", number: "02", label: "Read", text: "Cover the Bible in *~4 years*", colour: playTheme.purple },
    { shape: "question", number: "03", label: "Study", text: "Dive *deeper* into passages", colour: playTheme.rose },
    { shape: "stats", number: "04", label: "Stats", text: "Track your *numbers* over time", colour: playTheme.gold },
    { shape: "b" },
    { shape: "none" },
];
const LAST = STAGES.length - 1;
/** The finale: the stones home in the B, today's clue beneath */
const FINALE = LAST - 1;

/** How far the page scrolls from one stage to the next, and then for the logos' run across Join us, as shares of the screen's height */
const STEP = 70;
const RUN = 110;
/** Where the logos set off (in stages: as the emblem goes) and stop (the end of the page) */
const RUN_FROM = LAST - 0.5, RUN_TO = LAST + RUN / STEP;

/** LinkedIn's mark, which Simple Icons no longer carries: its "in", set bold */
const LinkedIn = ({ size }: { size: number }) => <span aria-hidden="true" className="font-sans font-bold leading-none tracking-[-0.04em]" style={{ fontSize: size * 0.92 }}>in</span>;
const Mail = ({ size }: { size: number }) => <MailIcon aria-hidden="true" size={size} strokeWidth={2}/>;
const Discord = ({ size }: { size: number }) => <SiDiscord aria-hidden="true" size={size}/>;
const GitHub = ({ size }: { size: number }) => <SiGithub aria-hidden="true" size={size}/>;

/** Where to find us, each as its own app icon: the platform's colour, its mark in white */
const LINKS = [
    { label: "Email", icon: Mail, colour: "#d9a93a" },
    { label: "Discord", icon: Discord, colour: "#5865f2" },
    { label: "LinkedIn", icon: LinkedIn, colour: "#0a66c2" },
    { label: "GitHub", icon: GitHub, colour: "#24292f" },
];

const clamp = (t: number) => Math.min(1, Math.max(0, t));

/** A line with its *starred* phrase set in the story's second voice, the gold italic serif (.story-accent) */
const accented = (text: string) => text.split("*").map((part, i) => i % 2 ? <span key={i} className="story-accent">{part}</span> : part);

/**
 * Shown at its stage, and by the scroll: it fades and rises in as the story nears it, and on out as it leaves, so a
 * part-way scroll shows it part-way. `stay` keeps it once reached (the last stage)
 */
function Fade({ at, s, stay, className, children }: { at: number; s: MotionValue<number>; stay?: boolean; className?: string; children: React.ReactNode }) {
    const near = (v: number) => stay && v > at ? 1 : clamp(1 - Math.abs(v - at) * 2.4);
    const opacity = useTransform(s, near);
    const y = useTransform(s, v => (stay && v > at ? 0 : at - v) * 28);
    const visibility = useTransform(s, v => near(v) > 0 ? "visible" : "hidden");
    const pointerEvents = useTransform(s, v => near(v) > 0.6 ? "auto" : "none");
    return <motion.div className={className} style={{ opacity, y, visibility, pointerEvents }}>{children}</motion.div>;
}

/** The icons' size and spacing on the track, and how far the scroll carries the track over the run */
const ICON = 88, SPACING = 156, TRAVEL = 2.25;

/**
 * Join us, after zogreo.org's platforms: large app icons in a row that the scroll carries across the screen, right to
 * left, round and round (the four repeat, so the row never runs out). The
 * one nearest the middle sits a little larger and lights its dot below. Each is a link
 */
function Logos({ s }: { s: MotionValue<number> }) {
    const box = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(375);
    useEffect(() => {
        const element = box.current!;
        const observer = new ResizeObserver(() => setWidth(element.clientWidth));
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    // enough copies of the four to cover the screen and a tile either side
    const loop = LINKS.length * SPACING;
    const copies = Math.ceil((width + 2 * SPACING) / loop);
    const tiles = [...Array(copies * LINKS.length)].map((_, j) => ({ ...LINKS[j % LINKS.length], j }));
    const run = useTransform(s, v => clamp((v - RUN_FROM) / (RUN_TO - RUN_FROM)));
    // the track's offset: it starts with Email in the middle, and travels TRAVEL rounds of the four
    const offset = useTransform(run, r => r * TRAVEL * loop);
    const span = copies * loop;
    const xOf = (j: number, o: number) => {
        const raw = width / 2 + j * SPACING - o;
        return ((raw + SPACING) % span + span) % span - SPACING;
    };
    const [current, setCurrent] = useState(0);
    useMotionValueEvent(offset, "change", o => setCurrent(((Math.round(o / SPACING) % LINKS.length) + LINKS.length) % LINKS.length));

    return <div ref={box} className="pointer-events-none absolute inset-x-0 bottom-0 top-[64px] overflow-hidden">
        <div className="absolute inset-x-0 top-[calc(50%-66px)] h-[132px]">
            {tiles.map(tile => <Tile key={tile.j} offset={offset} x={o => xOf(tile.j, o)} centre={width / 2} {...tile}/>)}
        </div>
        {/* which of the four is in the middle */}
        <div aria-hidden="true" className="absolute inset-x-0 top-[calc(50%+74px)] flex justify-center gap-2">
            {LINKS.map((link, i) => <span key={link.label} className={`size-1.5 rounded-full transition-colors ${i === current ? "bg-ui-text" : "bg-ui-text/25"}`}/>)}
        </div>
    </div>;
}

function Tile({ offset, x, centre, label, icon: Icon, colour }: {
    offset: MotionValue<number>; x: (o: number) => number; centre: number; label: string; icon: (p: { size: number }) => React.ReactNode; colour: string;
}) {
    const left = useTransform(offset, o => x(o) - ICON / 2);
    // nearest the middle: full size; out towards the edges, a little smaller and lower, as if round a wheel
    const near = useTransform(offset, o => clamp(1 - Math.abs(x(o) - centre) / (SPACING * 1.6)));
    const scale = useTransform(near, n => 0.82 + 0.18 * n);
    const y = useTransform(near, n => (1 - n) * 14);
    return <motion.button type="button" onClick={() => toast(`Opens ${label}`)} style={{ left, scale, y }} aria-label={label}
                          className="pointer-events-auto absolute top-0 grid justify-items-center gap-2.5" >
        <span className="flex items-center justify-center rounded-[22px] text-white shadow-[0_14px_34px_rgba(0,0,0,0.4)] transition-transform active:scale-95"
              style={{ width: ICON, height: ICON, background: colour }}>
            <Icon size={46}/>
        </span>
        <span className="text-[14px] text-ui-text">{label}</span>
    </motion.button>;
}

/**
 * A step's colour in the ground: a broad, soft field of the region's light behind the emblem, and a fainter one rising
 * from the foot of the screen, there while its step is on stage and fading as the scroll leaves it
 */
function Tint({ s, at, colour }: { s: MotionValue<number>; at: number; colour: string }) {
    const opacity = useTransform(s, v => clamp(1 - Math.abs(v - at) * 1.1));
    return <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{
        opacity,
        background: `radial-gradient(60% 42% at 50% 34%, ${colour}24, transparent 72%), radial-gradient(90% 40% at 50% 112%, ${colour}1c, transparent 70%)`,
    }}/>;
}

/**
 * The finale's line: today's clue, set as Play sets it (the mono, in full light), typing itself out once the B has
 * formed, with the question it poses beneath. It clears as the story leaves, so it types again on the way back
 */
function Clue({ s }: { s: MotionValue<number> }) {
    const text = PRACTICE.summary;
    const [count, setCount] = useState(0);
    const [here, setHere] = useState(false);
    useMotionValueEvent(s, "change", v => setHere(Math.abs(v - FINALE) < 0.2));
    useEffect(() => {
        if (!here) { setCount(0); return; }
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setCount(text.length); return; }
        let n = 0;
        const timer = window.setInterval(() => { n += 1; setCount(n); if (n >= text.length) clearInterval(timer); }, 45);
        return () => clearInterval(timer);
    }, [here, text]);
    return <h2 className="home-tagline !mt-0" aria-label={`Today's clue: ${text}`}>
        <span aria-hidden="true" className="block min-h-[56px] text-balance font-mono text-[19px] leading-[28px] text-ui-text">
            {text.slice(0, count)}<span className="story-caret" data-done={count >= text.length ? "" : undefined}/>
        </span>
        <em aria-hidden="true">Today&apos;s clue. Can you find it?</em>
    </h2>;
}

/** The daily steps (the numbered stages after Purpose): 01 Play to 04 Stats */
const STEPS = STAGES.map((st, i) => ({ ...st, at: i })).filter(st => st.number && st.number !== "00");
/** How much the step bar shows: in from Purpose, out once the last step is done */
const stepsShown = (v: number) => clamp(Math.min(v - 0.5, STEPS[STEPS.length - 1].at + 0.5 - v) * 3);

/** A step's segment: it fills over the scroll from the stage before it to its own, and its name lights while it's on stage */
function Segment({ s, at, number, label, colour, onGo }: { s: MotionValue<number>; at: number; number: string; label: string; colour: string; onGo: () => void }) {
    const fill = useTransform(s, v => `${clamp(v - (at - 1)) * 100}%`);
    const [on, setOn] = useState(false);
    useMotionValueEvent(s, "change", v => setOn(Math.round(v) === at));
    return <button type="button" onClick={onGo} aria-current={on ? "step" : undefined}
                   className={`group grid min-h-[44px] flex-1 content-center gap-2 text-left transition-colors ${on ? "text-ui-text" : "text-ui-faint hover:text-ui-muted"}`}>
        <span className="block h-[2px] overflow-hidden rounded-full bg-ui-text/15"><motion.span className="block h-full rounded-full" style={{ width: fill, background: colour, boxShadow: `0 0 8px ${colour}66` }}/></span>
        <span className="text-[12px] leading-none"><span className="mr-1.5 font-mono transition-colors" style={{ color: on ? colour : undefined }}>{number}</span>{label}</span>
    </button>;
}

/**
 * How many steps there are and how far through them the story is, after a story's chapter bar: a segment for each,
 * filled by the scroll. Tapping one goes to it
 */
function Steps({ s, go }: { s: MotionValue<number>; go: (stage: number) => void }) {
    const shown = useTransform(s, stepsShown);
    return <motion.nav aria-label="Steps" className="absolute inset-x-0 bottom-[calc(8px+env(safe-area-inset-bottom))] mx-auto flex w-full max-w-[24rem] gap-3 px-6 max-[440px]:px-4"
                       style={{ opacity: shown, visibility: useTransform(shown, o => o > 0 ? "visible" : "hidden") }}>
        {STEPS.map(st => <Segment key={st.at} s={s} at={st.at} number={st.number!} label={st.label!} colour={st.colour!} onGo={() => go(st.at)}/>)}
    </motion.nav>;
}

/**
 * Home as a story told in one place, after zogreo.org: the screen stays put while the scroll moves it on. The emblem
 * in the middle becomes each stage's picture (the B, the cross, the grid map, a book, a question, the lit chapters of
 * the stats page), with the stage's number and name under it, then its line. Everything follows the
 * scroll itself, so stopping part-way shows the change part-way; a fling comes to rest on a stage. Each step tints the
 * ground in its region's colour. Then the stones come home to the B and today's clue types itself out beneath, the
 * button right there; last, the emblem goes and Join us takes its place, its links carried across by the scroll
 */
export default function Story() {
    const stages = useMemo(() => sequence(STAGES.map(s => s.shape)), []);
    const { scrollY } = useScroll();
    // where the story is, in stages
    const raw = useTransform(scrollY, y => y / (window.innerHeight * STEP / 100));
    // eased a touch behind the finger, so a jerky scroll or a wheel's steps still read as one glide
    const s = useSpring(raw, { stiffness: 170, damping: 30, mass: 0.6, restDelta: 0.0005 });
    // the button stays put through the story, and goes as the emblem does, before Join us
    const action = useTransform(s, v => clamp((LAST - 0.2 - v) / 0.4));
    // the nudge stays until the page's end, fading over its last stretch
    const cue = useTransform(s, v => Math.min(clamp((RUN_TO - v) * 2.5), 1 - stepsShown(v)));
    const go = (stage: number) => window.scrollTo({ top: stage * window.innerHeight * STEP / 100, behavior: "smooth" });
    const next = () => {
        const step = window.innerHeight * STEP / 100, now = window.scrollY / step;
        const to = now < LAST - 0.1 ? Math.floor(now + 0.1) + 1 : RUN_TO;
        window.scrollTo({ top: to * step, behavior: "smooth" });
    };

    useEffect(() => {
        const html = document.documentElement;
        html.style.scrollSnapType = "y proximity";
        return () => { html.style.scrollSnapType = ""; };
    }, []);

    const play = () => { window.location.hash = PLAY_ROUTE; };

    return <div className="relative" style={{ height: `calc(100svh + ${LAST * STEP + RUN}svh)` }}>
        {/* a resting place for each stage, and the end of the logos' run */}
        {[...STAGES.map((_, i) => i * STEP), LAST * STEP + RUN].map(top => <div key={top} aria-hidden="true" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: `${top}svh`, scrollSnapAlign: "start" }}/>)}

        <div className="sticky top-0 flex h-svh flex-col overflow-hidden">
            {STAGES.map((st, i) => st.colour ? <Tint key={i} s={s} at={i} colour={st.colour}/> : null)}
            <Header stars={0}/>
            <main className="relative mx-auto flex w-full max-w-[36rem] flex-1 flex-col">
                {/* every stage laid out as the hero is: the emblem, two lines of words, then the button, which stays put */}
                <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 pb-[72px] text-center max-[440px]:px-4">
                    <div className="relative flex w-full flex-col items-center gap-10">
                        <StoryEmblem stages={stages} names={STAGES.map(st => st.shape)} at={s}/>
                        <div className="relative h-[92px] w-full max-w-[24rem]">
                            <Fade at={0} s={s} className="absolute inset-x-0 top-0">
                                <h1 className="home-hero-text home-tagline !mt-0">Explore the <span className="story-accent">Bible</span> <em>with a daily passage-guessing game</em></h1>
                            </Fade>
                            {STAGES.map((st, i) => st.text ? <Fade key={i} at={i} s={s} className="absolute inset-x-0 top-0">
                                <h2 className="home-tagline !mt-0">
                                    {accented(st.text)}
                                    <em><span className="mr-2 font-mono text-[14px] not-italic" style={{ color: st.colour ?? playTheme.gold }}>{st.number}</span>{st.label}</em>
                                </h2>
                            </Fade> : null)}
                            <Fade at={FINALE} s={s} className="absolute inset-x-0 top-0">
                                <Clue s={s}/>
                            </Fade>
                        </div>

                        {/* the end: the emblem goes, and Join us takes its place, in the same space */}
                        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-screen max-w-[36rem] -translate-x-1/2">
                            {/* (the Fade moves itself, so it sits inside the box that centres it) */}
                            <Fade at={LAST} s={s} stay className="absolute inset-0">
                                <div className="absolute inset-x-0 top-0 px-6 text-center">
                                    <h2 className="home-tagline !mt-0 text-[34px]">Join <span className="story-accent">us</span></h2>
                                </div>
                                <Logos s={s}/>
                            </Fade>
                        </div>
                    </div>
                    <motion.div className="home-hero-actions" style={{ opacity: action, visibility: useTransform(action, a => a > 0 ? "visible" : "hidden") }}>
                        <button type="button" onClick={play} className="ui-button ui-primary h-12 w-full max-w-[18rem] text-[15px]">
                            <PlayIcon className="size-[18px]" strokeWidth={2}/>Play today&apos;s chapter
                        </button>
                    </motion.div>
                </div>

                {/* through the steps, how many there are and how far along; otherwise, the nudge to scroll */}
                <Steps s={s} go={go}/>
                <motion.div className="absolute inset-x-0 bottom-0 flex justify-center" style={{ opacity: cue, pointerEvents: useTransform(cue, c => c > 0.5 ? "auto" : "none") }}>
                    <a href="#" onClick={e => { e.preventDefault(); next(); }} className="home-hero-cue">
                        Scroll down
                        <ChevronDownIcon className="size-5" aria-hidden="true"/>
                    </a>
                </motion.div>
            </main>
        </div>
        <Toaster/>
    </div>;
}
