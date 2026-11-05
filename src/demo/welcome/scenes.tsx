import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpenIcon, CalendarIcon, CheckIcon, ChevronDownIcon, FlameIcon, MenuIcon, StarIcon } from "lucide-react";
import { Guesses } from "@/app/play/[game]/guess";
import { playTheme } from "@/core/style/play-theme";
import { glow, solid } from "@/core/style/regions";
import { StarCount } from "@/demo/header";
import { CHAPTER, PRACTICE, QUESTION } from "@/demo/practice";
import ChapterField from "@/demo/welcome/chapter-field";
import { ROUND, SEEN } from "@/demo/welcome/chapters";

/** Steps through a scene's beats on its own clock from the moment it shows, so a fast scroll never leaves one half-played */
function useBeats(times: number[]) {
    const [beat, setBeat] = useState(0);
    useEffect(() => {
        const timers = times.map((t, i) => window.setTimeout(() => setBeat(i + 1), t));
        return () => timers.forEach(clearTimeout);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return beat;
}

const rise = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: [0.2, 0.7, 0.2, 1] } } as const;

/** The clue, as Play sets it: Reading/Clue, the mono face, centred */
function Clue({ small }: { small?: boolean }) {
    return <p className={`text-balance text-center font-mono ${small ? "text-[14px] leading-[20px] text-ui-muted" : "text-[19px] leading-[28px] text-ui-text"}`}>
        {PRACTICE.summary}
    </p>;
}

/** 01 The clue types itself out, over the five empty guesses */
function ClueScene() {
    const chars = [...PRACTICE.summary];
    return <div className="grid w-full gap-8">
        <p aria-label={PRACTICE.summary} className="min-h-[56px] text-balance text-center font-mono text-[19px] leading-[28px] text-ui-text">
            {chars.map((ch, i) => <motion.span key={i} aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.035, duration: 0.05 }}>{ch}</motion.span>)}
        </p>
        <div className="-mx-4"><Guesses guesses={[]}/></div>
    </div>;
}

/** 02 Psalms, zoomed in on the map: 150 chapters, a finger taps 121, and the guess button names it */
function MapScene() {
    const beat = useBeats([700, 1000, 1500]);
    const tapped = beat >= 2, target = 120;
    return <div className="grid w-full gap-4">
        <Clue small/>
        <div className="rounded-lg border p-2.5" style={{ borderColor: `${playTheme.rose}55` }}>
            <p className="mb-2 font-mono text-[12px] font-medium leading-[14px]" style={{ color: playTheme.rose }}>19.PSALMS</p>
            <div className="relative grid grid-cols-[repeat(15,minmax(0,1fr))] gap-[3px]">
                {[...Array(150)].map((_, i) => {
                    const on = tapped && i === target;
                    return <span key={i} className="flex aspect-square items-center justify-center rounded-[3px] font-mono text-[7px] leading-none tabular-nums transition-colors duration-300"
                                 style={{ background: on ? playTheme.rose : `${playTheme.rose}14`, color: on ? playTheme.bg : `${playTheme.rose}b0`, boxShadow: on ? glow(playTheme.rose, 10) : undefined }}>
                        {i + 1}
                    </span>;
                })}
                {/* the finger: down on the chapter, presses, lifts */}
                <motion.span aria-hidden="true" className="pointer-events-none absolute size-6 rounded-full border-[1.5px] border-white/90 bg-white/20"
                             style={{ left: `calc(${(target % 15 + 0.5) / 15 * 100}% - 12px)`, top: `calc(${(Math.floor(target / 15) + 0.5) / 10 * 100}% - 12px)` }}
                             initial={{ opacity: 0, scale: 1.6 }}
                             animate={beat === 0 ? { opacity: 0, scale: 1.6 } : beat === 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.1 }}
                             transition={{ duration: 0.25 }}/>
            </div>
        </div>
        <motion.div className="flex justify-center" initial={false} animate={{ opacity: beat >= 3 ? 1 : 0, y: beat >= 3 ? 0 : 6 }}>
            <span className="ui-button h-11 !min-h-0 !border-transparent px-5 !text-[15px]" style={{ background: solid.rose, color: playTheme.bg, boxShadow: glow(playTheme.rose) }}>
                Guess Psalms 121
            </span>
        </motion.div>
    </div>;
}

