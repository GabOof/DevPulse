import type { RepositoryAnalysis } from "../types/github.js";

import type { RepositoryAnalytics } from "../types/analytics.js";

import { GitHubService } from "./github.service.js";

import { cacheService, type CacheResult, type CacheService } from "./cache.service.js";

import { cacheKeyService, type CacheKeyService } from "./cache-key.service.js";

/*
 * =========================================================
 * GITHUB DATA SOURCE
 * =========================================================
 *
 * Esta interface deixa o serviço fácil
 * de testar.
 */

export interface GitHubDataSource {
    getRepository(
        owner: string,

        repo: string,

        accessToken?: string
    ): Promise<RepositoryAnalysis>;

    getRepositoryAnalytics(
        owner: string,

        repo: string,

        days?: number,

        accessToken?: string
    ): Promise<RepositoryAnalytics>;
}

export interface CachedGitHubOptions {
    forceRefresh?: boolean;
}

/*
 * =========================================================
 * TTL
 * =========================================================
 */

function getPositiveInteger(
    value: string | undefined,

    fallback: number
): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return Math.floor(parsed);
}

function getRepositoryTtl(): number {
    const seconds = getPositiveInteger(
        process.env.CACHE_REPOSITORY_TTL_SECONDS,

        300
    );

    return seconds * 1000;
}

function getAnalyticsTtl(): number {
    const seconds = getPositiveInteger(
        process.env.CACHE_ANALYTICS_TTL_SECONDS,

        120
    );

    return seconds * 1000;
}

/*
 * =========================================================
 * CACHED GITHUB SERVICE
 * =========================================================
 */

export class CachedGitHubService {
    constructor(
        private readonly githubService: GitHubDataSource = new GitHubService(),

        private readonly cache: CacheService = cacheService,

        private readonly cacheKeys: CacheKeyService = cacheKeyService
    ) {}

    /*
     * =====================================================
     * REPOSITORY
     * =====================================================
     */

    async getRepository(
        owner: string,

        repo: string,

        accessToken?: string,

        options: CachedGitHubOptions = {}
    ): Promise<CacheResult<RepositoryAnalysis>> {
        const key = this.cacheKeys.repository(owner, repo, accessToken);

        return this.cache.getOrSetWithMeta(
            key,

            getRepositoryTtl(),

            () => this.githubService.getRepository(owner, repo, accessToken),

            {
                forceRefresh: options.forceRefresh ?? false,
            }
        );
    }

    /*
     * =====================================================
     * ANALYTICS
     * =====================================================
     */

    async getRepositoryAnalytics(
        owner: string,

        repo: string,

        days: number,

        accessToken?: string,

        options: CachedGitHubOptions = {}
    ): Promise<CacheResult<RepositoryAnalytics>> {
        const key = this.cacheKeys.analytics(owner, repo, days, accessToken);

        return this.cache.getOrSetWithMeta(
            key,

            getAnalyticsTtl(),

            () => this.githubService.getRepositoryAnalytics(owner, repo, days, accessToken),

            {
                forceRefresh: options.forceRefresh ?? false,
            }
        );
    }
}

/*
 * =========================================================
 * GLOBAL INSTANCE
 * =========================================================
 */

export const cachedGitHubService = new CachedGitHubService();
