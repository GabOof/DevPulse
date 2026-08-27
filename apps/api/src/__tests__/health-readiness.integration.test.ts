import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * =========================================================
 * ENVIRONMENT
 * =========================================================
 */

function configureTestEnvironment(): void {
    process.env.NODE_ENV = "test";

    process.env.DATABASE_URL = "postgresql://devpulse:devpulse@localhost:5432/devpulse";

    process.env.FRONTEND_URL = "http://localhost:5173";

    process.env.GITHUB_CLIENT_ID = "test-client-id";

    process.env.GITHUB_CLIENT_SECRET = "test-client-secret";

    process.env.GITHUB_CALLBACK_URL = "http://localhost:3333/api/auth/github/callback";

    process.env.AUTH_ENCRYPTION_KEY =
        "1111111111111111111111111111111111111111111111111111111111111111";

    process.env.SESSION_COOKIE_NAME = "devpulse_session";

    process.env.TRUST_PROXY = "false";
}

/*
 * =========================================================
 * TEST SETUP
 * =========================================================
 */

beforeEach(() => {
    configureTestEnvironment();
});

afterEach(() => {
    vi.restoreAllMocks();
});

/*
 * =========================================================
 * TESTS
 * =========================================================
 */

describe("Health and Readiness", () => {
    it("GET /health deve indicar que a API está viva", async () => {
        const { buildApp } = await import("../app.js");

        const readinessCheck = vi.fn();

        const app = await buildApp({
            logger: false,

            readinessCheck,
        });

        const response = await app.inject({
            method: "GET",

            url: "/health",
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toEqual({
            status: "ok",

            service: "devpulse-api",
        });

        expect(response.headers["cache-control"]).toBe("no-store");

        /*
         * Liveness não deve tocar
         * nas dependências externas.
         */

        expect(readinessCheck).not.toHaveBeenCalled();

        await app.close();
    });

    it("GET /ready deve retornar 200 quando PostgreSQL estiver disponível", async () => {
        const { buildApp } = await import("../app.js");

        const readinessCheck = vi.fn().mockResolvedValue({
            status: "ready",

            service: "devpulse-api",

            checks: {
                database: {
                    status: "up",

                    latencyMs: 4,
                },
            },
        });

        const app = await buildApp({
            logger: false,

            readinessCheck,
        });

        const response = await app.inject({
            method: "GET",

            url: "/ready",
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toEqual({
            status: "ready",

            service: "devpulse-api",

            checks: {
                database: {
                    status: "up",

                    latencyMs: 4,
                },
            },
        });

        expect(readinessCheck).toHaveBeenCalledTimes(1);

        await app.close();
    });

    it("GET /ready deve retornar 503 quando PostgreSQL estiver indisponível", async () => {
        const { buildApp } = await import("../app.js");

        const readinessCheck = vi.fn().mockResolvedValue({
            status: "not_ready",

            service: "devpulse-api",

            checks: {
                database: {
                    status: "down",

                    latencyMs: 3000,
                },
            },
        });

        const app = await buildApp({
            logger: false,

            readinessCheck,
        });

        const response = await app.inject({
            method: "GET",

            url: "/ready",
        });

        expect(response.statusCode).toBe(503);

        expect(response.json().status).toBe("not_ready");

        expect(response.json().checks.database.status).toBe("down");

        await app.close();
    });

    it("GET /ready não deve permitir cache HTTP", async () => {
        const { buildApp } = await import("../app.js");

        const readinessCheck = vi.fn().mockResolvedValue({
            status: "ready",

            service: "devpulse-api",

            checks: {
                database: {
                    status: "up",

                    latencyMs: 1,
                },
            },
        });

        const app = await buildApp({
            logger: false,

            readinessCheck,
        });

        const response = await app.inject({
            method: "GET",

            url: "/ready",
        });

        expect(response.headers["cache-control"]).toBe("no-store");

        await app.close();
    });
});
