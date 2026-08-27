import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        /*
         * Executamos somente testes
         * TypeScript de src.
         */

        include: ["src/**/*.test.ts"],

        /*
         * Setup executado antes de cada
         * arquivo/suíte.
         */

        setupFiles: ["src/test/setup.ts"],

        environment: "node",

        coverage: {
            provider: "v8",

            include: ["src/**/*.ts"],

            exclude: ["src/**/*.test.ts", "src/test/**", "src/generated/**", "src/server.ts"],
        },
    },
});
