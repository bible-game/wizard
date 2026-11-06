import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LandingOverlay from "@/demo/landing-overlay";
import { PLAY_ROUTE } from "@/demo/first-run";
import PlayPage from "@/demo/play-page";
import Tutorial, { tutorialSeen } from "@/demo/tutorial";
import RoundTips, { roundTipsSeen } from "@/demo/round-tips";
import { TUTORIAL_EVENT } from "@/app/play/[game]/help";
import { GameState } from "@/core/model/state/game-state";
import { StateUtil } from "@/core/util/state-util";
import { StorageUtil } from "@/core/util/storage-util";
import { PRACTICE } from "@/demo/practice";

/** ?tutorial in the address shows it (and the round's notes) again, for trying it out once it's been seen */
const asked = () => new URLSearchParams(window.location.search).has("tutorial");

/** Clears the practice round from this device, as Play saves it, so the round starts on an empty board */
function forgetRound() {
    const games = StateUtil.getAllGames();
    if (games.delete(PRACTICE.id)) StorageUtil.save("games", Array.from(games.entries()));
}

/** The visitor's own round as saved, if they've started one */
const savedRound = (): GameState | null => StateUtil.getAllGames().get(PRACTICE.id) ?? null;

/**
 * The landing shows the map clean, without the visitor's guesses on it, so their round is kept here while it shows and
 * put back for Play (and, should the visit end on the landing, at the start of the next)
 */
const ASIDE = "wizard.landing-round";
function setRoundAside(): boolean {
    const own = savedRound();
    if (!own) return false;
    localStorage.setItem(ASIDE, JSON.stringify(own));
    forgetRound();
    return true;
}
function bringRoundBack(): boolean {
    const kept = localStorage.getItem(ASIDE);
    if (kept === null) return false;
    localStorage.removeItem(ASIDE);
    StateUtil.setGame(JSON.parse(kept));
    return true;
}

/**
 * Today's game; on a first visit, the tutorial makes it a part at a time, then hands it over for the visitor to play,
 * with a word on zooming and on the first reading. The wrapper holds the page back (data-reveal, tutorial.sass) from
 * its first paint, so it's never seen whole and then hidden. The tutorial's watched guesses aren't the visitor's: the
 * round is set back to empty (and the page made afresh) before they play, and on Restart.
 *
 * On the home page (`landing`), the landing lies over it (landing-overlay.tsx) with only the map showing behind, in
 * shadow (data-landing, tutorial.sass); Play today's chapter dissolves it, and the page carries straight on into the
 * tutorial or the round, as it would at today's game's own address.
 *
 * How to play can ask for the tutorial again (TUTORIAL_EVENT). Then the visitor's own round, if they've started one, is
 * set aside while it plays on an empty board, and put back as it was when it ends, so watching it never costs a guess
 */
export default function Onboarding({ landing = false }: { landing?: boolean }) {
    const [replay] = useState(() => { const again = asked(); if (again) forgetRound(); return again; });
    const [touring, setTouring] = useState(() => replay || !tutorialSeen());
    const [tips] = useState(() => replay || !roundTipsSeen());
    const [stage, setStage] = useState(0);
    const [round, setRound] = useState(0);
    // before the page first reads it: a round kept from a visit that ended on the landing comes back, and on the
    // landing the visitor's round is set aside so the map shows clean
    useState(() => { bringRoundBack(); if (landing) setRoundAside(); return null; });
    // while the landing shows the round stays aside; when it goes (Play, or another page) it comes back, and the page is
    // made afresh with it. The fresh page is held back as the landing held it (`holding`) for its first frames, so its
    // parts still ease in as the landing dissolves rather than being there at once
    const [holding, setHolding] = useState(false);
    useEffect(() => {
        if (!landing) return;
        if (setRoundAside()) setRound(r => r + 1);
        return () => { if (bringRoundBack()) { setHolding(true); setRound(r => r + 1); } };
    }, [landing]);
    // and whenever the game shows, a round still set aside comes back, however the landing went (a hot reload while it
    // showed, say), so the visitor's round is never left out
    useLayoutEffect(() => {
        if (!landing && bringRoundBack()) { setHolding(true); setRound(r => r + 1); }
    });
    useEffect(() => {
        if (!holding) return;
        let frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => setHolding(false)); });
        return () => cancelAnimationFrame(frame);
    }, [holding]);
    const [run, setRun] = useState(0);
    // the visitor's own round, set aside while a replayed tutorial plays (undefined: nothing set aside)
    const aside = useRef<GameState | null | undefined>(undefined);

    const reset = useCallback(() => { forgetRound(); setRound(r => r + 1); }, []);
    const done = useCallback((demoed: boolean) => {
        if (aside.current !== undefined) {
            forgetRound();
            if (aside.current) StateUtil.setGame(aside.current);
            aside.current = undefined;
            setRound(r => r + 1);
        } else if (demoed) reset();
        setStage(0);
        setTouring(false);
    }, [reset]);

    // How to play's Tutorial: set the visitor's round aside, then play the tutorial afresh on an empty board
    useEffect(() => {
        const again = () => {
            if (aside.current === undefined) aside.current = savedRound();
            forgetRound();
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

    // a tutorial that follows straight on from the landing keeps the map it showed (tutorial.sass)
    const cameFromLanding = useRef(landing);
    if (landing) cameFromLanding.current = true;

    return <div data-landing={landing || holding ? "" : undefined} data-holding={holding ? "" : undefined} data-reveal={touring && !landing ? stage : undefined}
                data-map-kept={touring && !landing && cameFromLanding.current ? "" : undefined}>
        <PlayPage key={`page-${round}`}/>
        <AnimatePresence initial={false}>
            {/* no filter while it shows: a filter (even a nil blur) would make its fixed places scroll with it */}
            {landing ? <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                   exit={{ opacity: 0, filter: "blur(6px)" }} transition={{ duration: 0.6, ease: [0.22, 0.8, 0.24, 1] }}>
                <LandingOverlay onPlay={play}/>
            </motion.div> : null}
        </AnimatePresence>
        {landing ? null : touring ? <Tutorial key={`tutorial-${run}`} onStage={setStage} onReset={reset} onDone={done}/> : tips ? <RoundTips/> : null}
    </div>;
}
