import React, { useCallback, useState } from "react";
import PlayPage from "@/demo/play-page";
import Tutorial, { tutorialSeen } from "@/demo/tutorial";
import RoundTips, { roundTipsSeen } from "@/demo/round-tips";
import { StateUtil } from "@/core/util/state-util";
import { StorageUtil } from "@/core/util/storage-util";
import { PRACTICE } from "@/demo/practice";

/** ?tutorial in the address shows it (and the round's tip) again, for trying it out once it's been seen */
const asked = () => new URLSearchParams(window.location.search).has("tutorial");

/** Clears the practice round from this device, as Play saves it, so the round starts on an empty board */
function forgetRound() {
    const games = StateUtil.getAllGames();
    if (games.delete(PRACTICE.id)) StorageUtil.save("games", Array.from(games.entries()));
}

/**
 * Today's game; on a first visit, the tutorial makes it a part at a time, then hands it over for the visitor to play,
 * with a word on the first reading. The wrapper holds the page back (data-reveal, tutorial.sass) from its first paint,
 * so it's never seen whole and then hidden. The tutorial's watched guess isn't the visitor's: the round is set back to
 * empty (and the page made afresh) before they play, and on Restart
 */
export default function Onboarding() {
    const [replay] = useState(() => { const again = asked(); if (again) forgetRound(); return again; });
    const [touring, setTouring] = useState(() => replay || !tutorialSeen());
    const [tips] = useState(() => replay || !roundTipsSeen());
    const [stage, setStage] = useState(0);
    const [round, setRound] = useState(0);
    const reset = useCallback(() => { forgetRound(); setRound(r => r + 1); }, []);
    const done = useCallback(() => setTouring(false), []);
    return <div data-reveal={touring ? stage : undefined}>
        <PlayPage key={round}/>
        {touring ? <Tutorial onStage={setStage} onReset={reset} onDone={done}/> : tips ? <RoundTips/> : null}
    </div>;
}
