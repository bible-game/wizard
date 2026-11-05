import React, { useEffect, useMemo, useState } from "react";
import { ChevronDownIcon, GithubIcon, LinkedinIcon, MailIcon, MessageCircleIcon, PlayIcon } from "lucide-react";
import Header from "@/demo/header";
import StoryEmblem from "@/demo/story-emblem";
import { sequence, type ShapeName } from "@/demo/emblem-shapes";
import { toast, Toaster } from "@/demo/toast";
import { PLAY_ROUTE } from "@/demo/first-run";

type Stage = { shape: ShapeName; number?: string; label?: string; title?: string; text?: string };

/** The story, a stage per stop of the scroll: the hero, what Bible Game is for, its three daily steps, the record they leave, then where to find us */
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

/** How far the page scrolls from one stage to the next, as a share of the screen's height */
const STEP = 70;

const LINKS = [
    { label: "Email", icon: MailIcon },
    { label: "Discord", icon: MessageCircleIcon },
    { label: "LinkedIn", icon: LinkedinIcon },
    { label: "GitHub", icon: GithubIcon },
];

/** Shown at its stage, gone at any other: it rises in a moment after the stones set off, and goes at once */
const shown = (on: boolean): React.CSSProperties => ({
    opacity: on ? 1 : 0,
    transform: on ? "none" : "translateY(10px)",
    transition: on ? "opacity 0.6s ease-out 0.35s, transform 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) 0.35s" : "opacity 0.25s ease-in, transform 0.25s ease-in",
    pointerEvents: on ? "auto" : "none",
    visibility: on ? "visible" : "hidden",
    transitionProperty: on ? "opacity, transform" : "opacity, transform, visibility",
});

/**
 * Home as a story told in one place, after zogreo.org: the screen stays put while the scroll moves it on. The emblem
 * in the middle becomes each stage's picture (the B, the cross, the grid map, a book, a question, the lit chapters of
 * the stats page), the stage's number and name sit top left, and its two lines under the emblem. At the end the emblem
 * goes and the links take its place. A fling comes to rest on a stage
 */
export default function Story() {
    const stages = useMemo(() => sequence(STAGES.map(s => s.shape)), []);
    const [stage, setStage] = useState(0);

    useEffect(() => {
        const update = () => setStage(Math.min(LAST, Math.max(0, Math.round(window.scrollY / (window.innerHeight * STEP / 100)))));
        update();
        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        const html = document.documentElement;
        html.style.scrollSnapType = "y proximity";
        return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); html.style.scrollSnapType = ""; };
    }, []);

    const current = STAGES[stage];
    const play = () => { window.location.hash = PLAY_ROUTE; };

    return <div className="relative" style={{ height: `calc(100svh + ${LAST * STEP}svh)` }}>
        {/* a resting place for each stage */}
        {STAGES.map((_, i) => <div key={i} aria-hidden="true" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: `${i * STEP}svh`, scrollSnapAlign: "start" }}/>)}

        <div className="sticky top-0 flex h-svh flex-col overflow-hidden">
            <Header stars={0}/>
            <main className="relative mx-auto flex w-full max-w-[36rem] flex-1 flex-col">
                {/* the stage's number and name, under the header */}
                <div aria-live="polite" className="absolute left-6 top-2 h-6 max-[440px]:left-4">
                    {STAGES.map((s, i) => s.number ? <p key={i} className="absolute left-0 top-0 flex items-baseline gap-2 whitespace-nowrap text-[14px] font-medium" style={shown(i === stage)}>
                        <span className="font-mono text-[12px] text-play-gold">{s.number}</span>{s.label}
                    </p> : null)}
                </div>

                {/* the emblem, then the stage's words under it */}
                <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 pb-[88px] text-center max-[440px]:px-4">
                    <StoryEmblem stages={stages} stage={stage}/>
                    <div className="relative h-[156px] w-full max-w-[24rem]">
                        <div className="absolute inset-x-0 top-0 grid justify-items-center gap-10" style={shown(stage === 0)}>
                            <h1 className="home-hero-text home-tagline !mt-0">Explore the Bible <em>with a daily passage-guessing game</em></h1>
                            <div className="home-hero-actions">
                                <button type="button" onClick={play} className="ui-button ui-primary h-12 w-full max-w-[18rem] text-[15px]">
                                    <PlayIcon className="size-[18px]" strokeWidth={2}/>Play today&apos;s chapter
                                </button>
                            </div>
                        </div>
                        {STAGES.map((s, i) => s.title ? <div key={i} className="absolute inset-x-0 top-0 grid gap-2" style={shown(i === stage)}>
                            <h2 className="text-balance text-[24px] font-light leading-[1.2] text-ui-text">{s.title}</h2>
                            <p className="text-balance text-[16px] leading-[1.4] text-ui-faint">{s.text}</p>
                        </div> : null)}
                    </div>
                </div>

                {/* the end: the emblem has gone, and where to find us takes its place */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 pb-[88px]" style={shown(current.shape === "none")}>
                    <p className="text-balance text-center text-[24px] font-light leading-[1.2]">Come and say hello</p>
                    <ul className="grid w-full max-w-[20rem] grid-cols-2 gap-2.5">
                        {LINKS.map(({ label, icon: Icon }) => <li key={label}>
                            <button type="button" onClick={() => toast(`Opens ${label}`)} className="ui-button h-12 w-full !text-[15px] [&_svg]:size-[18px]">
                                <Icon strokeWidth={1.75}/>{label}
                            </button>
                        </li>)}
                    </ul>
                    <p className="text-[13px] text-ui-faint">Bible Game {new Date().getFullYear()}</p>
                </div>

                {/* the nudge to scroll, only on the hero */}
                <div className="absolute inset-x-0 bottom-0 flex justify-center transition-opacity duration-300" style={{ opacity: stage === 0 ? 1 : 0, pointerEvents: stage === 0 ? "auto" : "none" }}>
                    <a href="#" onClick={e => { e.preventDefault(); window.scrollTo({ top: window.innerHeight * STEP / 100, behavior: "smooth" }); }} className="home-hero-cue">
                        Scroll down
                        <ChevronDownIcon className="size-5" aria-hidden="true"/>
                    </a>
                </div>
            </main>
        </div>
        <Toaster/>
    </div>;
}
