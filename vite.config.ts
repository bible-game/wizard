import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// "@/" resolves to src, as in the webapp, so the copied components keep their imports. Assets are linked relatively
// (base "./"), so the build works wherever it's served: GitHub Pages' /wizard/, or the root
export default defineConfig({
    base: "./",
    plugins: [react()],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
