import { beforeEach, describe, expect, it, vi } from "vitest";

import { CacheService } from "../cache.service.js";

import { CacheKeyService } from "../cache-key.service.js";

import { CachedGitHubService, type GitHubDataSource } from "../cached-github.service.js";

import type { RepositoryAnalysis } from "../../types/github.js";

import type { RepositoryAnalytics } from "../../types/analytics.js";

/*
 * =========================================================
 * FIXTURES
 * =========================================================
 */

function createRepository(): RepositoryAnalysis {
    return {
        id: 1,

        name: "DevPulse",

        fullName: "GabOof/DevPulse",

        description: "GitHub analytics platform",

        owner: {
            username: "GabOof",

            avatarUrl: "https://github.com/GabOof.png",

            profileUrl: "https://github.com/GabOof",
        },

        repositoryUrl: "https://github.com/GabOof/DevPulse",

        homepage: null,

        stats: {
            stars: 10,

            forks: 2,

            watchers: 10,

            openIssues: 1,
        },

        language: "TypeScript",

        topics: [],

        license: null,

        createdAt: "2026-08-01T00:00:00Z",

        updatedAt: "2026-08-27T00:00:00Z",

        pushedAt: "2026-08-27T00:00:00Z",

        defaultBranch: "main",
    };
}

/*
 * Para os testes do cache não precisamos
 * conhecer todos os detalhes de analytics.
 *
 * O valor apenas precisa ser estável.
 */
function createAnalytics(): RepositoryAnalytics {
    return {
        period: {
            days: 30,

            since: "2026-07-29T00:00:00Z",

            until: "2026-08-27T00:00:00Z",
        },

        summary: {
            totalCommits: 0,

            activeDays: 0,

            averageCommitsPerActiveDay: 0,

            busiestDay: null,
        },

        activity: [],

        languages: [],

        commitIntelligence: {
            conventionalCommits: 0,

            conventionalPercentage: 0,

            breakingChanges: 0,

            categories: [
                {
                    category: "feature",
                    count: 0,
                    percentage: 0,
                },
                {
                    category: "fix",
                    count: 0,
                    percentage: 0,
                },
                {
                    category: "refactor",
                    count: 0,
                    percentage: 0,
                },
                {
                    category: "docs",
                    count: 0,
                    percentage: 0,
                },
                {
                    category: "test",
                    count: 0,
                    percentage: 0,
                },
                {
                    category: "chore",
                    count: 0,
                    percentage: 0,
                },
                {
                    category: "other",
                    count: 0,
                    percentage: 0,
                },
            ],

            recentCommits: [],
        },

        collaboration: {
            totalContributors: 0,

            topContributor: null,

            concentrationPercentage: 0,

            concentrationRisk: "low",

            contributors: [],
        },

        projectHealth: {
            score: 0,

            level: "critical",

            methodology: {
                version: "1.0",
                description: "Heuristic DevPulse Project Health Score.",
            },

            dimensions: [],
        },

        truncated: false,
    };
}

/*
 * =========================================================
 * TESTS
 * =========================================================
 */

