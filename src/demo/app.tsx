import React, { useEffect, useState } from "react";
import Story from "@/demo/story";
import Landing from "@/demo/landing";
import Welcome from "@/demo/welcome/welcome";
import FirstRun, { PLAY_ROUTE } from "@/demo/first-run";
import Onboarding from "@/demo/onboarding";

/** The landing before the overlay (a scroll story of the emblem on a page of its own), kept to compare */
const STORY_ROUTE = "#/story";
/** The first-run flow before the overlay (an intro, then a rebuilt round, Read and Study), kept to compare */
const FIRST_RUN_ROUTE = "#/first-run";
/** The scroll explainer that came before the story, kept to compare */
const EXPLAINER_ROUTE = "#/explainer";
/** The product-led welcome page, tried after the story, kept to compare */
const WELCOME_ROUTE = "#/welcome";
const ROUTES = [PLAY_ROUTE, STORY_ROUTE, FIRST_RUN_ROUTE, EXPLAINER_ROUTE, WELCOME_ROUTE];

/** Which page a hash is: a route, home (no hash), or, for an in-page link (How it works, the rail's steps), the page it's on */
const routeOf = (hash: string, current = "") => ROUTES.includes(hash) ? hash : hash === "" || hash === "#" ? "" : current;

/**
 * The demo's pages, by the hash: home and today's game are one page, the webapp's Play page (onboarding.tsx), with the
 * landing over it at home and the tutorial on a first visit; it's the same element for both, so Play today's chapter
 * dissolves the landing off the page rather than loading another. Then the earlier story, first-run flow, explainer and
 * welcome page, kept to compare
 */
export default function App() {
    const [route, setRoute] = useState(() => routeOf(window.location.hash));
    useEffect(() => {
        const onHash = () => setRoute(prev => {
            const next = routeOf(window.location.hash, prev);
            if (next !== prev) window.scrollTo({ top: 0 });
            return next;
        });
        window.addEventListener("hashchange", onHash);
        return () => window.removeEventListener("hashchange", onHash);
    }, []);
    return route === "" || route === PLAY_ROUTE ? <Onboarding landing={route === ""}/>
        : route === STORY_ROUTE ? <Story/> : route === FIRST_RUN_ROUTE ? <FirstRun/> : route === EXPLAINER_ROUTE ? <Landing/> : <Welcome/>;
}
