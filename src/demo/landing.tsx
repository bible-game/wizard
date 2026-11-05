import React, { useState } from "react";
import { ChevronDownIcon, PlayIcon } from "lucide-react";
import GlowingCross from "@/app/home/glowing-cross";
import Header from "@/demo/header";
import Tour, { middles, type StepTip } from "@/demo/tour";
import PlayStep, { PLAY_LENGTH, PLAY_SNAPS } from "@/demo/play-step";
import ReadStep, { READ_LENGTH } from "@/demo/read-step";
import StudyStep, { STUDY_LENGTH } from "@/demo/study-step";
import Rail from "@/demo/rail";
import { toast, Toaster } from "@/demo/toast";
import { PLAY_ROUTE } from "@/demo/first-run";
import bible from "@/demo/bible.json";

const READ_TIP: StepTip = { id: "explain-read", target: "mark", above: true, title: "02 · Read it", text: "The chapter you found opens in the reader. Most take about five minutes; today’s takes one." };
const STUDY_TIP: StepTip = { id: "explain-study", target: "answers", title: "03 · Think it through", text: "One question on what it means, with the verses that explain it. A right answer earns one more star." };

const play = () => { window.location.hash = PLAY_ROUTE; };

/**
 * Home, with How it works as an explanation, not a task: the webapp's hero, then the daily flow played out by the
 * scroll (the round watched from clue to answer, the reader, the study question), each with a line on what it is and
 * why it matters. Nothing has to be finished to go on; the page ends on the one thing to do, today's game, where the
 * first-run onboarding takes over (first-run.tsx)
 */
export default function Landing() {
    // the study can still be tried, for the curious; nothing waits on it
    const [read, setRead] = useState(false);

    return <div className="min-h-dvh">
        <Header stars={0}/>
        <main>
            {/* the webapp's hero (landing.tsx), unchanged but for where Play goes */}
            <section className="home-hero">
                <GlowingCross/>
                <h1 className="home-hero-text home-tagline">
                    Explore the Bible <em>with a daily passage-guessing game</em>
                </h1>
                <div className="home-hero-actions">
                    <button type="button" onClick={play} className="ui-button ui-primary h-12 w-full max-w-[18rem] text-[15px]">
                        <PlayIcon className="size-[18px]" strokeWidth={2}/>Play today&apos;s chapter
                    </button>
                </div>
                <a href="#how-it-works" className="home-hero-cue">
                    How it works
                    <ChevronDownIcon className="size-5" aria-hidden="true"/>
                </a>
            </section>

            <div className="app-page home-more">
                <section aria-label="How it works" className="mx-auto w-full max-w-[28rem] md:max-w-[36rem]">
                    <Rail figure={<span/>}/>
                    <Tour steps={[
                        { id: "how-it-works", length: PLAY_LENGTH, snaps: PLAY_SNAPS, render: (progress, active) =>
                            <PlayStep mode="watch" progress={progress} active={active} bible={bible}/> },
                        { id: "read", length: READ_LENGTH, snaps: [0.5], render: (progress, active) =>
                            <ReadStep progress={progress} active={active} read={read} onRead={() => setRead(true)} explain={READ_TIP}/> },
                        { id: "study", length: STUDY_LENGTH, snaps: middles(1), render: (progress, active) =>
                            <StudyStep progress={progress} active={active} explain={STUDY_TIP}/> },
                    ]}/>

                    {/* the one thing to do next: today's game, where a first visit is walked through it */}
                    <div className="mt-10 grid gap-4 text-center">
                        <p className="text-balance text-[24px] font-semibold leading-[30px]">A chapter a day, in about ten minutes</p>
                        <p className="text-balance text-[15px] leading-[22px] text-ui-muted">Find it, read it, think it through. Come back tomorrow to grow your streak and light up more of the Bible.</p>
                        <button type="button" onClick={play} className="ui-button ui-primary mx-auto h-12 w-full max-w-[18rem] !text-[16px] [&_svg]:size-5">
                            <PlayIcon/>Play today&apos;s chapter
                        </button>
                        <button type="button" onClick={() => toast("Opens Log in")} className="mx-auto text-[14px] text-ui-muted underline-offset-4 hover:text-ui-text hover:underline">
                            Already playing? Log in
                        </button>
                    </div>
                </section>

                <footer className="mt-16 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-ui-line pt-6 text-[13px] text-ui-muted">
                    <span>About</span><span>Privacy</span><span>Cookies</span>
                    <span className="ml-auto">Bible Game {new Date().getFullYear()}</span>
                </footer>
            </div>
        </main>
        <Toaster/>
    </div>;
}
