import React, { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { ArrowRightIcon, CalendarIcon, MailIcon, PlayIcon } from "lucide-react";
import { SiDiscord, SiGithub } from "@icons-pack/react-simple-icons";
import GlowingCross from "@/app/home/glowing-cross";
import { morphCells, rounded, WIDTH, HEIGHT } from "@/core/style/mosaic";
import { toast, Toaster } from "@/demo/toast";
import { PLAY_ROUTE } from "@/demo/first-run";
import { Stage } from "@/demo/welcome/scenes";
import ChapterField from "@/demo/welcome/chapter-field";
import { CHAPTERS } from "@/demo/welcome/chapters";
import "./welcome.sass";

const play = () => { window.location.hash = PLAY_ROUTE; };

/** The six steps of a day, each told in a line, the stage showing it */
const STEPS = [
    { title: "Read the clue", body: "Each day, one chapter of the Bible hides behind a single line." },
    { title: "Find it on the map", body: "All 1,189 chapters are laid out as one map. Zoom in and tap the chapter you think it is." },
    { title: "Follow the readings", body: "Five guesses. Each shows how many verses away the answer is, and which way. The closer, the greener." },
    { title: "Read the chapter", body: "Found or not, the chapter opens in the reader. Most take about five minutes." },
    { title: "Think it through", body: "One question on what it means, with the verses that explain it. A right answer earns another star." },
    { title: "Watch it add up", body: "Stars, a daily streak, and a map of the Bible that fills in as you go." },
];

/** The logo's B, still: the emblem's stones in their own colours, for the header */
function Mark({ size = 28 }: { size?: number }) {
    return <svg viewBox={`-6 -6 ${WIDTH + 12} ${HEIGHT + 12}`} style={{ height: size, width: size * (WIDTH + 12) / (HEIGHT + 12) }} aria-hidden="true">
        {morphCells.map((cell, k) => <path key={k} d={rounded(cell.b)} fill={cell.colour.b} fillOpacity={0.2} stroke={cell.colour.b} strokeWidth={2.4} strokeLinejoin="round"/>)}
    </svg>;
}

function Header() {
    const { scrollY } = useScroll();
    const [scrolled, setScrolled] = useState(false);
    useMotionValueEvent(scrollY, "change", y => setScrolled(y > 8));
    return <header className={`wl-header ${scrolled ? "backdrop-blur-xl" : ""}`} data-scrolled={scrolled ? "" : undefined}>
        <div className="wl-wrap flex h-16 items-center justify-between">
            <a href="#" className="-ml-1 flex items-center gap-2.5 rounded-lg px-1 py-1" aria-label="Bible Game, home">
                <Mark/>
                <span className="text-[17px] font-semibold">Bible Game</span>
            </a>
            <nav className="flex items-center gap-1">
                <a href="#how-it-works" className="hidden h-11 items-center rounded-lg px-3 text-[14px] font-medium text-ui-muted hover:text-ui-text sm:flex">How it works</a>
                <button type="button" onClick={() => toast("Opens Log in")} className="h-11 rounded-lg px-3 text-[14px] font-medium text-ui-muted hover:text-ui-text">Log in</button>
                <button type="button" onClick={play} className="ui-button ui-primary ml-1 !min-h-0 h-10 px-4">Play</button>
            </nav>
        </div>
    </header>;
}

function Hero() {
    const today = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).replace(",", "");
    return <section className="wl-hero wl-wrap">
        <div className="wl-rise" style={{ animationDelay: "0ms" }}><GlowingCross height={136}/></div>
        <span className="wl-rise mt-10 flex h-9 items-center gap-2 rounded-lg border border-ui-line bg-ui-surface px-3 text-[13px] font-medium text-ui-muted" style={{ animationDelay: "250ms" }}>
            <CalendarIcon className="size-4"/>Today’s chapter · {today}
        </span>
        <h1 className="wl-display wl-rise mt-6" style={{ animationDelay: "350ms" }}>
            Explore the Bible,<br/><span className="text-ui-muted">one chapter a day.</span>
        </h1>
        <p className="wl-lede wl-rise mt-5" style={{ animationDelay: "450ms" }}>
            A daily passage-guessing game. Find the chapter from a one-line clue, then read it and think it through.
        </p>
        <div className="wl-rise mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row" style={{ animationDelay: "550ms" }}>
            <button type="button" onClick={play} className="ui-button ui-primary h-12 w-full max-w-[20rem] px-6 !text-[16px] sm:w-auto">
                <PlayIcon className="size-[18px]" strokeWidth={2}/>Play today’s chapter
            </button>
            <a href="#how-it-works" className="ui-button h-12 w-full max-w-[20rem] px-6 !text-[16px] sm:w-auto">How it works</a>
        </div>
        <p className="wl-rise mt-5 text-[13px] text-ui-faint" style={{ animationDelay: "650ms" }}>Free · No sign-up to play · About ten minutes a day</p>
    </section>;
}

