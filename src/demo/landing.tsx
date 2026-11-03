import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import GlowingCross from "@/app/home/glowing-cross";
import Confetti from "@/core/component/confetti";
import { squareOf } from "@/app/play/[game]/closeness";
import Header, { StarCount } from "@/demo/header";
import { PRACTICE } from "@/demo/practice";
import SignUp from "@/demo/sign-up";
import Tour, { middles } from "@/demo/tour";
import PlayStep, { exampleRound, PLAY_LENGTH, PLAY_SNAPS, STARS } from "@/demo/play-step";
import ReadStep, { READ_LENGTH } from "@/demo/read-step";
import StudyStep, { STUDY_LENGTH } from "@/demo/study-step";
import { flyStar } from "@/demo/fly";
import Rail from "@/demo/rail";
import { toast, Toaster } from "@/demo/toast";
import bible from "@/demo/bible.json";

const button = "ui-button h-12 !text-[16px] [&_svg]:size-5";
const TOTAL_VERSES = 31_102;

/** The share text, as Play copies it */
function shareText(guesses: any[], stars: number) {
    const won = guesses.some(g => g.distance == 0);
    const misses = guesses.filter(g => g.distance != 0).map(squareOf);
    const slots = [...misses, ...Array(5 - guesses.length + (won ? 1 : 0)).fill("🎉")];
    const percentage = (100 * PRACTICE.verses / TOTAL_VERSES).toFixed(2).padStart(5, " ");
    const [y, m, d] = PRACTICE.date.split("-").map(Number);
    const date = `${String(d).padStart(2, "0")}-${new Date(y, m - 1, d).toLocaleString("en", { month: "short" }).toUpperCase()}-${y}`;
    return `bible.game\n${date}\n${slots.join(" ")}\n📖 ${percentage}% ⭐ ${stars}`;
}

/**
 * Home, with How it works shown by scrolling: the webapp's hero, then the practice round played by the scroll (one
 * star, earned on the last guess), then the rest of the daily flow, where the visitor reads and studies for themselves
 * (a right answer earns another star). Each of those has to be finished (shared, marked read, studied) before the
 * page goes on. The stars fly into the key figure at the end of the tutorial's rail, and the page ends with the
 * visitor's numbers heading the sign-up form
 */
export default function Landing() {
    const [visit, setVisit] = useState(0);
    const [guessStar, setGuessStar] = useState(false);
    const [studyStars, setStudyStars] = useState(0);
    const [read, setRead] = useState(false);
    const [shared, setShared] = useState(false);
    const [studied, setStudied] = useState(false);
    const [copied, setCopied] = useState(false);
    const figure = useRef<HTMLDivElement>(null);
    const guesses = useMemo(() => exampleRound(bible), []);

    const stars = (guessStar ? STARS : 0) + studyStars;

    /** A star flies into the key figure, and counts once it lands */
    const earn = useCallback((from: Element | null, land: () => void) => {
        flyStar(from, figure.current, land);
    }, []);
    const onGuessStar = useCallback((from: Element | null) => earn(from, () => setGuessStar(true)), [earn]);

    const onStudyStar = (from: Element) => earn(from, () => setStudyStars(n => n + 1));

    function reset() {
        setVisit(v => v + 1); setGuessStar(false); setStudyStars(0); setRead(false); setShared(false); setStudied(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function copy(text: string) {
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* the text stays selectable */ }
    }

    const share = guessStar ? shareText(guesses, stars) : null;
    // the first step not yet finished holds the page there: sharing the round, marking the chapter read, the study
    const gate = !shared ? 0 : !read ? 1 : !studied ? 2 : null;

    return <div className="min-h-dvh">
        <Header stars={stars}/>
        <main>
            {/* the webapp's hero (landing.tsx), unchanged */}
            <section className="home-hero">
                <GlowingCross/>
                <h1 className="home-hero-text home-tagline">
                    Explore the Bible <em>with a daily passage-guessing game</em>
                </h1>
                <div className="home-hero-actions">
                    <button type="button" onClick={() => toast("Opens today’s game on Play")} className="ui-button ui-primary h-12 w-full max-w-[18rem] text-[15px]">
                        <PlayIcon className="size-[18px]" strokeWidth={2}/>Play today&apos;s chapter
                    </button>
                </div>
                <a href="#how-it-works" className="home-hero-cue">
                    How it works
                    <ChevronDownIcon className="size-5" aria-hidden="true"/>
                </a>
            </section>

            <div className="app-page home-more">
                <section key={visit} aria-label="How it works" className="mx-auto w-full max-w-[28rem]">
                    {/* the key figure, at the end of the rail: the stars fly into it */}
                    <Rail figure={<div ref={figure} className="[&_a]:h-10 [&_a]:px-1.5"><StarCount stars={stars}/></div>}/>

                    {/* the steps, as one pinned screen that each takes over in turn */}
                    <Tour gate={gate} steps={[
                        { id: "how-it-works", length: PLAY_LENGTH, snaps: PLAY_SNAPS, render: (progress, active, nudge) =>
                            <PlayStep progress={progress} active={active} nudge={nudge} bible={bible} onEarn={onGuessStar} copied={copied}
                                      onShare={() => { if (share) copy(share); setShared(true); }}/> },
                        { id: "read", length: READ_LENGTH, snaps: [0.03, 0.94], render: (progress, active, nudge) =>
                            <ReadStep progress={progress} active={active} nudge={nudge} read={read} onRead={() => setRead(true)}/> },
                        { id: "study", length: STUDY_LENGTH, snaps: middles(1), render: (progress, active, nudge) =>
                            <StudyStep progress={progress} active={active} nudge={nudge} onStar={onStudyStar} onDone={() => setStudied(true)}/> },
                    ]}/>

                    {/* once every step is done: the visitor's numbers (04 Stats), heading the one thing to do next */}
                    {gate === null ? <SignUp stars={stars} streak={guessStar ? 1 : 0} seen={guessStar || read ? "<1%" : "0%"}/> : null}
                </section>

                {gate === null ? <footer className="mt-16 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-ui-line pt-6 text-[13px] text-ui-muted">
                    <span>About</span><span>Privacy</span><span>Cookies</span>
                    <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-ui-text hover:underline"><RotateCcwIcon className="size-3.5"/>Reset demo</button>
                    <span className="ml-auto">Bible Game {new Date().getFullYear()}</span>
                </footer> : null}
            </div>
        </main>
        <Confetti fire={guessStar}/>
        <Toaster/>
    </div>;
}
