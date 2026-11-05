import React, { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue } from "framer-motion";
import { ArrowRightIcon, BellIcon, BookOpenIcon, CheckIcon, LightbulbIcon, MapIcon, RotateCcwIcon, XIcon } from "lucide-react";
import Confetti from "@/core/component/confetti";
import { squareOf } from "@/app/play/[game]/closeness";
import { StarCount } from "@/demo/header";
import { PRACTICE } from "@/demo/practice";
import PlayStep from "@/demo/play-step";
import ReadStep from "@/demo/read-step";
import StudyStep from "@/demo/study-step";
import SignUp from "@/demo/sign-up";
import { flyStar } from "@/demo/fly";
import { toast, Toaster } from "@/demo/toast";
import type { StepTip } from "@/demo/tour";
import bible from "@/demo/bible.json";

/** Where the landing page's Play goes: today's game, which a first visit is walked into */
export const PLAY_ROUTE = "#/play";

const TOTAL_VERSES = 31_102;
/** Set once the intro has been seen (finished or skipped), so a returning visitor goes straight to the game */
const SEEN = "wizard.onboarded";
const seen = () => { try { return localStorage.getItem(SEEN) === "1"; } catch { return false; } };
const remember = (on: boolean) => { try { if (on) localStorage.setItem(SEEN, "1"); else localStorage.removeItem(SEEN); } catch { /* the intro just shows again */ } };

/** The share text, as Play copies it: the round's stars are counted from its guesses, as they may not have landed yet */
function shareText(guesses: any[]) {
    const won = guesses.some(g => g.distance == 0);
    const stars = won ? 5 + 1 - guesses.length : 0;
    const misses = guesses.filter(g => g.distance != 0).map(squareOf);
    const slots = [...misses, ...Array(5 - guesses.length + (won ? 1 : 0)).fill("🎉")];
    const percentage = (100 * PRACTICE.verses / TOTAL_VERSES).toFixed(2).padStart(5, " ");
    const [y, m, d] = PRACTICE.date.split("-").map(Number);
    const date = `${String(d).padStart(2, "0")}-${new Date(y, m - 1, d).toLocaleString("en", { month: "short" }).toUpperCase()}-${y}`;
    return `bible.game\n${date}\n${slots.join(" ")}\n📖 ${percentage}% ⭐ ${stars}`;
}

const READ_TIP: StepTip = { id: "live-read", target: "mark", above: true, title: "Now read it", text: "Take a minute with the chapter you found, then mark it read." };
const STUDY_TIP: StepTip = { id: "live-study", target: "answers", title: "Last one", text: "Choose the answer you think fits best. A right one earns a star." };

type Stage = "intro" | "play" | "read" | "study" | "done";
const STEPS: { stage: Stage; label: string }[] = [{ stage: "play", label: "Play" }, { stage: "read", label: "Read" }, { stage: "study", label: "Study" }];

/** The guide's speech bubble, as one card of the intro: one idea, then the one thing to do */
function Card({ children }: { children: React.ReactNode }) {
    return <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                       transition={{ duration: 0.35, ease: [0.22, 0.8, 0.24, 1] }} className="grid w-full gap-5">
        {children}
    </motion.div>;
}

/**
 * The intro, as a conversation: a few short cards, each with one idea or one choice, and Skip always there. It asks
 * for nothing up front; sign-up waits until the visitor has something to keep
 */
