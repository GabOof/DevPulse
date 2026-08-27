import { afterEach, describe, expect, it, vi } from "vitest";

/*
 * =========================================================
 * ORIGINAL ENV
 * =========================================================
 */

const originalEnv = {
    ...process.env,
};

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function configureRequiredEnv(): void {
    process.env.NODE_ENV = "test";

    process.env.DATABASE_URL = "postgresql://devpulse:devpulse@localhost:5432/devpulse";

    process.env.FRONTEND_URL = "http://localhost:5173";

    process.env.GITHUB_CLIENT_ID = "test-client-id";

    process.env.GITHUB_CLIENT_SECRET = "test-client-secret";

    process.env.GITHUB_CALLBACK_URL = "http://localhost:3333/api/auth/github/callback";

    process.env.AUTH_ENCRYPTION_KEY =
        "1111111111111111111111111111111111111111111111111111111111111111";

    process.env.SESSION_COOKIE_NAME = "devpulse_session";
}

/*
 * =========================================================
 * CLEANUP
 * =========================================================
 */

afterEach(() => {
    process.env = {
        ...originalEnv,
    };

    vi.resetModules();
});

/*
 * =========================================================
 * TESTS
 * =========================================================
 */

describe("environment configuration", () => {
    it("deve carregar configuração válida", async () => {
        configureRequiredEnv();

        const { env } = await import("../env.js");

        expect(env.nodeEnv).toBe("test");

        expect(env.databaseUrl).toBe("postgresql://devpulse:devpulse@localhost:5432/devpulse");

        expect(env.frontendUrl).toBe("http://localhost:5173");

        expect(env.github.clientId).toBe("test-client-id");

        expect(env.github.clientSecret).toBe("test-client-secret");

        expect(env.github.callbackUrl).toBe("http://localhost:3333/api/auth/github/callback");

        expect(env.auth.sessionCookieName).toBe("devpulse_session");
    });

    it("deve aplicar valores padrão", async () => {
        configureRequiredEnv();

        delete process.env.PORT;

        delete process.env.HOST;

        delete process.env.RATE_LIMIT_MAX;

        delete process.env.CACHE_REPOSITORY_TTL_SECONDS;

        delete process.env.CACHE_ANALYTICS_TTL_SECONDS;

        const { env } = await import("../env.js");

        expect(env.port).toBe(3333);

        expect(env.host).toBe("0.0.0.0");

        expect(env.rateLimit.max).toBe(120);

        expect(env.cache.repositoryTtlSeconds).toBe(300);

        expect(env.cache.analyticsTtlSeconds).toBe(120);
    });

    it("deve permitir sobrescrever configurações numéricas", async () => {
        configureRequiredEnv();

        process.env.PORT = "4000";

        process.env.RATE_LIMIT_MAX = "500";

        process.env.CACHE_REPOSITORY_TTL_SECONDS = "600";

        process.env.CACHE_ANALYTICS_TTL_SECONDS = "240";

        const { env } = await import("../env.js");

        expect(env.port).toBe(4000);

        expect(env.rateLimit.max).toBe(500);

        expect(env.cache.repositoryTtlSeconds).toBe(600);

        expect(env.cache.analyticsTtlSeconds).toBe(240);
    });

    it("deve rejeitar encryption key inválida", async () => {
        configureRequiredEnv();

        process.env.AUTH_ENCRYPTION_KEY = "invalid-key";

        const { env } = await import("../env.js");

        expect(() => env.auth.encryptionKey).toThrow("ENV_INVALID_AUTH_ENCRYPTION_KEY");
    });

    it("deve detectar variável obrigatória ausente", async () => {
        configureRequiredEnv();

        delete process.env.DATABASE_URL;

        const { env } = await import("../env.js");

        expect(() => env.databaseUrl).toThrow("ENV_MISSING_DATABASE_URL");
    });

    it("validateEnvironment deve validar toda configuração crítica", async () => {
        configureRequiredEnv();

        const { validateEnvironment } = await import("../env.js");

        expect(() => validateEnvironment()).not.toThrow();
    });

    it("deve rejeitar callback URL inválida", async () => {
        configureRequiredEnv();

        process.env.GITHUB_CALLBACK_URL = "callback-invalido";

        const { env } = await import("../env.js");

        expect(() => env.github.callbackUrl).toThrow("ENV_INVALID_URL_GITHUB_CALLBACK_URL");
    });
});
