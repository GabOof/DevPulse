import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [react()],

    /**
     * GitHub Pages:
     *
     * https://gaboof.github.io/DevPulse/
     */
    base: "/DevPulse/",
});
