import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { FastifyInstance } from "fastify";

import { cacheService } from "../services/cache.service.js";

let buildApp: typeof import("../app.js").buildApp;

let app: FastifyInstance;

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function jsonResponse(
    data: unknown,

    status = 200
): Response {
    return new Response(JSON.stringify(data), {
        status,

        headers: {
            "Content-Type": "application/json",
        },
    });
}

function createRepository() {
    return {
        id: 123456789,

        name: "DevPulse",

        full_name: "GabOof/DevPulse",

        owner: {
            login: "GabOof",

            avatar_url: "https://github.com/GabOof.png",

            html_url: "https://github.com/GabOof",
        },

        html_url: "https://github.com/GabOof/DevPulse",

        description: "GitHub repository intelligence platform",

        homepage: null,

        stargazers_count: 12,

        forks_count: 3,

        watchers_count: 12,

        open_issues_count: 2,

        language: "TypeScript",

        topics: [],

        license: null,

        created_at: "2026-08-01T12:00:00Z",

        updated_at: "2026-08-27T12:00:00Z",

        pushed_at: "2026-08-27T11:30:00Z",

        default_branch: "main",
    };
}

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

    process.env.RATE_LIMIT_MAX = "1000";

    process.env.CACHE_REPOSITORY_TTL_SECONDS = "300";

    process.env.CACHE_ANALYTICS_TTL_SECONDS = "120";

    const module = await import("../app.js");

    buildApp = module.buildApp;
});

/*
 * =========================================================
 * SETUP
 * =========================================================
 */

beforeEach(async () => {
    cacheService.clear();

    app = await buildApp({
        logger: false,
    });
});

afterEach(async () => {
    vi.unstubAllGlobals();

    vi.restoreAllMocks();

    cacheService.clear();

    await app.close();
});

/*
 * =========================================================
 * TESTS
 * =========================================================
 */

describe("HTTP Cache Integration", () => {
    /*
     * =================================================
     * REPOSITORY MISS
     * =================================================
     */

    it("primeira consulta deve retornar MISS", async () => {
        const fetchMock = vi.fn(
            async (
                _input: string | URL | Request,

                _init?: RequestInit
            ) => jsonResponse(createRepository())
        );

        vi.stubGlobal("fetch", fetchMock);

        const response = await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse",
        });

        expect(response.statusCode).toBe(200);

        expect(response.headers["x-devpulse-cache"]).toBe("MISS");

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    /*
     * =================================================
     * REPOSITORY HIT
     * =================================================
     */

    it("segunda consulta deve retornar HIT", async () => {
        const fetchMock = vi.fn(
            async (
                _input: string | URL | Request,

                _init?: RequestInit
            ) => jsonResponse(createRepository())
        );

        vi.stubGlobal("fetch", fetchMock);

        const first = await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse",
        });

        const second = await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse",
        });

        expect(first.headers["x-devpulse-cache"]).toBe("MISS");

        expect(second.headers["x-devpulse-cache"]).toBe("HIT");

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    /*
     * =================================================
     * FORCE REFRESH
     * =================================================
     */

    it("refresh=true deve ignorar cache", async () => {
        const fetchMock = vi.fn(
            async (
                _input: string | URL | Request,

                _init?: RequestInit
            ) => jsonResponse(createRepository())
        );

        vi.stubGlobal("fetch", fetchMock);

        await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse",
        });

        const response = await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse?refresh=true",
        });

        expect(response.statusCode).toBe(200);

        expect(response.headers["x-devpulse-cache"]).toBe("MISS");

        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    /*
     * =================================================
     * INVALID REFRESH
     * =================================================
     */

    it("refresh inválido deve retornar 400", async () => {
        const fetchMock = vi.fn();

        vi.stubGlobal("fetch", fetchMock);

        const response = await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse?refresh=abc",
        });

        expect(response.statusCode).toBe(400);

        expect(fetchMock).not.toHaveBeenCalled();
    });

    /*
     * =================================================
     * ANALYTICS
     * =================================================
     */

    it("analytics deve usar cache na segunda consulta", async () => {
        const fetchMock = vi.fn(async (input: string | URL | Request) => {
            const url = String(input);

            if (url.includes("/commits?")) {
                return jsonResponse([]);
            }

            if (url.endsWith("/languages")) {
                return jsonResponse({});
            }

            return jsonResponse({}, 404);
        });

        vi.stubGlobal("fetch", fetchMock);

        const first = await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse/analytics?days=30",
        });

        const second = await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse/analytics?days=30",
        });

        expect(first.statusCode).toBe(200);

        expect(second.statusCode).toBe(200);

        expect(first.headers["x-devpulse-cache"]).toBe("MISS");

        expect(second.headers["x-devpulse-cache"]).toBe("HIT");

        /*
         * Uma consulta analytics vazia:
         *
         * 1 request commits
         * 1 request languages
         *
         * Segunda chamada não consulta
         * GitHub novamente.
         */

        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    /*
     * =================================================
     * ANALYTICS FORCE REFRESH
     * =================================================
     */

    it("refresh=true deve atualizar analytics", async () => {
        const fetchMock = vi.fn(async (input: string | URL | Request) => {
            const url = String(input);

            if (url.includes("/commits?")) {
                return jsonResponse([]);
            }

            if (url.endsWith("/languages")) {
                return jsonResponse({});
            }

            return jsonResponse({}, 404);
        });

        vi.stubGlobal("fetch", fetchMock);

        await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse/analytics?days=30",
        });

        const refreshed = await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse/analytics?days=30&refresh=true",
        });

        expect(refreshed.statusCode).toBe(200);

        expect(refreshed.headers["x-devpulse-cache"]).toBe("MISS");

        /*
         * Primeira analytics:
         * commits + languages = 2
         *
         * Refresh:
         * commits + languages = 2
         *
         * total = 4
         */

        expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    /*
     * =================================================
     * PERIOD ISOLATION
     * =================================================
     */

    it("analytics de períodos diferentes não devem compartilhar cache", async () => {
        const fetchMock = vi.fn(async (input: string | URL | Request) => {
            const url = String(input);

            if (url.includes("/commits?")) {
                return jsonResponse([]);
            }

            if (url.endsWith("/languages")) {
                return jsonResponse({});
            }

            return jsonResponse({}, 404);
        });

        vi.stubGlobal("fetch", fetchMock);

        const seven = await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse/analytics?days=7",
        });

        const thirty = await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse/analytics?days=30",
        });

        expect(seven.headers["x-devpulse-cache"]).toBe("MISS");

        expect(thirty.headers["x-devpulse-cache"]).toBe("MISS");

        expect(fetchMock).toHaveBeenCalledTimes(4);
    });
});