/**
 * How it works, as one held scene: the stage stays put while the scroll moves through the day's six steps, the steps
 * listed beside it (on phones, the current one beneath it). A step is reached part-way through its stretch of the
 * scroll and holds until the next; tapping a step's name scrolls to it
 */
function HowItWorks() {
    const section = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
    const [step, setStep] = useState(0);
    useMotionValueEvent(scrollYProgress, "change", p => setStep(Math.min(STEPS.length - 1, Math.max(0, Math.floor(p * STEPS.length * 0.999)))));
    const bar = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

    const goTo = (i: number) => {
        const el = section.current!;
        const span = el.offsetHeight - window.innerHeight;
        window.scrollTo({ top: el.offsetTop + span * (i + 0.5) / STEPS.length, behavior: "smooth" });
    };

    return <section id="how-it-works" ref={section} className="relative" style={{ height: `${STEPS.length * 85 + 100}svh` }}>
        <div className="sticky top-0 flex h-svh flex-col pt-16">
            <div className="wl-wrap wl-how">
                <div className="wl-how-copy">
                    <p className="wl-kicker">How it works</p>
                    <h2 className="wl-title mt-3 hidden lg:block">Ten minutes,<br/>six small steps.</h2>
                    {/* wide screens: every step, the current one lit */}
                    <ol className="mt-10 hidden gap-1 lg:grid">
                        {STEPS.map((s, i) => <li key={s.title}>
                            <button type="button" onClick={() => goTo(i)} aria-current={i === step ? "step" : undefined} className="wl-step">
                                <span className="font-mono text-[13px] font-medium tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                                <span>
                                    <span className="block text-[18px] font-semibold leading-6">{s.title}</span>
                                    <span className="wl-step-body">{s.body}</span>
                                </span>
                            </button>
                        </li>)}
                    </ol>
                </div>
                <div className="wl-how-stage">
                    <Stage step={step}/>
                    {/* phones: the current step under the stage */}
                    <div className="mt-5 min-h-[112px] lg:hidden">
                        <div className="mb-4 flex gap-1.5" aria-hidden="true">
                            {STEPS.map((_, i) => <button key={i} type="button" tabIndex={-1} onClick={() => goTo(i)} className="h-6 flex-1">
                                <span className={`block h-[3px] rounded-full transition-colors ${i <= step ? "bg-ui-text" : "bg-ui-raised"}`}/>
                            </button>)}
                        </div>
                        <motion.div key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} aria-live="polite">
                            <p className="flex items-baseline gap-2.5 text-[18px] font-semibold leading-6">
                                <span className="font-mono text-[13px] font-medium text-ui-faint">{String(step + 1).padStart(2, "0")}</span>{STEPS[step].title}
                            </p>
                            <p className="mt-1.5 text-[15px] leading-[22px] text-ui-muted">{STEPS[step].body}</p>
                        </motion.div>
                    </div>
                </div>
            </div>
            <div className="wl-wrap hidden pb-8 lg:block" aria-hidden="true">
                <div className="h-px bg-ui-line"><motion.div className="h-full bg-ui-text" style={{ width: bar }}/></div>
            </div>
        </div>
    </section>;
}

