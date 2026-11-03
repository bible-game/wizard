import React from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "framer-motion";
import "./globals.sass";
import "./play.sass";
import { uiTheme } from "@/core/style/ui-theme";
import Ground from "@/core/component/ground";
import Landing from "@/demo/landing";

// as the webapp's root layout: the theme as --ui-* variables, and the Plex faces as the font variables its styles use
const root = document.documentElement;
Object.entries(uiTheme).forEach(([key, value]) => root.style.setProperty(`--ui-${key}`, value));
root.style.setProperty("--font-sans", "\"IBM Plex Sans\"");
root.style.setProperty("--font-mono", "\"IBM Plex Mono\"");
root.style.setProperty("--font-condensed", "\"IBM Plex Sans Condensed\"");

createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <MotionConfig reducedMotion="user">
            <Ground/>
            <Landing/>
        </MotionConfig>
    </React.StrictMode>
);
