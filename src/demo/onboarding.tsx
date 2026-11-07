import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LandingOverlay, { type LandingAccount } from "@/app/home/landing-overlay";
import { toast, Toaster } from "@/demo/toast";
import { PLAY_ROUTE } from "@/demo/first-run";
import PlayPage from "@/demo/play-page";
import Tutorial, { tutorialSeen } from "@/app/play/[game]/tutorial/tutorial";
import RoundTips, { roundTipsSeen } from "@/app/play/[game]/tutorial/round-tips";
import bible from "@/core/config/bible.json";
import { TUTORIAL_EVENT } from "@/app/play/[game]/help";
import { StateUtil } from "@/core/util/state-util";
import { PRACTICE } from "@/demo/practice";

/**
 * Whether we know this visitor's account (in the webapp, they have logged in on this device before: `known`). In the
 * wizard, ?known in the address says so, and ?known=0 forgets it; it's kept on the device between visits
 */
const KNOWN = "wizard.known";
function knownAccount(): boolean {
    const asked = new URLSearchParams(window.location.search).get("known");
    try {
        if (asked !== null) {
            if (asked === "0" || asked === "false") localStorage.removeItem(KNOWN); else localStorage.setItem(KNOWN, "1");
        }
        return localStorage.getItem(KNOWN) === "1";
    } catch { return asked !== null && asked !== "0"; }
}

/** ?tutorial in the address shows it (and the round's notes) again, for trying it out once it's been seen */
const asked = () => new URLSearchParams(window.location.search).has("tutorial");

/**
 * A round an earlier version of the landing set aside (it moved the visitor's round out of the way to show the map
 * clean, where Game's `landing` now simply doesn't draw it), put back once
 */
const ASIDE = "wizard.landing-round";
function bringRoundBack(): void {
    const kept = localStorage.getItem(ASIDE);
    if (kept === null) return;
    localStorage.removeItem(ASIDE);
    StateUtil.setGame(JSON.parse(kept));
}

/**
 * Today's game; on a first visit, the tutorial makes it a part at a time, then hands it over for the visitor to play,
 * with a word on zooming and on the first reading. The wrapper holds the page back (data-reveal, tutorial.sass) from
 * its first paint, so it's never seen whole and then hidden. The tutorial's watched guesses aren't the visitor's: while
 * it runs the page is a demo round (Game's `demo`), which starts empty and keeps nothing, and the page is made afresh as
 * the visitor's own when it ends (and the demo afresh on Restart). The webapp's host is tutorial/play-host.tsx.
 *
 * On the home page (`landing`), the landing lies over it (landing-overlay.tsx) with only the map showing behind, in
 * shadow (data-landing, landing.sass), drawn clean (Game's `landing`: the visitor's guesses aren't drawn, and nothing in
 * storage moves); Play today's chapter dissolves it, and the same page carries straight on into the tutorial or the
 * round, as it would at today's game's own address. The webapp's home host is home/home-host.tsx.
 *
 * How to play can ask for the tutorial again (TUTORIAL_EVENT): it plays on a demo round, so the visitor's own round is
 * never touched and watching it never costs a guess
 */
export default function Onboarding({ landing = false }: { landing?: boolean }) {
    const [replay] = useState(asked);
    const [touring, setTouring] = useState(() => replay || !tutorialSeen());
    const [tips] = useState(() => replay || !roundTipsSeen());
    const [stage, setStage] = useState(0);
    const [round, setRound] = useState(0);
    useState(() => { bringRoundBack(); return null; });
    const [run, setRun] = useState(0);

    // Restart: the demo round afresh; the end: the visitor's own (the page changes from the demo, so it's made afresh)
    const reset = useCallback(() => setRound(r => r + 1), []);
    const done = useCallback(() => { setStage(0); setTouring(false); }, []);

    // How to play's Tutorial: the tutorial afresh, on a demo round
    useEffect(() => {
        const again = () => {
            setStage(0);
            setRound(r => r + 1);
            setRun(r => r + 1);
            setTouring(true);
        };
        window.addEventListener(TUTORIAL_EVENT, again);
        return () => window.removeEventListener(TUTORIAL_EVENT, again);
    }, []);

    // Play today's chapter, on the landing: today's game's own address, so Back returns to the landing; the page stays
    // as it is (app.tsx keeps this one Onboarding for both), and the landing dissolves off it
    const play = useCallback(() => { window.location.hash = PLAY_ROUTE; }, []);
    // the landing's account buttons, mocked: Sign up says where it goes; Log in, as if the visitor had signed in, goes on
    // into today's game
    const [account] = useState<LandingAccount>(() => knownAccount() ? "known" : "guest");
    const signUp = useCallback(() => toast("Opens Sign up"), []);
    const logIn = useCallback(() => { toast("Logged in"); play(); }, [play]);

    // a tutorial that follows straight on from the landing keeps the map it showed (tutorial.sass)
    const cameFromLanding = useRef(landing);
    if (landing) cameFromLanding.current = true;

    return <div data-landing={landing ? "" : undefined} data-reveal={touring && !landing ? stage : undefined}
                data-map-kept={touring && !landing && cameFromLanding.current ? "" : undefined}>
        <PlayPage key={`${touring && !landing ? "demo" : "page"}-${round}`} demo={touring && !landing} landing={landing}/>
        <AnimatePresence initial={false}>
            {/* no filter while it shows: a filter (even a nil blur) would make its fixed places scroll with it */}
            {landing ? <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                   exit={{ opacity: 0, filter: "blur(6px)" }} transition={{ duration: 0.6, ease: [0.22, 0.8, 0.24, 1] }}>
                <LandingOverlay onPlay={play} onSignUp={signUp} onLogIn={logIn} account={account} summary={PRACTICE.summary}/>
            </motion.div> : null}
        </AnimatePresence>
        {landing ? null : touring ? <Tutorial key={`tutorial-${run}`} onStage={setStage} onReset={reset} onDone={done}/> : tips ? <RoundTips passage={PRACTICE} bible={bible}/> : null}
        <Toaster/>
    </div>;
}
