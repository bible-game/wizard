import React, { useCallback, useEffect, useRef, useState } from "react";
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
 * Today's game; on a first visit, the tutorial makes it a part at a time, then hands it over for the visitor to play,
 * with a word on zooming and on the first reading. The wrapper holds the page back (data-reveal, tutorial.sass) from
 * its first paint, so it's never seen whole and then hidden. The tutorial's watched guesses aren't the visitor's: the
 * round is set back to empty (and the page made afresh) before they play, and on Restart.
 *
 * How to play can ask for the tutorial again (TUTORIAL_EVENT). Then the visitor's own round, if they've started one, is
 * set aside while it plays on an empty board, and put back as it was when it ends, so watching it never costs a guess
 */
export default function Onboarding() {
    const [replay] = useState(() => { const again = asked(); if (again) forgetRound(); return again; });
    const [touring, setTouring] = useState(() => replay || !tutorialSeen());
    const [tips] = useState(() => replay || !roundTipsSeen());
    const [stage, setStage] = useState(0);
    const [round, setRound] = useState(0);
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

    return <div data-reveal={touring ? stage : undefined}>
        <PlayPage key={`page-${round}`}/>
        {touring ? <Tutorial key={`tutorial-${run}`} onStage={setStage} onReset={reset} onDone={done}/> : tips ? <RoundTips/> : null}
    </div>;
}
