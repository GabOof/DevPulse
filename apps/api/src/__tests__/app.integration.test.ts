import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { FastifyInstance } from "fastify";

/*
 * Não importamos app.ts imediatamente.
 *
 * Primeiro definimos variáveis de
 * ambiente seguras para os testes.
 *
 * Isso é importante porque alguns
 * serviços de autenticação são
 * construídos durante os imports.
 */

let buildApp: typeof import("../app.js").buildApp;

let app: FastifyInstance;

beforeAll(async () => {
    /*
     * Chave AES de teste.
     *
     * 64 caracteres hexadecimais
     * = 32 bytes.
     */
    process.env.AUTH_ENCRYPTION_KEY ??=
        "1111111111111111111111111111111111111111111111111111111111111111";

    process.env.FRONTEND_URL ??= "http://localhost:5173";

    process.env.SESSION_COOKIE_NAME ??= "devpulse_session";

    /*
     * Não serão usados nestes
     * testes, mas evitam erro caso
     * algum serviço valide as
     * configurações durante a
     * inicialização.
     */
    process.env.GITHUB_CLIENT_ID ??= "test-client-id";

    process.env.GITHUB_CLIENT_SECRET ??= "test-client-secret";

    process.env.GITHUB_CALLBACK_URL ??= "http://localhost:3333/api/auth/github/callback";

    /*
     * Prisma não fará consultas
     * nos testes abaixo sem sessão,
     * mas precisa possuir uma URL
     * válida para ser inicializado.
     */
    process.env.DATABASE_URL ??= "postgresql://devpulse:devpulse@localhost:5432/devpulse";

    const module = await import("../app.js");

    buildApp = module.buildApp;
});

beforeEach(async () => {
    /*
     * Cada teste recebe uma
     * aplicação nova.
     *
     * Dessa forma um teste não
     * interfere no outro.
     */
    app = await buildApp({
        logger: false,
    });
});

afterEach(async () => {
    /*
     * Sempre fechamos a instância.
     *
     * É uma prática recomendada
     * para liberar recursos dos
     * plugins utilizados.
     */
    await app.close();
});

describe("DevPulse API", () => {
    /*
     * ==========================
     * HEALTH CHECK
     * ==========================
     */

    describe("GET /health", () => {
        it("deve retornar status 200", async () => {
            const response = await app.inject({
                method: "GET",

                url: "/health",
            });

            expect(response.statusCode).toBe(200);
        });

        it("deve identificar o serviço DevPulse", async () => {
            const response = await app.inject({
                method: "GET",

                url: "/health",
            });

            expect(response.json()).toEqual({
                status: "ok",

                service: "devpulse-api",
            });
        });

        it("deve retornar JSON", async () => {
            const response = await app.inject({
                method: "GET",

                url: "/health",
            });

            expect(response.headers["content-type"]).toContain("application/json");
        });
    });

    /*
     * ==========================
     * ANALYTICS VALIDATION
     * ==========================
     */

    describe("GET /api/repositories/:owner/:repo/analytics", () => {
        it("deve rejeitar período diferente de 7, 30 ou 90", async () => {
            const response = await app.inject({
                method: "GET",

                url: "/api/repositories/GabOof/DevPulse/analytics?days=15",
            });

            expect(response.statusCode).toBe(400);

            expect(response.json()).toEqual({
                error: "Invalid period",

                message: "O período deve ser 7, 30 ou 90 dias.",
            });
        });

        it("deve rejeitar período não numérico", async () => {
            const response = await app.inject({
                method: "GET",

                url: "/api/repositories/GabOof/DevPulse/analytics?days=abc",
            });

            expect(response.statusCode).toBe(400);

            expect(response.json().error).toBe("Invalid period");
        });
    });

    /*
     * ==========================
     * HISTORY AUTHORIZATION
     * ==========================
     */

    describe("GET /api/repositories/:owner/:repo/history", () => {
        it("deve exigir autenticação", async () => {
            const response = await app.inject({
                method: "GET",

                url: "/api/repositories/GabOof/DevPulse/history?days=30",
            });

            expect(response.statusCode).toBe(401);
        });

        it("deve informar que autenticação é necessária", async () => {
            const response = await app.inject({
                method: "GET",

                url: "/api/repositories/GabOof/DevPulse/history?days=30",
            });

            expect(response.json().error).toBe("Authentication required");
        });
    });

    /*
     * ==========================
     * SNAPSHOT AUTHORIZATION
     * ==========================
     */

    describe("POST /api/repositories/:owner/:repo/analyze", () => {
        it("deve impedir criação de snapshot sem autenticação", async () => {
            const response = await app.inject({
                method: "POST",

                url: "/api/repositories/GabOof/DevPulse/analyze?days=30",
            });

            expect(response.statusCode).toBe(401);

            expect(response.json().error).toBe("Authentication required");
        });

        it("deve validar o período antes de executar análise", async () => {
            const response = await app.inject({
                method: "POST",

                url: "/api/repositories/GabOof/DevPulse/analyze?days=200",
            });

            expect(response.statusCode).toBe(400);

            expect(response.json().error).toBe("Invalid period");
        });
    });

    /*
     * ==========================
     * AUTH / ME
     * ==========================
     */

    describe("GET /api/auth/me", () => {
        it("deve retornar 401 sem cookie de sessão", async () => {
            const response = await app.inject({
                method: "GET",

                url: "/api/auth/me",
            });

            expect(response.statusCode).toBe(401);
        });

        it("deve retornar authenticated false", async () => {
            const response = await app.inject({
                method: "GET",

                url: "/api/auth/me",
            });

            expect(response.json()).toEqual({
                authenticated: false,
            });
        });
    });

    /*
     * ==========================
     * LOGOUT
     * ==========================
     */

    describe("POST /api/auth/logout", () => {
        it("deve permitir logout mesmo sem sessão existente", async () => {
            const response = await app.inject({
                method: "POST",

                url: "/api/auth/logout",
            });

            expect(response.statusCode).toBe(200);

            expect(response.json()).toEqual({
                message: "Logout realizado com sucesso.",
            });
        });
    });

    /*
     * ==========================
     * UNKNOWN ROUTE
     * ==========================
     */

    describe("rota inexistente", () => {
        it("deve retornar 404", async () => {
            const response = await app.inject({
                method: "GET",

                url: "/api/isso-nao-existe",
            });

            expect(response.statusCode).toBe(404);
        });
    });
});