function Intro({ onDone }: { onDone: () => void }) {
    const [card, setCard] = useState(0);
    const nextButton = (label: string, onClick = () => setCard(c => c + 1)) =>
        <button type="button" onClick={onClick} className="ui-button ui-primary h-12 w-full !text-[16px] [&_svg]:size-5">{label}<ArrowRightIcon/></button>;
    const rows = [
        { icon: MapIcon, title: "Play", text: "Guess the chapter on a map of the Bible. Fewer guesses, more stars." },
        { icon: BookOpenIcon, title: "Read", text: "Read the chapter you found, usually in about five minutes." },
        { icon: LightbulbIcon, title: "Study", text: "Answer one question about what it means." },
    ];
    return <div className="mx-auto flex min-h-dvh w-full max-w-[28rem] flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+12px)] max-[440px]:px-4">
        <div className="flex h-11 items-center justify-between">
            <div className="flex gap-1.5" aria-label={`Card ${card + 1} of 3`}>
                {[0, 1, 2].map(i => <span key={i} className={`h-1.5 rounded-full transition-all ${i === card ? "w-5 bg-play-gold" : "w-1.5 bg-ui-line"}`}/>)}
            </div>
            <button type="button" onClick={onDone} className="h-11 px-2 text-[14px] text-ui-muted hover:text-ui-text">Skip</button>
        </div>
        <div className="flex flex-1 flex-col justify-center">
            <AnimatePresence mode="wait">
                {card === 0 ? <Card key="hello">
                    <p className="font-mono text-[12px] text-ui-help">Bible Game</p>
                    <h1 className="text-balance text-[30px] font-semibold leading-[36px]">Hi there. Each day, one chapter of the Bible is hidden.</h1>
                    <p className="text-[17px] leading-[26px] text-ui-muted">You find it, read it, and think it through. It takes about ten minutes, and by the end of the year you’ll have seen a lot of the Bible.</p>
                    {nextButton("How does it work?")}
                </Card> : card === 1 ? <Card key="how">
                    <h1 className="text-balance text-[26px] font-semibold leading-[32px]">Three steps, every day</h1>
                    <ol className="grid gap-3">
                        {rows.map(({ icon: Icon, title, text }, i) => <li key={title} className="flex gap-3.5 rounded-lg border border-ui-line bg-ui-surface p-3.5">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ui-raised"><Icon className="size-5 text-play-gold" strokeWidth={1.75}/></span>
                            <span className="grid gap-0.5">
                                <span className="text-[16px] font-semibold"><span className="mr-1.5 font-mono text-[11px] text-ui-faint">{String(i + 1).padStart(2, "0")}</span>{title}</span>
                                <span className="text-[14px] leading-5 text-ui-muted">{text}</span>
                            </span>
                        </li>)}
                    </ol>
                    {nextButton("Got it")}
                </Card> : <Card key="remind">
                    <span className="flex size-12 items-center justify-center rounded-full bg-ui-raised"><BellIcon className="size-6 text-play-gold" strokeWidth={1.75}/></span>
                    <h1 className="text-balance text-[26px] font-semibold leading-[32px]">Want a nudge when tomorrow’s chapter is ready?</h1>
                    <p className="text-[16px] leading-[24px] text-ui-muted">A new chapter appears every morning. You can change this any time in Settings.</p>
                    <div className="grid gap-2.5">
                        {nextButton("Remind me each morning", () => { toast("Asks to send notifications"); onDone(); })}
                        <button type="button" onClick={onDone} className="ui-button h-12 !text-[16px]">Not now</button>
                    </div>
                </Card>}
            </AnimatePresence>
        </div>
    </div>;
}

/**
 * Today's game on a first visit, the way DuckDuckGo onboards a new install: a short intro, then the real thing, with
 * a hint at each first (the clue, the first reading, the end of the round, the reader, the study). The stars earned
 * are the visitor's own, flown into the header; sign-up comes at the end, as the way to keep them
 */
