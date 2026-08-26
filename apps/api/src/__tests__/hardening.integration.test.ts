import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { FastifyInstance } from "fastify";

let buildApp: typeof import("../app.js").buildApp;

let app: FastifyInstance;

/*
 * =========================================================
 * ENVIRONMENT
 * =========================================================
 */

beforeAll(async () => {
    process.env.AUTH_ENCRYPTION_KEY ??=
        "1111111111111111111111111111111111111111111111111111111111111111";

    process.env.FRONTEND_URL ??= "http://localhost:5173";

    process.env.SESSION_COOKIE_NAME ??= "devpulse_session";

    process.env.GITHUB_CLIENT_ID ??= "test-client-id";

    process.env.GITHUB_CLIENT_SECRET ??= "test-client-secret";

    process.env.GITHUB_CALLBACK_URL ??= "http://localhost:3333/api/auth/github/callback";

    process.env.DATABASE_URL ??= "postgresql://devpulse:devpulse@localhost:5432/devpulse";

    const module = await import("../app.js");

    buildApp = module.buildApp;
});

/*
 * =========================================================
 * APP
 * =========================================================
 */

beforeEach(async () => {
    /*
     * Um limite alto para os testes
     * normais.
     */
    process.env.RATE_LIMIT_MAX = "120";

    app = await buildApp({
        logger: false,
    });
});

afterEach(async () => {
    await app.close();

    delete process.env.RATE_LIMIT_MAX;
});

/*
 * =========================================================
 * TESTS
 * =========================================================
 */

describe("API Hardening", () => {
    /*
     * =================================================
     * SECURITY HEADERS
     * =================================================
     */

    describe("security headers", () => {
        it("deve enviar X-Content-Type-Options", async () => {
            const response = await app.inject({
                method: "GET",

                url: "/health",
            });

            expect(response.statusCode).toBe(200);

            expect(response.headers["x-content-type-options"]).toBe("nosniff");
        });

        it("deve enviar X-Frame-Options", async () => {
            const response = await app.inject({
                method: "GET",

                url: "/health",
            });

            expect(response.headers["x-frame-options"]).toBeDefined();
        });
    });

    /*
     * =================================================
     * NOT FOUND
     * =================================================
     */

    describe("404 handler", () => {
        it("deve retornar erro padronizado para rota inexistente", async () => {
            const response = await app.inject({
                method: "GET",

                url: "/api/rota-inexistente",
            });

            expect(response.statusCode).toBe(404);

            expect(response.json()).toEqual({
                error: "Route not found",

                message: "A rota solicitada não existe.",

                path: "/api/rota-inexistente",
            });
        });
    });

    /*
     * =================================================
     * RATE LIMIT
     * =================================================
     */

    describe("rate limit", () => {
        it("deve bloquear requisições acima do limite", async () => {
            /*
             * Fechamos a aplicação
             * criada pelo beforeEach.
             */
            await app.close();

            /*
             * Para não precisar fazer
             * 121 requests durante o
             * teste.
             */
            process.env.RATE_LIMIT_MAX = "3";

            app = await buildApp({
                logger: false,
            });

            const first = await app.inject({
                method: "GET",

                url: "/health",
            });

            const second = await app.inject({
                method: "GET",

                url: "/health",
            });

            const third = await app.inject({
                method: "GET",

                url: "/health",
            });

            const fourth = await app.inject({
                method: "GET",

                url: "/health",
            });

            expect(first.statusCode).toBe(200);

            expect(second.statusCode).toBe(200);

            expect(third.statusCode).toBe(200);

            expect(fourth.statusCode).toBe(429);

            expect(fourth.json()).toEqual({
                error: "Rate limit exceeded",

                message:
                    "Muitas requisições foram realizadas. Tente novamente em alguns instantes.",
            });
        });

        it("deve enviar headers relacionados ao limite", async () => {
            const response = await app.inject({
                method: "GET",

                url: "/health",
            });

            /*
             * Não fixamos exatamente
             * todos os nomes porque
             * queremos evitar acoplamento
             * excessivo à implementação
             * interna do plugin.
             */

            const headerNames = Object.keys(response.headers);

            const hasRateLimitHeader = headerNames.some((header) =>
                header.toLowerCase().includes("ratelimit")
            );

            expect(hasRateLimitHeader).toBe(true);
        });
    });

    /*
     * =================================================
     * HEALTH
     * =================================================
     */

    describe("health endpoint", () => {
        it("deve continuar funcionando após o hardening", async () => {
            const response = await app.inject({
                method: "GET",

                url: "/health",
            });

            expect(response.statusCode).toBe(200);

            expect(response.json()).toEqual({
                status: "ok",

                service: "devpulse-api",
            });
        });
    });
});
