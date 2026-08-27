/*
 * =========================================================
 * ENVIRONMENT CONFIGURATION
 * =========================================================
 *
 * Centraliza o acesso às variáveis de ambiente
 * utilizadas pela API do DevPulse.
 *
 * Importante:
 *
 * As configurações são avaliadas através de
 * getters. Isso evita que testes unitários que
 * não utilizam banco/OAuth falhem simplesmente
 * por importar este módulo.
 */

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function readEnv(name: string): string | undefined {
    const value = process.env[name]?.trim();

    return value || undefined;
}

function requireEnv(name: string): string {
    const value = readEnv(name);

    if (!value) {
        throw new Error(`ENV_MISSING_${name}`);
    }

    return value;
}

function positiveIntegerEnv(name: string, fallback: number): number {
    const raw = readEnv(name);

    if (!raw) {
        return fallback;
    }

    const value = Number(raw);

    if (!Number.isFinite(value) || value <= 0) {
        return fallback;
    }

    return Math.floor(value);
}

function validateUrl(name: string, value: string): string {
    try {
        new URL(value);

        return value;
    } catch {
        throw new Error(`ENV_INVALID_URL_${name}`);
    }
}

function validateEncryptionKey(value: string): string {
    /*
     * AES-256 utiliza chave de
     * 32 bytes.
     *
     * No DevPulse a chave é
     * armazenada em hexadecimal:
     *
     * 32 bytes = 64 caracteres hex.
     */

    if (!/^[0-9a-fA-F]{64}$/.test(value)) {
        throw new Error("ENV_INVALID_AUTH_ENCRYPTION_KEY");
    }

    return value;
}

/*
 * =========================================================
 * ENV
 * =========================================================
 */

export const env = {
    /*
     * =====================================================
     * APPLICATION
     * =====================================================
     */

    get nodeEnv(): string {
        return readEnv("NODE_ENV") ?? "development";
    },

    get host(): string {
        return readEnv("HOST") ?? "0.0.0.0";
    },

    get port(): number {
        return positiveIntegerEnv("PORT", 3333);
    },

    /*
     * =====================================================
     * DATABASE
     * =====================================================
     */

    get databaseUrl(): string {
        return requireEnv("DATABASE_URL");
    },

    /*
     * =====================================================
     * FRONTEND
     * =====================================================
     */

    get frontendUrl(): string {
        const value = readEnv("FRONTEND_URL") ?? "http://localhost:5173";

        return validateUrl("FRONTEND_URL", value);
    },

    /*
     * =====================================================
     * GITHUB
     * =====================================================
     */

    github: {
        get clientId(): string {
            return requireEnv("GITHUB_CLIENT_ID");
        },

        get clientSecret(): string {
            return requireEnv("GITHUB_CLIENT_SECRET");
        },

        get callbackUrl(): string {
            return validateUrl(
                "GITHUB_CALLBACK_URL",

                requireEnv("GITHUB_CALLBACK_URL")
            );
        },
    },

    /*
     * =====================================================
     * AUTHENTICATION
     * =====================================================
     */

    auth: {
        get encryptionKey(): string {
            return validateEncryptionKey(requireEnv("AUTH_ENCRYPTION_KEY"));
        },

        get sessionCookieName(): string {
            return readEnv("SESSION_COOKIE_NAME") ?? "devpulse_session";
        },
    },

    /*
     * =====================================================
     * RATE LIMIT
     * =====================================================
     */

    rateLimit: {
        get max(): number {
            return positiveIntegerEnv("RATE_LIMIT_MAX", 120);
        },
    },

    /*
     * =====================================================
     * CACHE
     * =====================================================
     */

    cache: {
        get repositoryTtlSeconds(): number {
            return positiveIntegerEnv("CACHE_REPOSITORY_TTL_SECONDS", 300);
        },

        get analyticsTtlSeconds(): number {
            return positiveIntegerEnv("CACHE_ANALYTICS_TTL_SECONDS", 120);
        },
    },
} as const;

/*
 * =========================================================
 * ENVIRONMENT HELPERS
 * =========================================================
 */

export function isProduction(): boolean {
    return env.nodeEnv === "production";
}

export function isTest(): boolean {
    return env.nodeEnv === "test";
}

export function isDevelopment(): boolean {
    return !isProduction() && !isTest();
}

/*
 * =========================================================
 * STARTUP VALIDATION
 * =========================================================
 *
 * Chamado pelo server.ts.
 *
 * Aqui validamos as configurações críticas
 * antes de abrir a porta HTTP.
 */

export function validateEnvironment(): void {
    /*
     * DATABASE
     */

    void env.databaseUrl;

    /*
     * FRONTEND
     */

    void env.frontendUrl;

    /*
     * GITHUB OAUTH
     */

    void env.github.clientId;

    void env.github.clientSecret;

    void env.github.callbackUrl;

    /*
     * AUTH
     */

    void env.auth.encryptionKey;

    void env.auth.sessionCookieName;

    /*
     * SERVER
     */

    void env.host;

    void env.port;

    /*
     * RATE LIMIT
     */

    void env.rateLimit.max;

    /*
     * CACHE
     */

    void env.cache.repositoryTtlSeconds;

    void env.cache.analyticsTtlSeconds;
}
