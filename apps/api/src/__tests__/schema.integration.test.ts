import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { FastifyInstance } from "fastify";

let buildApp: typeof import("../app.js").buildApp;

let app: FastifyInstance;

function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,

        headers: {
            "Content-Type": "application/json",
        },
    });
}

function repositoryResponse() {
    return {
        id: 123,

        name: "DevPulse",

        full_name: "GabOof/DevPulse",

        owner: {
            login: "GabOof",

            avatar_url: "https://github.com/GabOof.png",

            html_url: "https://github.com/GabOof",
        },

        html_url: "https://github.com/GabOof/DevPulse",

        description: "DevPulse",

        homepage: null,

        stargazers_count: 1,

        forks_count: 1,

        watchers_count: 1,

        open_issues_count: 0,

        language: "TypeScript",

        topics: [],

        license: null,

        created_at: "2026-08-01T00:00:00Z",

        updated_at: "2026-08-26T00:00:00Z",

        pushed_at: "2026-08-26T00:00:00Z",

        default_branch: "main",
    };
}

beforeAll(async () => {
    process.env.AUTH_ENCRYPTION_KEY ??=
        "1111111111111111111111111111111111111111111111111111111111111111";

    process.env.FRONTEND_URL ??= "http://localhost:5173";

    process.env.SESSION_COOKIE_NAME ??= "devpulse_session";

    process.env.GITHUB_CLIENT_ID ??= "test-client-id";

    process.env.GITHUB_CLIENT_SECRET ??= "test-client-secret";

    process.env.GITHUB_CALLBACK_URL ??= "http://localhost:3333/api/auth/github/callback";

    process.env.DATABASE_URL ??= "postgresql://devpulse:devpulse@localhost:5432/devpulse";

    /*
     * Evita atingir rate limit
     * durante esta suíte.
     */
    process.env.RATE_LIMIT_MAX = "1000";

    const module = await import("../app.js");

    buildApp = module.buildApp;
});

beforeEach(async () => {
    app = await buildApp({
        logger: false,
    });
});

afterEach(async () => {
    vi.unstubAllGlobals();

    vi.restoreAllMocks();

    await app.close();
});

describe("Repository schemas", () => {
    /*
     * =================================================
     * OWNER
     * =================================================
     */

    it("deve aceitar owner válido", async () => {
        const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) =>
            jsonResponse(repositoryResponse())
        );

        vi.stubGlobal("fetch", fetchMock);

        const response = await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse",
        });

        expect(response.statusCode).toBe(200);
    });

    it("deve rejeitar owner inválido", async () => {
        const fetchMock = vi.fn();

        vi.stubGlobal("fetch", fetchMock);

        const response = await app.inject({
            method: "GET",

            url: "/api/repositories/!!!/DevPulse",
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toEqual({
            error: "Invalid repository",

            message: "Owner ou nome do repositório inválido.",
        });

        expect(fetchMock).not.toHaveBeenCalled();
    });

    /*
     * =================================================
     * REPOSITORY
     * =================================================
     */

    it("deve rejeitar repository inválido", async () => {
        const fetchMock = vi.fn();

        vi.stubGlobal("fetch", fetchMock);

        /*
         * %21 = !
         */

        const response = await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/%21%21%21",
        });

        expect(response.statusCode).toBe(400);

        expect(fetchMock).not.toHaveBeenCalled();
    });

    /*
     * =================================================
     * DAYS
     * =================================================
     */

    it("deve aceitar 7 dias", async () => {
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

        const response = await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse/analytics?days=7",
        });

        expect(response.statusCode).toBe(200);

        expect(response.json().period.days).toBe(7);
    });

    it("deve aceitar 30 dias", async () => {
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

        const response = await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse/analytics?days=30",
        });

        expect(response.statusCode).toBe(200);

        expect(response.json().period.days).toBe(30);
    });

    it("deve aceitar 90 dias", async () => {
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

        const response = await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse/analytics?days=90",
        });

        expect(response.statusCode).toBe(200);
    });

    it("deve rejeitar 15 dias antes de acessar GitHub", async () => {
        const fetchMock = vi.fn();

        vi.stubGlobal("fetch", fetchMock);

        const response = await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse/analytics?days=15",
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toEqual({
            error: "Invalid period",

            message: "O período deve ser 7, 30 ou 90 dias.",
        });

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("deve rejeitar período não numérico", async () => {
        const fetchMock = vi.fn();

        vi.stubGlobal("fetch", fetchMock);

        const response = await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse/analytics?days=abc",
        });

        expect(response.statusCode).toBe(400);

        expect(response.json().error).toBe("Invalid period");

        expect(fetchMock).not.toHaveBeenCalled();
    });

    /*
     * =================================================
     * EXTRA QUERY PARAMETERS
     * =================================================
     */

    it("deve rejeitar query parameters desconhecidos", async () => {
        const fetchMock = vi.fn();

        vi.stubGlobal("fetch", fetchMock);

        const response = await app.inject({
            method: "GET",

            url: "/api/repositories/GabOof/DevPulse/analytics?days=30&admin=true",
        });

        expect(response.statusCode).toBe(400);

        expect(fetchMock).not.toHaveBeenCalled();
    });
});
