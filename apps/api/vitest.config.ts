import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        /*
         * Executa somente os testes
         * TypeScript que estão dentro
         * de src/.
         *
         * Isso evita executar novamente
         * os .test.js gerados em dist/.
         */
        include: ["src/**/*.test.ts"],

        environment: "node",

        coverage: {
            provider: "v8",

            /*
             * Código que queremos
             * considerar na cobertura.
             */
            include: ["src/**/*.ts"],

            /*
             * Arquivos que não fazem
             * sentido entrar no cálculo.
             */
            exclude: ["src/**/*.test.ts", "src/generated/**", "src/server.ts"],
        },
    },
});
