import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, MotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { ChevronDownIcon, MailIcon, PlayIcon } from "lucide-react";
import { SiDiscord, SiGithub } from "@icons-pack/react-simple-icons";
import Header from "@/demo/header";
import StoryEmblem from "@/demo/story-emblem";
import { sequence, type ShapeName } from "@/demo/emblem-shapes";
import { toast, Toaster } from "@/demo/toast";
import { PLAY_ROUTE } from "@/demo/first-run";
import { playTheme } from "@/core/style/play-theme";

/** A stage: its shape, its number and phase, its line, and the region colour its step tints the ground */
type Stage = { shape: ShapeName; number?: string; phase?: string; text?: string; colour?: string };

/**
 * The story, a stage per stop of the scroll: the hero, what Bible Game is for, its three daily steps, the record they
 * leave, then Join us, where the page ends. Each step in a region's colour, in the order the map runs
 */
const STAGES: Stage[] = [
    { shape: "b" },
    { shape: "cross", number: "00", phase: "Purpose", text: "Understand the human story" },
    { shape: "map", number: "01", phase: "Play", text: "Visualise the structure", colour: playTheme.teal },
    { shape: "book", number: "02", phase: "Read", text: "Digest today’s chapter", colour: playTheme.purple },
    { shape: "question", number: "03", phase: "Study", text: "Stretch your understanding", colour: playTheme.rose },
    { shape: "stats", number: "04", phase: "Stats", text: "Track your progress", colour: playTheme.gold },
    { shape: "none" },
];
const LAST = STAGES.length - 1;

/** How far the page scrolls from one stage to the next, as a share of the screen's (small) height */
const STEP = 70;

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

/**
 * Shown at its stage, and by the scroll: it fades and rises in as the story nears it, and on out as it leaves, so a
 * part-way scroll shows it part-way. `until` holds it shown from its stage to there. A `copy` is hidden from screen
 * readers, which have the story as text already
 */
function Fade({ at, s, until = at, copy, className, children }: { at: number; s: MotionValue<number>; until?: number; copy?: boolean; className?: string; children: React.ReactNode }) {
    const off = (v: number) => v < at ? at - v : v > until ? until - v : 0;
    const near = (v: number) => clamp(1 - Math.abs(off(v)) * 2.4);
    const opacity = useTransform(s, near);
    const y = useTransform(s, v => off(v) * 28);
    const visibility = useTransform(s, v => near(v) > 0 ? "visible" : "hidden");
    const pointerEvents = useTransform(s, v => near(v) > 0.6 ? "auto" : "none");
    return <motion.div aria-hidden={copy || undefined} className={className} style={{ opacity, y, visibility, pointerEvents }}>{children}</motion.div>;
}

/** How far apart the icons arrive, and how long each takes, in stages of scroll; it begins this far before Join us */
const ARRIVE_GAP = 0.09, ARRIVE_SPAN = 0.4, ARRIVE_FROM = 0.75;
/** Overshoots a little and settles, as a thing set down with a bit of spring */
const backOut = (t: number) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

/**
 * One of the places to find us, as its own app icon (the platform's colour, its mark in white), brought in by the
 * scroll: it rises from below, small and turned a little, and springs up into place, a beat after the one before it,
 * so the four arrive left to right. Scrolling back sets them down again
 */
function Platform({ s, i, label, icon: Icon, colour }: { s: MotionValue<number>; i: number; label: string; icon: (p: { size: number }) => React.ReactNode; colour: string }) {
    const p = useTransform(s, v => clamp((v - (LAST - ARRIVE_FROM) - i * ARRIVE_GAP) / ARRIVE_SPAN));
    const e = useTransform(p, t => backOut(t));
    const y = useTransform(e, t => (1 - t) * 56);
    const scale = useTransform(e, t => 0.55 + 0.45 * t);
    const rotate = useTransform(e, t => (1 - t) * (i % 2 ? 12 : -12));
    const opacity = useTransform(p, t => clamp(t * 2.5));
    // on hover or keyboard focus the tile comes forward a touch and catches a glow in its own colour, with a faint light
    // edge, and its name brightens; pressed, it gives a little
    return <motion.button type="button" onClick={() => toast(`Opens ${label}`)} aria-label={label} style={{ y, scale, rotate, opacity }}
                          className="group grid justify-items-center gap-2.5 rounded-[18px] focus-visible:!outline-none">
        <span className="flex size-[clamp(60px,16vw,76px)] items-center justify-center rounded-[22%] text-white shadow-[0_14px_34px_-10px_rgba(0,0,0,0.55)] transition-[transform,box-shadow] duration-300 ease-out group-hover:scale-[1.06] group-hover:[box-shadow:0_0_0_1px_rgba(255,255,255,0.22),0_16px_40px_-8px_color-mix(in_srgb,var(--tile)_75%,transparent)] group-focus-visible:scale-[1.06] group-focus-visible:[box-shadow:0_0_0_2px_var(--ui-text),0_16px_40px_-8px_color-mix(in_srgb,var(--tile)_75%,transparent)] group-active:scale-[0.97] group-active:duration-100"
              style={{ background: colour, "--tile": colour } as React.CSSProperties}>
            <Icon size={34}/>
        </span>
        <span className="text-[13px] text-ui-muted transition-colors duration-300 group-hover:text-ui-text group-focus-visible:text-ui-text">{label}</span>
    </motion.button>;
}

