import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, MotionValue, useScroll, useTransform } from "framer-motion";
import { ChevronDownIcon, GithubIcon, LinkedinIcon, MailIcon, MessageCircleIcon, PlayIcon } from "lucide-react";
import Header from "@/demo/header";
import StoryEmblem from "@/demo/story-emblem";
import { sequence, type ShapeName } from "@/demo/emblem-shapes";
import { toast, Toaster } from "@/demo/toast";
import { PLAY_ROUTE } from "@/demo/first-run";

type Stage = { shape: ShapeName; number?: string; label?: string; title?: string; text?: string };

/** The story, a stage per stop of the scroll: the hero, what Bible Game is for, its three daily steps, the record they leave, then Join us */
const STAGES: Stage[] = [
    { shape: "b" },
    { shape: "cross", number: "00", label: "Purpose", title: "The Bible tells the human story", text: "Understanding it helps us better navigate what’s next" },
    { shape: "map", number: "01", label: "Play", title: "Bible Game exists to encourage your daily spiritual practice", text: "You build familiarity by finding each day’s chapter" },
    { shape: "book", number: "02", label: "Read", title: "Read the day’s chapter", text: "This will get you through the whole Bible in about four years" },
    { shape: "question", number: "03", label: "Study", title: "Stretch your understanding with some questions", text: "Digest the passage by adding your own interpretation" },
    { shape: "stats", number: "04", label: "Statistics", title: "Record your Bible reading over time", text: "Track your numbers and compare with friends" },
    { shape: "none" },
];
const LAST = STAGES.length - 1;

/** How far the page scrolls from one stage to the next, and then for the logos' run across Join us, as shares of the screen's height */
const STEP = 70;
const RUN = 110;
/** Where the logos set off (in stages: as the emblem goes) and arrive (the end of the page) */
const RUN_FROM = LAST - 0.5, RUN_TO = LAST + RUN / STEP;

const LINKS = [
    { label: "Email", icon: MailIcon, colour: "#d4b455" },
    { label: "Discord", icon: MessageCircleIcon, colour: "#5865f2" },
    { label: "LinkedIn", icon: LinkedinIcon, colour: "#0a66c2" },
    { label: "GitHub", icon: GithubIcon, colour: "#2b3137" },
];

const clamp = (t: number) => Math.min(1, Math.max(0, t));

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

/** A stage's number, in the background: large and faint, bleeding off the corner, drifting up as the scroll passes */
function Numeral({ at, s, children }: { at: number; s: MotionValue<number>; children: string }) {
    const opacity = useTransform(s, v => clamp(1 - Math.abs(v - at) * 2.2));
    const y = useTransform(s, v => (at - v) * 120);
    return <motion.p aria-hidden="true" style={{ opacity, y }}
                     className="absolute -bottom-[0.18em] -right-[0.06em] select-none font-mono text-[clamp(200px,58vw,340px)] font-light leading-none tracking-[-0.06em] text-ui-text/[0.06]">
        {children}
    </motion.p>;
}

/**
 * Join us: the links ride in from the right along a wide arc as the page scrolls, as zogreo.org's platforms do, and
 * come to rest side by side in the middle at the end of the page
 */
function Logos({ s }: { s: MotionValue<number> }) {
    const box = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 375, height: 600 });
    useEffect(() => {
        const element = box.current!;
        const observer = new ResizeObserver(() => setSize({ width: element.clientWidth, height: element.clientHeight }));
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    // the arc: a wide circle whose top runs through the middle of the box
    const radius = Math.max(700, size.width * 1.2), top = size.height * 0.5, cx = size.width / 2;
    const gap = Math.min(112, (size.width - 40) / LINKS.length);
    const arc = (x: number) => { const dx = Math.min(Math.abs(x - cx), radius); return top + radius - Math.sqrt(radius * radius - dx * dx); };
    const run = useTransform(s, v => clamp((v - RUN_FROM) / (RUN_TO - RUN_FROM)));
    const circle = useTransform(run, r => (1 - r) * 40);
    const shown = useTransform(s, v => clamp((v - RUN_FROM) * 2));

    return <div ref={box} className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* the arc they ride, and a wider one behind it, faint */}
        <motion.svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" style={{ y: circle, opacity: shown }}>
            <circle cx={cx} cy={top + radius} r={radius} fill="none" stroke="currentColor" className="text-ui-line" strokeWidth={1}/>
            <circle cx={cx * 0.4} cy={top + radius * 0.9} r={radius * 1.1} fill="none" stroke="currentColor" className="text-ui-line/50" strokeWidth={1}/>
        </motion.svg>
        {LINKS.map(({ label, icon: Icon, colour }, i) => <Logo key={label} run={run} index={i} label={label} colour={colour} arc={arc}
                                                              rest={cx + (i - (LINKS.length - 1) / 2) * gap} start={size.width + 60 + i * gap * 1.6}>
            <Icon className="size-7 text-white" strokeWidth={1.75}/>
        </Logo>)}
    </div>;
}