/** The whole Bible, lit chapter by chapter in reading order as the section comes up the screen */
function WholeBible() {
    const field = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: field, offset: ["start 0.85", "end 0.45"] });
    const today = CHAPTERS.findIndex(c => c.key === "PSA" && c.chapter === 127);
    return <section className="wl-wrap wl-section">
        <div className="mx-auto max-w-[44rem] text-center">
            <p className="wl-kicker">Why play</p>
            <h2 className="wl-title mt-3">Most of us know a few favourite passages. This is the whole story.</h2>
            <p className="wl-lede mx-auto mt-5">From Genesis to Revelation, a different chapter every day. Over time the familiar parts connect to the rest, and the map fills in.</p>
        </div>
        <div ref={field} className="mx-auto mt-14 max-w-[56rem]">
            <ChapterField columns={41} progress={scrollYProgress} focus={today} readout className="hidden md:block"/>
            <ChapterField columns={29} progress={scrollYProgress} focus={today} readout className="md:hidden"/>
        </div>
        <dl className="mx-auto mt-14 grid max-w-[56rem] gap-8 sm:grid-cols-3">
            {[
                { value: "1,189", label: "chapters, every one on the map" },
                { value: "10 min", label: "a day to find, read and study one" },
                { value: "~4 years", label: "to have seen the whole Bible" },
            ].map(f => <div key={f.value} className="border-t border-ui-line pt-5">
                <dt className="text-[36px] font-semibold leading-[42px] tabular-nums tracking-[-0.01em]">{f.value}</dt>
                <dd className="mt-1 text-[15px] leading-[22px] text-ui-muted">{f.label}</dd>
            </div>)}
        </dl>
    </section>;
}

function Finale() {
    return <section className="wl-wrap wl-section text-center">
        <div className="wl-finale">
            <Mark size={56}/>
            <h2 className="wl-title mt-8">Today’s chapter is waiting.</h2>
            <p className="wl-lede mx-auto mt-4">No account needed to play. Sign up later to keep your stars and streak.</p>
            <div className="mt-9 flex flex-col items-center gap-4">
                <button type="button" onClick={play} className="ui-button ui-primary h-12 w-full max-w-[20rem] px-6 !text-[16px]">
                    <PlayIcon className="size-[18px]" strokeWidth={2}/>Play today’s chapter
                </button>
                <button type="button" onClick={() => toast("Opens Log in")} className="flex items-center gap-1.5 text-[14px] text-ui-muted hover:text-ui-text">
                    Already playing? Log in<ArrowRightIcon className="size-4"/>
                </button>
            </div>
        </div>
    </section>;
}

const COMMUNITY = [
    { label: "Discord", icon: <SiDiscord size={18}/> },
    { label: "GitHub", icon: <SiGithub size={18}/> },
    { label: "Email", icon: <MailIcon className="size-[18px]"/> },
];

function Footer() {
    return <footer className="wl-wrap pb-[max(32px,env(safe-area-inset-bottom))]">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-ui-line pt-6 text-[14px] text-ui-muted">
            <div className="flex items-center gap-2.5 text-ui-text"><Mark size={22}/><span className="font-semibold">Bible Game</span></div>
            {["About", "Privacy", "Cookies"].map(l => <button key={l} type="button" onClick={() => toast(`Opens ${l}`)} className="hover:text-ui-text">{l}</button>)}
            <div className="ml-auto flex items-center gap-1">
                {COMMUNITY.map(c => <button key={c.label} type="button" aria-label={c.label} onClick={() => toast(`Opens ${c.label}`)} className="ui-icon">{c.icon}</button>)}
            </div>
        </div>
        <p className="mt-4 text-[13px] text-ui-faint">© {new Date().getFullYear()} Bible Game · Scripture from the World English Bible</p>
    </footer>;
}

/**
 * Home for a first visit: what Bible Game is, in one line and one button; then a day of it played out on a held stage;
 * then why it's worth doing, the whole Bible lighting up; then the button again. Built only from the app's own parts
 * and palette: Plex Sans and Mono, glass on the Ground, the region colours and the closeness traffic light
 */
export default function Welcome() {
    return <div className="wl">
        <Header/>
        <main>
            <Hero/>
            <HowItWorks/>
            <WholeBible/>
            <Finale/>
        </main>
        <Footer/>
        <Toaster/>
    </div>;
}
