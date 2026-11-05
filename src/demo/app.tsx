import React, { useEffect, useState } from "react";
import Story from "@/demo/story";
import Landing from "@/demo/landing";
import Welcome from "@/demo/welcome/welcome";
import FirstRun, { PLAY_ROUTE } from "@/demo/first-run";

/** The scroll explainer that came before the story, kept to compare */
const EXPLAINER_ROUTE = "#/explainer";
/** The emblem story that came before the welcome page, kept to compare */
const STORY_ROUTE = "#/story";
const ROUTES = [PLAY_ROUTE, EXPLAINER_ROUTE, STORY_ROUTE];

/** Which page a hash is: a route, home (no hash), or, for an in-page link (How it works, the rail's steps), the page it's on */
const routeOf = (hash: string, current = "") => ROUTES.includes(hash) ? hash : hash === "" || hash === "#" ? "" : current;

/**
 * The demo's pages, by the hash: home (the welcome page), today's game (which onboards a first visit), and the
 * earlier story and explainer
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
    return route === PLAY_ROUTE ? <FirstRun/> : route === EXPLAINER_ROUTE ? <Landing/> : route === STORY_ROUTE ? <Story/> : <Welcome/>;
}
