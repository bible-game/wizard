import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url));

// "@/" resolves to src, as in the webapp, so the copied components keep their imports. The Play page is the webapp's
// own (scripts/sync-play.py copies it); what it needs from Next, SWR and HeroUI resolves to the wizard's stand-ins in
// src/web-shims, and its env to nothing (there are no services). Assets are linked relatively (base "./"), so the build
// works wherever it's served: GitHub Pages' /wizard/, or the root
export default defineConfig({
    base: "./",
    plugins: [react()],
    define: {
        "process.env.SVC_PASSAGE": JSON.stringify(""),
        "process.env.SVC_USER": JSON.stringify(""),
        "process.env.APP_VERSION": JSON.stringify("wizard"),
    },
    resolve: {
        alias: [
            { find: /^next\/link$/, replacement: src("web-shims/next-link.tsx") },
            { find: /^next\/navigation$/, replacement: src("web-shims/next-navigation.ts") },
            { find: /^swr$/, replacement: src("web-shims/swr.ts") },
            { find: /^@heroui\/(react|button)$/, replacement: src("web-shims/heroui.tsx") },
            { find: "@", replacement: src("") },
        ],
    },
});
