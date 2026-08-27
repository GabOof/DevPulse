/*
 * =========================================================
 * ENVIRONMENT CONFIGURATION
 * =========================================================
 *
 * Este é o único módulo da aplicação que deve acessar
 * process.env diretamente.
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

function booleanEnv(name: string, fallback: boolean): boolean {
    const raw = readEnv(name);

    if (!raw) {
        return fallback;
    }

    const normalized = raw.toLowerCase();

    if (
        normalized === "true" ||
        normalized === "1" ||
        normalized === "yes" ||
        normalized === "on"
    ) {
        return true;
    }

    if (
        normalized === "false" ||
        normalized === "0" ||
        normalized === "no" ||
        normalized === "off"
    ) {
        return false;
    }

    throw new Error(`ENV_INVALID_BOOLEAN_${name}`);
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
     * AES-256:
     *
     * 32 bytes
     * =
     * 64 caracteres hexadecimais.
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
     * PROXY
     * =====================================================
     *
     * Deve permanecer false quando a API
     * está diretamente exposta.
     *
     * Em produção atrás de um proxy confiável,
     * como load balancer/reverse proxy,
     * configure:
     *
     * TRUST_PROXY=true
     */

    get trustProxy(): boolean {
        return booleanEnv("TRUST_PROXY", false);
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
     * AUTH
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
 */

export function validateEnvironment(): void {
    /*
     * Application
     */

    void env.nodeEnv;
    void env.host;
    void env.port;
    void env.trustProxy;

    /*
     * Database
     */

    void env.databaseUrl;

    /*
     * Frontend
     */

    void env.frontendUrl;

    /*
     * GitHub
     */

    void env.github.clientId;
    void env.github.clientSecret;
    void env.github.callbackUrl;

    /*
     * Authentication
     */

    void env.auth.encryptionKey;
    void env.auth.sessionCookieName;

    /*
     * Rate limiting
     */

    void env.rateLimit.max;

    /*
     * Cache
     */

    void env.cache.repositoryTtlSeconds;
    void env.cache.analyticsTtlSeconds;
}