/** 03 The readings: too far on, close, then found; the stars it's worth come up beneath */
function GuessScene() {
    const beat = useBeats([400, 1300, 2200, 2700]);
    const made = Math.min(ROUND.length, beat);
    return <div className="grid w-full gap-7">
        <Clue/>
        <div className="-mx-4"><Guesses guesses={ROUND.slice(0, made)}/></div>
        <div className="grid justify-items-center gap-2">
            <div className="flex gap-2" aria-label="3 of 5 stars">
                {[...Array(5)].map((_, i) => <motion.span key={i} initial={false} animate={{ scale: beat >= 4 && i < 3 ? [1, 1.25, 1] : 1 }} transition={{ delay: i * 0.08, duration: 0.35 }}>
                    <StarIcon className="size-7 transition-colors duration-300" strokeWidth={1.5}
                              style={{ color: beat >= 4 && i < 3 ? playTheme.gold : playTheme.faint, fill: beat >= 4 && i < 3 ? playTheme.gold : "transparent" }}/>
                </motion.span>)}
            </div>
            <p className="h-5 text-[14px] text-ui-muted" style={{ opacity: beat >= 4 ? 1 : 0, transition: "opacity 300ms" }}>Found in three</p>
        </div>
    </div>;
}

/** 04 The chapter opens in the reader, in its region's colour */
function ReadScene() {
    const verses = CHAPTER.slice(0, 2);
    const first = verses[0].join(" ");
    return <div className="reader w-full" style={{ "--division": playTheme.rose, "--division-solid": solid.rose, "--division-glow": glow(playTheme.rose), "--reader-size": "16px", "--reader-leading": "1.6" } as React.CSSProperties}>
        <p className="mb-4 flex items-center justify-between text-[13px] text-ui-faint"><span>World English Bible</span><span>1 min</span></p>
        <motion.div {...rise} className="reading-prose">
            <span className="drop-cap">{first[0]}</span>{first.slice(1)}{" "}
            <sup>2</sup>{verses[1].join(" ")}
        </motion.div>
        <motion.div {...rise} transition={{ ...rise.transition, delay: 0.5 }} className="mt-6 flex justify-center">
            <span className="ui-button reader-primary h-11 !min-h-0 px-5"><CheckIcon className="size-[18px]" strokeWidth={2}/>Mark as read</span>
        </motion.div>
    </div>;
}

/** 05 One question on what it means: chosen, then marked right */
function StudyScene() {
    const beat = useBeats([900, 1600]);
    const answer = QUESTION.options.indexOf(QUESTION.correct);
    return <div className="study grid w-full gap-3">
        <div className="mb-1 h-1 overflow-hidden rounded-full bg-ui-raised"><div className="h-full w-full rounded-full" style={{ background: playTheme.rose }}/></div>
        <p className="mb-1 text-[16px] font-semibold leading-[22px]">{QUESTION.content}</p>
        {QUESTION.options.map((option, i) => {
            const result = beat >= 2 && i === answer ? "right" : undefined;
            return <div key={option} role="radio" aria-checked={beat >= 1 && i === answer} data-result={result} className="study-option !min-h-[52px] !text-[14px]">
                <span className="badge">{"ABC"[i]}</span>
                <span className="flex-1">{option}</span>
                {result ? <CheckIcon className="size-5 shrink-0" strokeWidth={2}/> : null}
            </div>;
        })}
        <p className="h-5 text-center text-[14px]" style={{ color: playTheme.gold, opacity: beat >= 2 ? 1 : 0, transition: "opacity 300ms" }}>+1 star</p>
    </div>;
}

