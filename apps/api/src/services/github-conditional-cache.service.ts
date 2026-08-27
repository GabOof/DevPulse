import { cacheKeyService, type CacheKeyService } from "./cache-key.service.js";

export interface GitHubConditionalEntry<T> {
    etag: string;

    data: T;

    storedAt: string;
}

export class GitHubConditionalCacheService {
    private readonly entries = new Map<string, GitHubConditionalEntry<unknown>>();

    constructor(private readonly cacheKeys: CacheKeyService = cacheKeyService) {}

    /*
     * =====================================================
     * GET
     * =====================================================
     */

    get<T>(
        url: string,

        accessToken?: string
    ): GitHubConditionalEntry<T> | null {
        const key = this.buildKey(url, accessToken);

        const entry = this.entries.get(key);

        if (!entry) {
            return null;
        }

        return entry as GitHubConditionalEntry<T>;
    }

    /*
     * =====================================================
     * SET
     * =====================================================
     */

    set<T>(
        url: string,

        etag: string,

        data: T,

        accessToken?: string
    ): void {
        const normalizedEtag = etag.trim();

        if (!normalizedEtag) {
            return;
        }

        const key = this.buildKey(url, accessToken);

        this.entries.set(key, {
            etag: normalizedEtag,

            data,

            storedAt: new Date().toISOString(),
        });
    }

    /*
     * =====================================================
     * DELETE
     * =====================================================
     */

    delete(
        url: string,

        accessToken?: string
    ): boolean {
        return this.entries.delete(this.buildKey(url, accessToken));
    }

    /*
     * =====================================================
     * CLEAR
     * =====================================================
     */

    clear(): void {
        this.entries.clear();
    }

    /*
     * =====================================================
     * SIZE
     * =====================================================
     */

    size(): number {
        return this.entries.size;
    }

    /*
     * =====================================================
     * KEY
     * =====================================================
     */

    private buildKey(
        url: string,

        accessToken?: string
    ): string {
        const scope = this.cacheKeys.getAccessScope(accessToken);

        return [scope, "etag", url].join(":");
    }
}

export const githubConditionalCacheService = new GitHubConditionalCacheService();
