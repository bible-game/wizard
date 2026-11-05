import React, { useEffect, useState } from "react";
import Landing from "@/demo/landing";
import FirstRun, { PLAY_ROUTE } from "@/demo/first-run";

/** The demo's two pages, by the hash: the landing page (which explains), and today's game (which onboards a first visit) */
export default function App() {
    const [hash, setHash] = useState(() => window.location.hash);
    useEffect(() => {
        // an in-page link (How it works, the rail's steps) changes the hash too: only a change of page starts at the top
        const onHash = () => setHash(prev => {
            const next = window.location.hash;
            if ((prev === PLAY_ROUTE) !== (next === PLAY_ROUTE)) window.scrollTo({ top: 0 });
            return next;
        });
        window.addEventListener("hashchange", onHash);
        return () => window.removeEventListener("hashchange", onHash);
    }, []);
    return hash === PLAY_ROUTE ? <FirstRun/> : <Landing/>;
}