describe("CachedGitHubService", () => {
    let cache: CacheService;

    let getRepository: ReturnType<typeof vi.fn<GitHubDataSource["getRepository"]>>;

    let getRepositoryAnalytics: ReturnType<
        typeof vi.fn<GitHubDataSource["getRepositoryAnalytics"]>
    >;

    let github: GitHubDataSource;

    let service: CachedGitHubService;

    beforeEach(() => {
        cache = new CacheService();

        getRepository = vi.fn<GitHubDataSource["getRepository"]>(async () => createRepository());

        getRepositoryAnalytics = vi.fn<GitHubDataSource["getRepositoryAnalytics"]>(async () =>
            createAnalytics()
        );

        github = {
            getRepository,

            getRepositoryAnalytics,
        };

        service = new CachedGitHubService(
            github,

            cache,

            new CacheKeyService()
        );
    });

    /*
     * =================================================
     * REPOSITORY MISS
     * =================================================
     */

    it("primeira consulta do repositório deve ser MISS", async () => {
        const result = await service.getRepository("GabOof", "DevPulse");

        expect(result.status).toBe("MISS");

        expect(result.value.name).toBe("DevPulse");

        expect(getRepository).toHaveBeenCalledTimes(1);
    });

    /*
     * =================================================
     * REPOSITORY HIT
     * =================================================
     */

    it("segunda consulta deve usar cache", async () => {
        await service.getRepository("GabOof", "DevPulse");

        const second = await service.getRepository("GabOof", "DevPulse");

        expect(second.status).toBe("HIT");

        expect(getRepository).toHaveBeenCalledTimes(1);
    });

    /*
     * =================================================
     * FORCE REFRESH
     * =================================================
     */

    it("forceRefresh deve consultar GitHub novamente", async () => {
        await service.getRepository("GabOof", "DevPulse");

        const refreshed = await service.getRepository(
            "GabOof",
            "DevPulse",

            undefined,

            {
                forceRefresh: true,
            }
        );

        expect(refreshed.status).toBe("MISS");

        expect(getRepository).toHaveBeenCalledTimes(2);
    });

    /*
     * =================================================
     * TOKEN
     * =================================================
     */

    it("deve encaminhar access token ao GitHubService", async () => {
        await service.getRepository(
            "empresa",
            "private",

            "ghu_secret"
        );

        expect(getRepository).toHaveBeenCalledWith("empresa", "private", "ghu_secret");
    });

    /*
     * =================================================
     * PRIVATE ISOLATION
     * =================================================
     */

    it("não deve compartilhar cache entre tokens diferentes", async () => {
        await service.getRepository(
            "empresa",
            "private",

            "ghu_user_a"
        );

        await service.getRepository(
            "empresa",
            "private",

            "ghu_user_b"
        );

        expect(getRepository).toHaveBeenCalledTimes(2);
    });

    it("deve compartilhar cache quando o token for o mesmo", async () => {
        await service.getRepository(
            "empresa",
            "private",

            "ghu_same_user"
        );

        const second = await service.getRepository(
            "empresa",
            "private",

            "ghu_same_user"
        );

        expect(second.status).toBe("HIT");

        expect(getRepository).toHaveBeenCalledTimes(1);
    });

    /*
     * =================================================
     * ANALYTICS
     * =================================================
     */

    it("deve armazenar analytics em cache", async () => {
        const first = await service.getRepositoryAnalytics("GabOof", "DevPulse", 30);

        const second = await service.getRepositoryAnalytics("GabOof", "DevPulse", 30);

        expect(first.status).toBe("MISS");

        expect(second.status).toBe("HIT");

        expect(getRepositoryAnalytics).toHaveBeenCalledTimes(1);
    });

    it("analytics de períodos diferentes devem possuir caches diferentes", async () => {
        await service.getRepositoryAnalytics("GabOof", "DevPulse", 7);

        await service.getRepositoryAnalytics("GabOof", "DevPulse", 30);

        expect(getRepositoryAnalytics).toHaveBeenCalledTimes(2);
    });

    /*
     * =================================================
     * DEDUPLICATION
     * =================================================
     */

    it("deve deduplicar chamadas simultâneas", async () => {
        let resolveRequest: (value: RepositoryAnalysis) => void = () => {};

        getRepository.mockImplementation(
            () =>
                new Promise<RepositoryAnalysis>((resolve) => {
                    resolveRequest = resolve;
                })
        );

        /*
         * As três chamadas são iniciadas
         * antes da primeira terminar.
         */

        const first = service.getRepository("GabOof", "DevPulse");

        const second = service.getRepository("GabOof", "DevPulse");

        const third = service.getRepository("GabOof", "DevPulse");

        /*
         * A factory do CacheService é
         * executada em uma microtask:
         *
         * Promise.resolve().then(factory)
         *
         * Então liberamos a fila de
         * microtasks antes de verificar
         * quantas chamadas chegaram ao
         * GitHubService.
         */

        await Promise.resolve();

        /*
         * Apesar de termos três requests,
         * somente uma consulta real foi
         * iniciada.
         */

        expect(getRepository).toHaveBeenCalledTimes(1);

        /*
         * Finaliza a consulta simulada.
         */

        resolveRequest(createRepository());

        const results = await Promise.all([first, second, third]);

        /*
         * A primeira chamada é responsável
         * por buscar os dados.
         */

        expect(results[0].status).toBe("MISS");

        /*
         * As demais reutilizaram a Promise
         * que já estava em execução.
         */

        expect(results[1].status).toBe("COALESCED");

        expect(results[2].status).toBe("COALESCED");

        /*
         * Confirma que realmente houve
         * apenas uma consulta externa.
         */

        expect(getRepository).toHaveBeenCalledTimes(1);

        /*
         * O CacheService também registra
         * quantas requisições foram
         * deduplicadas.
         */

        expect(cache.getStats().deduplicated).toBe(2);
    });

    /*
     * =================================================
     * ERROR
     * =================================================
     */

    it("não deve armazenar erro do GitHub em cache", async () => {
        getRepository
            .mockRejectedValueOnce(new Error("GITHUB_API_ERROR"))
            .mockResolvedValueOnce(createRepository());

        await expect(service.getRepository("GabOof", "DevPulse")).rejects.toThrow(
            "GITHUB_API_ERROR"
        );

        const second = await service.getRepository("GabOof", "DevPulse");

        expect(second.status).toBe("MISS");

        expect(getRepository).toHaveBeenCalledTimes(2);
    });
});