/** A key figure, as Statistics sets it: icon and label, then the number */
function Figure({ icon, label, value, colour }: { icon: React.ReactNode; label: string; value: string; colour: string }) {
    return <div>
        <p className="flex items-center gap-1.5 text-[14px] text-ui-muted"><span style={{ color: colour }}>{icon}</span>{label}</p>
        <p className="mt-1 text-[30px] font-semibold leading-[36px] tabular-nums">{value}</p>
    </div>;
}

/** 06 Nine days on: stars, a streak, and the chapters seen lit on the whole Bible */
function StatsScene() {
    return <div className="grid w-full gap-5">
        <motion.div {...rise} className="grid grid-cols-3 gap-3">
            <Figure icon={<StarIcon className="size-4" fill="currentColor"/>} label="Stars" value="42" colour={playTheme.gold}/>
            <Figure icon={<FlameIcon className="size-4"/>} label="Streak" value="9" colour={playTheme.orange}/>
            <Figure icon={<BookOpenIcon className="size-4"/>} label="Seen" value="4%" colour={playTheme.text}/>
        </motion.div>
        <motion.div {...rise} transition={{ ...rise.transition, delay: 0.2 }}>
            <ChapterField columns={41} seen={SEEN}/>
        </motion.div>
    </div>;
}

export const SCENES = [ClueScene, MapScene, GuessScene, ReadScene, StudyScene, StatsScene];

/** What the stage's header shows at each step, as the app's own header would: the day's date, the chapter, the page */
const TITLES: React.ReactNode[] = [
    ...[0, 1, 2].map(() => <span className="flex h-9 items-center gap-2 rounded-lg border border-ui-line bg-ui-surface px-3 text-[13px] font-medium"><CalendarIcon className="size-4 text-ui-muted"/>Tue 15 Apr 2025<ChevronDownIcon className="size-4 text-ui-muted"/></span>),
    <span className="flex items-center gap-1 text-[16px] font-semibold">Psalm 127<ChevronDownIcon className="size-4 text-ui-muted"/></span>,
    <span className="text-[16px] font-semibold">Psalm 127 · Study</span>,
    <span className="text-[16px] font-semibold">Statistics</span>,
];
const STARS = [0, 0, 3, 3, 4, 42];

/**
 * The stage: the app as it looks on a phone, a pane of the same glass, held still while the scroll walks through its
 * steps. Each step's scene plays out on its own once shown
 */
export function Stage({ step }: { step: number }) {
    const Scene = SCENES[step];
    // the stars land when the round is won, not when the scene opens
    const [stars, setStars] = useState(STARS[step]);
    useEffect(() => {
        const timer = window.setTimeout(() => setStars(STARS[step]), step === 2 ? 2700 : step === 4 ? 1600 : 0);
        return () => clearTimeout(timer);
    }, [step]);

    return <div className="wl-stage" aria-hidden="true">
        <div className="relative z-10 grid h-14 shrink-0 grid-cols-[44px_1fr_auto] items-center px-2">
            <span className="flex size-11 items-center justify-center text-ui-text"><MenuIcon className="size-6"/></span>
            <div className="flex justify-center">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={step < 3 ? "date" : step} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.2 }}>
                        {TITLES[step]}
                    </motion.div>
                </AnimatePresence>
            </div>
            <div className="pointer-events-none"><StarCount stars={stars}/></div>
        </div>
        <div className="relative flex flex-1 items-center px-6 pb-6">
            <AnimatePresence mode="wait" initial={false}>
                <motion.div key={step} className="flex w-full justify-center"
                            initial={{ opacity: 0, y: 14, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }} transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}>
                    <Scene/>
                </motion.div>
            </AnimatePresence>
        </div>
    </div>;
}
