import type { Config } from "tailwindcss";
import { playTheme } from "./src/core/style/play-theme";
import { uiTheme } from "./src/core/style/ui-theme";

// The webapp's theme (tailwind.config.ts there), without HeroUI
const config: Config = {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    darkMode: "class",
    theme: {
        extend: {
            colors: { play: playTheme, ui: uiTheme },
            fontFamily: {
                sans: ["var(--font-sans)", "system-ui", "sans-serif"],
                mono: ["var(--font-mono)", "ui-monospace", "monospace"],
                condensed: ["var(--font-condensed)", "system-ui", "sans-serif"],
            },
            borderRadius: { DEFAULT: "8px", sm: "8px", md: "8px", lg: "8px", xl: "8px", "2xl": "8px", "3xl": "16px" },
            maxWidth: { page: "var(--page-width)" },
        },
    },
};
export default config;
