import type { RepositoryAnalysis } from "../types/github.js";

import type { RepositoryAnalytics } from "../types/analytics.js";

import { env } from "../config/env.js";

import { GitHubService } from "./github.service.js";

import { cacheService, type CacheResult, type CacheService } from "./cache.service.js";

import { cacheKeyService, type CacheKeyService } from "./cache-key.service.js";

/*
 * =========================================================
 * GITHUB DATA SOURCE
 * =========================================================
 *
 * Mantemos uma interface para que o serviço
 * possa ser facilmente mockado nos testes.
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

/*
 * =========================================================
 * OPTIONS
 * =========================================================
 */

export interface CachedGitHubOptions {
    forceRefresh?: boolean;
}

/*
 * =========================================================
 * TTL
 * =========================================================
 */

function getRepositoryTtl(): number {
    return env.cache.repositoryTtlSeconds * 1000;
}

function getAnalyticsTtl(): number {
    return env.cache.analyticsTtlSeconds * 1000;
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