export default function FirstRun() {
    const [visit, setVisit] = useState(0);
    const [stage, setStage] = useState<Stage>(() => seen() ? "play" : "intro");
    const [stars, setStars] = useState(0);
    const [found, setFound] = useState(false);
    const [played, setPlayed] = useState(false);
    const [read, setRead] = useState(false);
    const [copied, setCopied] = useState(false);
    const figure = useRef<HTMLDivElement>(null);
    const still = useMotionValue(0);

    const onEarn = useCallback((from: Element | null, count: number) => { setFound(true); flyStar(from, figure.current, () => setStars(s => s + count)); }, []);
    const onOver = useCallback(() => setPlayed(true), []);

    async function copy(text: string) {
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* the text stays selectable */ }
    }
    function finishIntro() { remember(true); setStage("play"); }
    function reset() {
        remember(false); setVisit(v => v + 1); setStage("intro"); setStars(0); setFound(false); setPlayed(false); setRead(false);
        window.scrollTo({ top: 0 });
    }

    const go = (to: Stage, label: string) => <button type="button" onClick={() => { setStage(to); window.scrollTo({ top: 0 }); }}
                                                     className="ui-button ui-primary h-11 w-full !text-[15px] [&_svg]:size-[18px]">{label}<ArrowRightIcon/></button>;

    if (stage === "intro") return <div key={visit}><Intro onDone={finishIntro}/><Toaster/></div>;

    const at = STEPS.findIndex(s => s.stage === stage);
    return <div key={visit} className={stage === "done" ? "min-h-dvh" : "flex h-dvh flex-col overflow-hidden"}>
        {/* the app's header, with today's steps between the close and the key figure */}
        <header className="grid h-14 shrink-0 grid-cols-[72px_minmax(0,1fr)_72px] items-center border-b border-ui-line px-2 pt-[env(safe-area-inset-top)]">
            <button type="button" aria-label="Back to the home page" onClick={() => { window.location.hash = ""; }}
                    className="flex size-11 items-center justify-center rounded-lg text-ui-muted hover:bg-ui-raised hover:text-ui-text">
                <XIcon className="size-5"/>
            </button>
            <ol aria-label="Today" className="flex justify-center gap-1">
                {STEPS.map(({ stage: s, label }, i) => {
                    const done = stage === "done" || i < at;
                    return <li key={s} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ${i === at ? "bg-ui-raised text-ui-text" : done ? "text-ui-muted" : "text-ui-faint"}`}>
                        {done ? <CheckIcon className="size-3.5 text-ui-success"/> : <span className="font-mono text-[10px]">{String(i + 1).padStart(2, "0")}</span>}{label}
                    </li>;
                })}
            </ol>
            <div ref={figure} className="flex justify-end [&_a]:h-10 [&_a]:px-1.5"><StarCount stars={stars}/></div>
        </header>

        {stage === "done" ? <div className="app-page mx-auto w-full max-w-[28rem] pb-12">
            <SignUp stars={stars} streak={found ? 1 : 0} seen={found || read ? "<1%" : "0%"}/>
            <button type="button" onClick={() => toast("Keeps today’s progress on this device")} className="mx-auto mt-4 block h-11 text-[14px] text-ui-muted underline-offset-4 hover:text-ui-text hover:underline">
                Maybe later
            </button>
            <button type="button" onClick={reset} className="mx-auto mt-6 flex items-center gap-1.5 text-[13px] text-ui-faint underline-offset-4 hover:text-ui-text hover:underline">
                <RotateCcwIcon className="size-3.5"/>Reset demo
            </button>
        </div> : <main className="relative mx-auto flex min-h-0 w-full max-w-[36rem] flex-1 flex-col">
            {stage === "play" ? <PlayStep mode="live" active bible={bible} onEarn={onEarn} onOver={onOver}
                                          copied={copied} onShare={guesses => copy(shareText(guesses))}
                                          next={played ? go("read", "Read it") : null}/>
                : stage === "read" ? <ReadStep progress={still} active read={read} onRead={() => setRead(true)} explain={READ_TIP} next={go("study", "Study")}/>
                : <StudyStep progress={still} active explain={STUDY_TIP}
                             onStar={from => flyStar(from, figure.current, () => setStars(s => s + 1))}
                             next={go("done", "Finish today")}/>}
        </main>}
        <Confetti fire={found}/>
        <Toaster/>
    </div>;
}
