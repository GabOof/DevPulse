import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GitHubService } from "../services/github.service.js";

import { githubConditionalCacheService } from "../services/github-conditional-cache.service.js";

function createRepository() {
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

        stargazers_count: 10,

        forks_count: 2,

        watchers_count: 10,

        open_issues_count: 1,

        language: "TypeScript",

        topics: [],

        license: null,

        created_at: "2026-08-01T00:00:00Z",

        updated_at: "2026-08-27T00:00:00Z",

        pushed_at: "2026-08-27T00:00:00Z",

        default_branch: "main",
    };
}

describe("GitHub ETag integration", () => {
    beforeEach(() => {
        githubConditionalCacheService.clear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();

        vi.restoreAllMocks();

        githubConditionalCacheService.clear();
    });

    it("deve reutilizar resposta quando GitHub retornar 304", async () => {
        let requestNumber = 0;

        const fetchMock = vi.fn(
            async (
                _input: string | URL | Request,

                init?: RequestInit
            ) => {
                requestNumber++;

                /*
                 * Primeira chamada.
                 */

                if (requestNumber === 1) {
                    return new Response(
                        JSON.stringify(createRepository()),

                        {
                            status: 200,

                            headers: {
                                "Content-Type": "application/json",

                                ETag: '"repo-v1"',

                                "X-RateLimit-Limit": "5000",

                                "X-RateLimit-Remaining": "4999",
                            },
                        }
                    );
                }

                /*
                 * Segunda chamada precisa
                 * enviar If-None-Match.
                 */

                const headers = new Headers(init?.headers);

                expect(headers.get("if-none-match")).toBe('"repo-v1"');

                /*
                 * 304 não possui body.
                 */

                return new Response(
                    null,

                    {
                        status: 304,

                        headers: {
                            ETag: '"repo-v1"',

                            "X-RateLimit-Limit": "5000",

                            "X-RateLimit-Remaining": "4999",
                        },
                    }
                );
            }
        );

        vi.stubGlobal("fetch", fetchMock);

        const service = new GitHubService();

        const first = await service.getRepository(
            "GabOof",
            "DevPulse",

            "ghu_test"
        );

        const second = await service.getRepository(
            "GabOof",
            "DevPulse",

            "ghu_test"
        );

        expect(first).toEqual(second);

        expect(second.name).toBe("DevPulse");

        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("deve atualizar cache quando ETag mudar", async () => {
        const firstRepository = createRepository();

        const secondRepository = {
            ...createRepository(),

            stargazers_count: 25,
        };

        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify(firstRepository),

                    {
                        status: 200,

                        headers: {
                            "Content-Type": "application/json",

                            ETag: '"repo-v1"',
                        },
                    }
                )
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify(secondRepository),

                    {
                        status: 200,

                        headers: {
                            "Content-Type": "application/json",

                            ETag: '"repo-v2"',
                        },
                    }
                )
            );

        vi.stubGlobal("fetch", fetchMock);

        const service = new GitHubService();

        const first = await service.getRepository("GabOof", "DevPulse", "ghu_test");

        const second = await service.getRepository("GabOof", "DevPulse", "ghu_test");

        expect(first.stats.stars).toBe(10);

        expect(second.stats.stars).toBe(25);
    });
});
