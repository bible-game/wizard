import React, { useEffect, useMemo, useRef } from "react";
import { motion, MotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { ChevronDownIcon, MailIcon, PlayIcon } from "lucide-react";
import { SiDiscord, SiGithub } from "@icons-pack/react-simple-icons";
import Header from "@/demo/header";
import StoryEmblem from "@/demo/story-emblem";
import { sequence, type ShapeName } from "@/demo/emblem-shapes";
import { toast, Toaster } from "@/demo/toast";
import { PLAY_ROUTE } from "@/demo/first-run";
import { playTheme } from "@/core/style/play-theme";

/** A stage: its shape, its number and phase, its line (a *starred* phrase set in italic), and the region colour its step tints the ground */
type Stage = { shape: ShapeName; number?: string; phase?: string; text?: string; colour?: string };

/**
 * The story, a stage per stop of the scroll: the hero, what Bible Game is for, its three daily steps, the record they
 * leave, then Join us; and round again. Each step in a region's colour, in the order the map runs
 */
const STAGES: Stage[] = [
    { shape: "b" },
    { shape: "cross", number: "00", phase: "Purpose", text: "Understand the *human story*" },
    { shape: "map", number: "01", phase: "Play", text: "Learn to visualise the structure", colour: playTheme.teal },
    { shape: "book", number: "02", phase: "Read", text: "Dive into each chapter", colour: playTheme.purple },
    { shape: "question", number: "03", phase: "Study", text: "Stretch your understanding", colour: playTheme.rose },
    { shape: "stats", number: "04", phase: "Stats", text: "Track your numbers over time", colour: playTheme.gold },
    { shape: "none" },
];
const LAST = STAGES.length - 1;

/** How far the page scrolls from one stage to the next, as a share of the screen's height */
const STEP = 70;
/**
 * The end of the page, one stage on from Join us, where the B has formed again as at the top: arriving here, the page
 * goes back to the top, which looks the same, so the story runs round and round
 */
const LOOP = LAST + 1;

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

/** A line with its *starred* phrase in the italic of the same face (an <i>: the tagline's <em> is its second line) */
const styled = (text: string) => text.split("*").map((part, i) => i % 2 ? <i key={i}>{part}</i> : part);


/**
 * Shown at its stage, and by the scroll: it fades and rises in as the story nears it, and on out as it leaves, so a
 * part-way scroll shows it part-way. `until` holds it shown from its stage to there (Join us, through the logos' run)
 */
function Fade({ at, s, until = at, className, children }: { at: number; s: MotionValue<number>; until?: number; className?: string; children: React.ReactNode }) {
    const off = (v: number) => v < at ? at - v : v > until ? until - v : 0;
    const near = (v: number) => clamp(1 - Math.abs(off(v)) * 2.4);
    const opacity = useTransform(s, near);
    const y = useTransform(s, v => off(v) * 28);
    const visibility = useTransform(s, v => near(v) > 0 ? "visible" : "hidden");
    const pointerEvents = useTransform(s, v => near(v) > 0.6 ? "auto" : "none");
    return <motion.div className={className} style={{ opacity, y, visibility, pointerEvents }}>{children}</motion.div>;
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
    return <motion.button type="button" onClick={() => toast(`Opens ${label}`)} aria-label={label} style={{ y, scale, rotate, opacity }}
                          className="group grid justify-items-center gap-2.5">
        <span className="flex size-[clamp(60px,16vw,76px)] items-center justify-center rounded-[22%] text-white shadow-[0_14px_34px_rgba(0,0,0,0.4)] transition-transform duration-200 group-hover:-translate-y-1 group-active:scale-95"
              style={{ background: colour }}>
            <Icon size={34}/>
        </span>
        <span className="text-[13px] text-ui-muted transition-colors group-hover:text-ui-text">{label}</span>
    </motion.button>;
}

/** Join us: the four places to find us in a row, each arriving on the scroll */
function JoinUs({ s }: { s: MotionValue<number> }) {
    return <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-12 px-6 text-center max-[440px]:px-4">
        <h2 className="home-tagline !mt-0 text-[34px]">Join us</h2>
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

/** One stage's worth of scroll, in pixels */
const stepPx = () => window.innerHeight * STEP / 100;
/** How far into the next stage (as a share of a stage) a scroll has to go for the story to carry on to it */
const NUDGE = 0.18;
/** The glide's time: a short hop is quick, a long one takes longer, but never drags */
const glideTime = (px: number) => Math.min(950, 420 + px * 0.3);
/** In gently, out slow: it gathers, then settles into place */
const settle = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Comes to rest on a stage, as a weighted object would, after sloshseltzer.com: once a scroll lets go (the wheel, the
 * finger and its momentum all still), the page glides to a stage, the next one in the scroll's direction if it went a
 * little way (NUDGE) towards it, else back to the one it left. So a small push turns the page one stage, a fling
 * carries on over several, and every stop lands square, where a shape's life plays out; past Join us, it goes round to
 * the top. Any wheel, touch or key stops a glide at once, so it never fights the hand.
 * Returns a glide to a stage, for the cue. `onLoop` is told when the page goes round to the top
 */
function useStageSnap(onLoop: React.RefObject<() => void>) {
    const glide = useRef<(stage: number) => void>(() => {});
    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            glide.current = stage => window.scrollTo({ top: stage * stepPx() });
            return;
        }
        let timer = 0, frame = 0, gliding = false, touching = false, lastY = window.scrollY, heading = 0;
        const stop = () => { cancelAnimationFrame(frame); gliding = false; };
        glide.current = stage => {
            stop();
            const from = window.scrollY, to = stage * stepPx(), distance = to - from;
            if (Math.abs(distance) < 1) return;
            const start = performance.now(), time = glideTime(Math.abs(distance));
            gliding = true;
            const step = (now: number) => {
                const t = Math.min(1, (now - start) / time);
                window.scrollTo(0, from + distance * settle(t));
                if (t < 1) frame = requestAnimationFrame(step); else { gliding = false; lastY = window.scrollY; }
            };
            frame = requestAnimationFrame(step);
        };
        const rest = () => {
            if (touching || gliding) return;
            const at = window.scrollY / stepPx();
            const below = Math.floor(at), into = at - below;
            const to = heading > 0 ? (into > NUDGE ? below + 1 : below) : heading < 0 ? (into < 1 - NUDGE ? below : below + 1) : Math.round(at);
            if (Math.abs(to - at) * stepPx() > 1) glide.current(Math.min(LOOP, Math.max(0, to)));
        };
        const onScroll = () => {
            // round again: the end of the page shows what the top does, so going back there is seamless
            if (window.scrollY >= LOOP * stepPx() - 1) { stop(); window.scrollTo(0, 0); lastY = 0; heading = 0; onLoop.current(); return; }
            if (gliding) return;
            const y = window.scrollY;
            if (y !== lastY) heading = Math.sign(y - lastY);
            lastY = y;
            clearTimeout(timer);
            timer = window.setTimeout(rest, 140);
        };
        const onHand = () => { if (gliding) stop(); };
        const onTouch = (e: TouchEvent) => { touching = e.type === "touchstart"; onHand(); if (!touching) { clearTimeout(timer); timer = window.setTimeout(rest, 160); } };
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("wheel", onHand, { passive: true });
        window.addEventListener("keydown", onHand);
        window.addEventListener("touchstart", onTouch, { passive: true });
        window.addEventListener("touchend", onTouch, { passive: true });
        return () => {
            stop(); clearTimeout(timer);
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("wheel", onHand);
            window.removeEventListener("keydown", onHand);
            window.removeEventListener("touchstart", onTouch);
            window.removeEventListener("touchend", onTouch);
        };
    }, []);
    return (stage: number) => glide.current(stage);
}

