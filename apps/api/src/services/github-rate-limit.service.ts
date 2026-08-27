import { cacheKeyService, type CacheKeyService } from "./cache-key.service.js";

export interface GitHubRateLimitSnapshot {
    limit: number | null;

    remaining: number | null;

    used: number | null;

    resetAt: string | null;

    resource: string | null;

    retryAfterSeconds: number | null;

    observedAt: string;
}

export class GitHubRateLimitService {
    private readonly snapshots = new Map<string, GitHubRateLimitSnapshot>();

    constructor(private readonly cacheKeys: CacheKeyService = cacheKeyService) {}

    /*
     * =====================================================
     * OBSERVE RESPONSE
     * =====================================================
     */

    observe(
        headers: Headers,

        accessToken?: string
    ): GitHubRateLimitSnapshot | null {
        const limit = this.parseNumber(headers.get("x-ratelimit-limit"));

        const remaining = this.parseNumber(headers.get("x-ratelimit-remaining"));

        const used = this.parseNumber(headers.get("x-ratelimit-used"));

        const reset = this.parseNumber(headers.get("x-ratelimit-reset"));

        const resource = headers.get("x-ratelimit-resource");

        const retryAfterSeconds = this.parseNumber(headers.get("retry-after"));

        /*
         * Alguns mocks e algumas respostas
         * podem não possuir nenhum header
         * de rate limit.
         *
         * Nesse caso não criamos snapshot.
         */

        if (
            limit === null &&
            remaining === null &&
            used === null &&
            reset === null &&
            resource === null &&
            retryAfterSeconds === null
        ) {
            return null;
        }

        const snapshot: GitHubRateLimitSnapshot = {
            limit,

            remaining,

            used,

            resetAt: reset !== null ? this.epochToIso(reset) : null,

            resource,

            retryAfterSeconds,

            observedAt: new Date().toISOString(),
        };

        const scope = this.cacheKeys.getAccessScope(accessToken);

        this.snapshots.set(scope, snapshot);

        return snapshot;
    }

    /*
     * =====================================================
     * GET
     * =====================================================
     */

    get(accessToken?: string): GitHubRateLimitSnapshot | null {
        const scope = this.cacheKeys.getAccessScope(accessToken);

        return this.snapshots.get(scope) ?? null;
    }

    /*
     * =====================================================
     * CLEAR
     * =====================================================
     */

    clear(): void {
        this.snapshots.clear();
    }

    /*
     * =====================================================
     * HELPERS
     * =====================================================
     */

    private parseNumber(value: string | null): number | null {
        if (value === null || value.trim() === "") {
            return null;
        }

        const parsed = Number(value);

        if (!Number.isFinite(parsed)) {
            return null;
        }

        return parsed;
    }

    private epochToIso(epochSeconds: number): string | null {
        if (!Number.isFinite(epochSeconds) || epochSeconds <= 0) {
            return null;
        }

        const date = new Date(epochSeconds * 1000);

        if (Number.isNaN(date.getTime())) {
            return null;
        }

        return date.toISOString();
    }
}

export const githubRateLimitService = new GitHubRateLimitService();