/** Join us: the four places to find us in a row, each arriving on the scroll */
function JoinUs({ s }: { s: MotionValue<number> }) {
    return <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-12 px-6 text-center max-[440px]:px-4">
        <h2 className="home-tagline !mt-0 !text-[20px]">Get Involved</h2>
        <div className="flex w-full justify-center gap-[clamp(16px,5vw,32px)]">
            {LINKS.map((link, i) => <Platform key={link.label} s={s} i={i} {...link}/>)}
        </div>
    </div>;
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

/** The footer's links (the app's legal pages) */
const FOOTER = ["About", "Privacy", "Cookies"];

/**
 * Home as a story told in one place, after zogreo.org: the screen stays put while the scroll moves it on. The emblem
 * in the middle becomes each stage's picture (the B, the cross, the grid map, a book, a question, the lit chapters of
 * the stats page), with its line beneath. The first screen says what Bible Game is and offers today's game; once the
 * story moves on, Play waits top right in the header instead. Each step tints the ground in its region's colour. At
 * the end the emblem goes and Join us takes its place, its links springing in one by one, with the footer beneath.
 *
 * The browser does the scrolling: each stage is a CSS snap point, so the page always comes to rest on one, with the
 * platform's own momentum, keyboard paging and accessibility, and nothing here moves the page by itself. The pictures
 * follow the scroll, eased a touch behind it. Screen readers get the whole story as text (the moving copies are hidden
 * from them)
 */
export default function Story() {
    const stages = useMemo(() => sequence(STAGES.map(st => st.shape)), []);
    // one stage's scroll, measured from the snap points themselves, so the pictures and the resting places always agree
    // (whatever the browser makes of svh as its toolbars come and go)
    const marker = useRef<HTMLDivElement>(null);
    const [step, setStep] = useState(() => window.innerHeight * STEP / 100);
    useEffect(() => {
        const measure = () => { if (marker.current?.offsetTop) setStep(marker.current.offsetTop); };
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, []);
    const { scrollY } = useScroll();
    // where the story is, in stages
    const raw = useTransform(scrollY, y => y / step);
    // eased a touch behind the scroll, so a wheel's steps still read as one glide
    const s = useSpring(raw, { stiffness: 170, damping: 30, mass: 0.6, restDelta: 0.0005 });
    // the header's Play comes in as the first screen's goes; the footer comes in with Join us, the nudge to scroll goes
    const headerPlay = useTransform(s, v => clamp((v - 0.35) / 0.4));
    const ending = useTransform(s, v => clamp((v - (LAST - 0.5)) / 0.4));
    const cue = useTransform(ending, e => 1 - e);
    const shown = (o: MotionValue<number>) => ({ opacity: o, visibility: useTransform(o, v => v > 0 ? "visible" : "hidden") as MotionValue<string> });

    const play = () => { window.location.hash = PLAY_ROUTE; };
    const next = () => window.scrollTo({ top: Math.min(LAST, Math.round(window.scrollY / step) + 1) * step, behavior: "smooth" });

    // the stages are the page's resting places; and a visit always opens on the B, never where a reload left the page
    useEffect(() => {
        const html = document.documentElement, was = history.scrollRestoration;
        html.style.scrollSnapType = "y mandatory";
        history.scrollRestoration = "manual";
        window.scrollTo(0, 0);
        s.jump(0);
        return () => { html.style.scrollSnapType = ""; history.scrollRestoration = was; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return <div className="relative" style={{ height: `calc(100svh + ${LAST * STEP}svh)` }}>
        {/* a resting place for each stage */}
        {STAGES.map((_, i) => <div key={i} ref={i === 1 ? marker : undefined} aria-hidden="true" className="pointer-events-none absolute inset-x-0 h-px"
                                   style={{ top: `${i * STEP}svh`, scrollSnapAlign: "start" }}/>)}

        <div className="sticky top-0 flex h-svh flex-col overflow-hidden">
            {STAGES.map((st, i) => st.colour ? <Tint key={i} s={s} at={i} colour={st.colour}/> : null)}
            <Header stars={0} end={<motion.div style={shown(headerPlay)}>
                {/* the header's Key Figure slot, as Log in: a small glass chip saying Play (Figma: Key Figure 1.2.0, Figure=Play) */}
                <button type="button" onClick={play} aria-label="Play today’s chapter"
                        className="flex h-9 items-center rounded-lg border border-ui-line bg-ui-surface px-3 text-[13px] font-semibold text-ui-text transition-colors hover:bg-ui-raised">
                    Play
                </button>
            </motion.div>}/>
            <main className="relative mx-auto flex w-full max-w-[36rem] flex-1 flex-col">
                {/* the story as text, for screen readers: the moving copies below are hidden from them */}
                <div className="sr-only">
                    <h1>Bible Game</h1>
                    <ol>{STAGES.filter(st => st.text).map(st => <li key={st.number}>{st.number} {st.phase}: {st.text}</li>)}</ol>
                </div>
                {/* every stage laid out alike: the emblem, then beneath it the stage's words */}
                <div className="flex flex-1 flex-col items-center justify-center px-6 pb-[72px] text-center max-[440px]:px-4">
                    <div className="relative flex w-full flex-col items-center gap-10">
                        <StoryEmblem stages={stages} at={s}/>
                        <div className="relative h-[132px] w-full max-w-[24rem]">
                            {/* the first screen: what it is, then today's game */}
                            <Fade at={0} s={s} className="absolute inset-x-0 top-0">
                                <div className="home-hero-text">
                                    <p className="home-tagline !mt-0">Explore the Bible <em>with a daily passage-guessing game</em></p>
                                </div>
                                <div className="home-hero-actions mt-6 [animation-delay:0.5s]">
                                    <button type="button" onClick={play} className="ui-button ui-primary h-12 w-full max-w-[18rem] text-[15px]">
                                        <PlayIcon className="size-[18px]" strokeWidth={2}/>Play today&apos;s chapter
                                    </button>
                                </div>
                            </Fade>
                            {STAGES.map((st, i) => st.text ? <Fade key={i} at={i} s={s} copy className="absolute inset-x-0 top-0">
                                {/* the phase above the line: its number in the mono, then its name in capitals; the line itself in the italic */}
                                <p className="mb-2.5 flex items-center justify-center gap-2.5 text-[13px] uppercase leading-5 tracking-[0.06em] text-ui-muted">
                                    <span className="font-mono font-medium tabular-nums">{st.number}</span>
                                    {st.phase}
                                </p>
                                <p className="home-tagline !mt-0 italic">{st.text}</p>
                            </Fade> : null)}
                        </div>

                        {/* the end: the emblem goes, and Join us takes its place, in the same space */}
                        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-screen max-w-[36rem] -translate-x-1/2">
                            {/* (the Fade moves itself, so it sits inside the box that centres it) */}
                            <Fade at={LAST} s={s} className="absolute inset-0">
                                <JoinUs s={s}/>
                            </Fade>
                        </div>
                    </div>
                </div>

                {/* the nudge to scroll on, until Join us, where the footer takes its place */}
                <motion.div className="absolute inset-x-0 bottom-0 flex justify-center" style={shown(cue)}>
                    <a href="#" onClick={e => { e.preventDefault(); next(); }} className="home-hero-cue">
                        Scroll down
                        <ChevronDownIcon className="size-5" aria-hidden="true"/>
                    </a>
                </motion.div>
                <motion.footer className="absolute inset-x-0 bottom-0 px-6 pb-[max(16px,env(safe-area-inset-bottom))] max-[440px]:px-4" style={shown(ending)}>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ui-line pt-4 text-[13px] text-ui-muted">
                        {FOOTER.map(link => <button key={link} type="button" onClick={() => toast(`Opens ${link}`)} className="min-h-[44px] hover:text-ui-text">{link}</button>)}
                        <span className="ml-auto text-ui-faint">Bible Game {new Date().getFullYear()}</span>
                    </div>
                </motion.footer>
            </main>
        </div>
        <Toaster/>
    </div>;
}