/**
 * Home as a story told in one place, after zogreo.org: the screen stays put while the scroll moves it on. The emblem
 * in the middle becomes each stage's picture (the B, the cross, the grid map, a book, a question, the lit chapters of
 * the stats page), with its line beneath; the first screen alone has the button to play.
 * Everything follows the scroll itself, so a drag part-way shows the change part-way; let go and it glides to rest on a
 * stage (useStageSnap). Each step tints the ground in its region's colour. At the end the emblem goes and Join us takes
 * its place, its links springing in one by one; then the B forms again and the story goes round from the top
 */
export default function Story() {
    // the shapes, and the B again after Join us, for the loop
    const shapes = useMemo(() => [...STAGES.map(st => st.shape), "b" as const], []);
    const stages = useMemo(() => sequence(shapes), [shapes]);
    const { scrollY } = useScroll();
    // where the story is, in stages
    const raw = useTransform(scrollY, y => y / (window.innerHeight * STEP / 100));
    // eased a touch behind the finger, so a jerky scroll or a wheel's steps still read as one glide
    const s = useSpring(raw, { stiffness: 170, damping: 30, mass: 0.6, restDelta: 0.0005 });
    // the button is the first screen's alone: it goes as the story sets off, and comes back with the B at the loop (its
    // place is kept, so nothing else moves)
    const action = useTransform(s, v => Math.max(clamp((0.6 - v) / 0.4), clamp((v - (LOOP - 0.6)) / 0.4)));
    // going round to the top: the eased story jumps with the page, rather than running back through every stage
    const onLoop = useRef(() => s.jump(0));
    const glideTo = useStageSnap(onLoop);
    const next = () => {
        const now = window.scrollY / stepPx();
        glideTo(Math.min(LOOP, Math.floor(now + 0.1) + 1));
    };

    const play = () => { window.location.hash = PLAY_ROUTE; };

    // a visit always opens on the B, never part-way through where a reload left the page
    useEffect(() => {
        const was = history.scrollRestoration;
        history.scrollRestoration = "manual";
        window.scrollTo(0, 0);
        s.jump(0);
        return () => { history.scrollRestoration = was; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return <div className="relative" style={{ height: `calc(100svh + ${LOOP * STEP}svh)` }}>
        <div className="sticky top-0 flex h-svh flex-col overflow-hidden">
            {STAGES.map((st, i) => st.colour ? <Tint key={i} s={s} at={i} colour={st.colour}/> : null)}
            <Header stars={0}/>
            <main className="relative mx-auto flex w-full max-w-[36rem] flex-1 flex-col">
                {/* every stage laid out as the hero is: the emblem, two lines of words, then the button, which stays put */}
                <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 pb-[72px] text-center max-[440px]:px-4">
                    <div className="relative flex w-full flex-col items-center gap-10">
                        <StoryEmblem stages={stages} names={shapes} at={s}/>
                        <div className="relative h-[92px] w-full max-w-[24rem]">
                            {/* the hero's line, at the top and again at the end, where the story comes round */}
                            {[0, LOOP].map(at => <Fade key={at} at={at} s={s} className="absolute inset-x-0 top-0">
                                {React.createElement(at ? "p" : "h1", { className: `${at ? "" : "home-hero-text "}home-tagline !mt-0`, "aria-hidden": at ? true : undefined },
                                    <>Explore the Bible <em>with a daily passage-guessing game</em></>)}
                            </Fade>)}
                            {STAGES.map((st, i) => st.text ? <Fade key={i} at={i} s={s} className="absolute inset-x-0 top-0">
                                {/* the phase above the line: its number in the mono (in the step's colour), then its name */}
                                <p className="mb-2.5 flex items-center justify-center gap-2.5 text-[14px] leading-5 text-ui-muted">
                                    <span className="font-mono font-medium tabular-nums" style={{ color: st.colour ?? playTheme.faint }}>{st.number}</span>
                                    {st.phase}
                                </p>
                                <h2 className="home-tagline !mt-0">{styled(st.text!)}</h2>
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
                    <motion.div className="home-hero-actions" style={{ opacity: action, visibility: useTransform(action, a => a > 0 ? "visible" : "hidden") }}>
                        <button type="button" onClick={play} className="ui-button ui-primary h-12 w-full max-w-[18rem] text-[15px]">
                            <PlayIcon className="size-[18px]" strokeWidth={2}/>Play today&apos;s chapter
                        </button>
                    </motion.div>
                </div>

                {/* the nudge to scroll on, always: the story has no end */}
                <div className="absolute inset-x-0 bottom-0 flex justify-center">
                    <a href="#" onClick={e => { e.preventDefault(); next(); }} className="home-hero-cue">
                        Scroll down
                        <ChevronDownIcon className="size-5" aria-hidden="true"/>
                    </a>
                </div>
            </main>
        </div>
        <Toaster/>
    </div>;
}