function Logo({ run, label, colour, arc, rest, start, children }: {
    run: MotionValue<number>; index: number; label: string; colour: string; arc: (x: number) => number; rest: number; start: number; children: React.ReactNode;
}) {
    // eased, so they slow as they arrive
    const ease = (r: number) => 1 - Math.pow(1 - r, 2.2);
    const x = useTransform(run, r => start + (rest - start) * ease(r));
    const left = useTransform(x, v => v - 32);
    const top = useTransform(x, v => arc(v) - 32);
    const rotate = useTransform(x, v => (v - rest) * 0.04);
    return <motion.button type="button" onClick={() => toast(`Opens ${label}`)} style={{ left, top, rotate }}
                          className="pointer-events-auto absolute grid w-16 justify-items-center gap-1.5">
        <span className="flex size-16 items-center justify-center rounded-2xl shadow-[0_10px_28px_rgba(0,0,0,0.45)] ring-1 ring-white/10" style={{ background: colour }}>{children}</span>
        <span className="text-[12px] text-ui-muted">{label}</span>
    </motion.button>;
}

/**
 * Home as a story told in one place, after zogreo.org: the screen stays put while the scroll moves it on. The emblem
 * in the middle becomes each stage's picture (the B, the cross, the grid map, a book, a question, the lit chapters of
 * the stats page), with the stage's words under it and its number large and faint behind. Everything follows the
 * scroll itself, so stopping part-way shows the change part-way; a fling comes to rest on a stage. At the end the
 * emblem goes and Join us takes its place, its links riding in along an arc
 */
export default function Story() {
    const stages = useMemo(() => sequence(STAGES.map(s => s.shape)), []);
    const { scrollY } = useScroll();
    // where the story is, in stages
    const s = useTransform(scrollY, y => y / (window.innerHeight * STEP / 100));
    const cue = useTransform(s, v => clamp(1 - v * 4));

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
            {/* each stage's number, behind everything */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                {STAGES.map((st, i) => st.number ? <Numeral key={i} at={i} s={s}>{st.number}</Numeral> : null)}
            </div>

            <Header stars={0}/>
            <main className="relative mx-auto flex w-full max-w-[36rem] flex-1 flex-col">
                {/* the emblem, then the stage's words under it */}
                <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 pb-[88px] text-center max-[440px]:px-4">
                    <StoryEmblem stages={stages} at={s}/>
                    <div className="relative h-[164px] w-full max-w-[24rem]">
                        <Fade at={0} s={s} className="absolute inset-x-0 top-0 grid justify-items-center gap-10">
                            <h1 className="home-hero-text home-tagline !mt-0">Explore the Bible <em>with a daily passage-guessing game</em></h1>
                            <div className="home-hero-actions">
                                <button type="button" onClick={play} className="ui-button ui-primary h-12 w-full max-w-[18rem] text-[15px]">
                                    <PlayIcon className="size-[18px]" strokeWidth={2}/>Play today&apos;s chapter
                                </button>
                            </div>
                        </Fade>
                        {STAGES.map((st, i) => st.title ? <Fade key={i} at={i} s={s} className="absolute inset-x-0 top-0 grid gap-2">
                            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ui-faint">{st.label}</p>
                            <h2 className="text-balance text-[24px] font-light leading-[1.2] text-ui-text">{st.title}</h2>
                            <p className="text-balance text-[16px] leading-[1.4] text-ui-faint">{st.text}</p>
                        </Fade> : null)}
                    </div>
                </div>

                {/* the end: the emblem has gone, and Join us takes its place */}
                <Fade at={LAST} s={s} stay className="absolute inset-0">
                    <div className="absolute inset-x-0 top-[18%] grid gap-2 px-6 text-center">
                        <h2 className="text-[34px] font-light leading-[1.1]">Join us</h2>
                        <p className="text-[13px] text-ui-faint">Bible Game {new Date().getFullYear()}</p>
                    </div>
                </Fade>
                <Logos s={s}/>

                {/* the nudge to scroll, only on the hero */}
                <motion.div className="absolute inset-x-0 bottom-0 flex justify-center" style={{ opacity: cue, pointerEvents: useTransform(cue, c => c > 0.5 ? "auto" : "none") }}>
                    <a href="#" onClick={e => { e.preventDefault(); window.scrollTo({ top: window.innerHeight * STEP / 100, behavior: "smooth" }); }} className="home-hero-cue">
                        Scroll down
                        <ChevronDownIcon className="size-5" aria-hidden="true"/>
                    </a>
                </motion.div>
            </main>
        </div>
        <Toaster/>
    </div>;
}
