import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { FastifyInstance } from "fastify";

let buildApp: typeof import("../app.js").buildApp;

let app: FastifyInstance;

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(data), {
        status,

        headers: {
            "Content-Type": "application/json",

            ...headers,
        },
    });
}

/*
 * =========================================================
 * REPOSITORY MOCK
 * =========================================================
 */

function createGitHubRepository() {
    return {
        id: 123456789,

        node_id: "R_kgDODevPulse",

        name: "DevPulse",

        full_name: "GabOof/DevPulse",

        private: false,

        owner: {
            login: "GabOof",

            id: 123456,

            avatar_url: "https://avatars.githubusercontent.com/u/123456",

            html_url: "https://github.com/GabOof",
        },

        html_url: "https://github.com/GabOof/DevPulse",

        description: "GitHub repository intelligence platform",

        fork: false,

        created_at: "2026-08-01T12:00:00Z",

        updated_at: "2026-08-26T12:00:00Z",

        pushed_at: "2026-08-26T11:30:00Z",

        homepage: null,

        size: 1540,

        stargazers_count: 12,

        watchers_count: 12,

        language: "TypeScript",

        forks_count: 3,

        archived: false,

        disabled: false,

        open_issues_count: 2,

        license: {
            key: "mit",

            name: "MIT License",

            spdx_id: "MIT",
        },

        topics: ["github", "analytics", "typescript", "fastify", "react"],

        visibility: "public",

        default_branch: "main",
    };
}

/*
 * =========================================================
 * COMMIT MOCK
 * =========================================================
 */

function createGitHubCommit(
    sha: string,
    message: string,
    authorName: string,
    username: string | null,
    date: string
) {
    return {
        sha,

        node_id: `node-${sha}`,

        html_url: `https://github.com/GabOof/DevPulse/commit/${sha}`,

        commit: {
            message,

            author: {
                name: authorName,

                email: `${authorName.toLowerCase().replace(/\s+/g, ".")}@example.com`,

                date,
            },

            committer: {
                name: authorName,

                email: `${authorName.toLowerCase().replace(/\s+/g, ".")}@example.com`,

                date,
            },
        },

        author: username
            ? {
                  login: username,

                  id: username === "GabOof" ? 1001 : 1002,

                  avatar_url: `https://github.com/${username}.png`,

                  html_url: `https://github.com/${username}`,
              }
            : null,
    };
}

/*
 * =========================================================
 * COMMITS MOCK
 * =========================================================
 */

function createGitHubCommits() {
    return [
        createGitHubCommit(
            "1111111111111111111111111111111111111111",

            "feat: add GitHub authentication",

            "Gabrielle",

            "GabOof",

            "2026-08-25T14:00:00Z"
        ),

        createGitHubCommit(
            "2222222222222222222222222222222222222222",

            "fix(auth): correct session validation",

            "Gabrielle",

            "GabOof",

            "2026-08-24T16:30:00Z"
        ),

        createGitHubCommit(
            "3333333333333333333333333333333333333333",

            "update repository documentation",

            "Developer Two",

            "developer-two",

            "2026-08-23T10:00:00Z"
        ),
    ];
}

/*
 * =========================================================
 * LANGUAGES MOCK
 * =========================================================
 */

function createGitHubLanguages() {
    return {
        TypeScript: 80000,

        CSS: 15000,

        JavaScript: 5000,
    };
}

/*
 * =========================================================
 * SETUP
 * =========================================================
 */

beforeAll(async () => {
    process.env.AUTH_ENCRYPTION_KEY ??=
        "1111111111111111111111111111111111111111111111111111111111111111";

    process.env.FRONTEND_URL ??= "http://localhost:5173";

    process.env.SESSION_COOKIE_NAME ??= "devpulse_session";

    process.env.GITHUB_CLIENT_ID ??= "test-client-id";

    process.env.GITHUB_CLIENT_SECRET ??= "test-client-secret";

    process.env.GITHUB_CALLBACK_URL ??= "http://localhost:3333/api/auth/github/callback";

    process.env.DATABASE_URL ??= "postgresql://devpulse:devpulse@localhost:5432/devpulse";

    const module = await import("../app.js");

    buildApp = module.buildApp;
});

beforeEach(async () => {
    app = await buildApp({
        logger: false,
    });
});

afterEach(async () => {
    vi.unstubAllGlobals();

    vi.restoreAllMocks();

    await app.close();
});

/*
 * =========================================================
 * TESTS
 * =========================================================
 */

describe("GitHub API Integration", () => {
    /*
     * =====================================================
     * REPOSITORY
     * =====================================================
     */

    describe("GET /api/repositories/:owner/:repo", () => {
        it("deve retornar dados do repositório", async () => {
            const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) =>
                jsonResponse(createGitHubRepository())
            );
            vi.stubGlobal("fetch", fetchMock);

            const response = await app.inject({
                method: "GET",

                url: "/api/repositories/GabOof/DevPulse",
            });

            expect(response.statusCode).toBe(200);

            const body = response.json();

            expect(body).toEqual(
                expect.objectContaining({
                    id: 123456789,

                    name: "DevPulse",

                    fullName: "GabOof/DevPulse",

                    language: "TypeScript",

                    defaultBranch: "main",

                    repositoryUrl: "https://github.com/GabOof/DevPulse",

                    stats: expect.objectContaining({
                        stars: 12,

                        forks: 3,

                        openIssues: 2,

                        watchers: 12,
                    }),
                })
            );

            expect(body.owner).toEqual({
                username: "GabOof",

                avatarUrl: "https://avatars.githubusercontent.com/u/123456",

                profileUrl: "https://github.com/GabOof",
            });

            expect(body.license).toEqual({
                name: "MIT License",

                spdxId: "MIT",
            });

            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it("deve solicitar o repositório correto ao GitHub", async () => {
            const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) =>
                jsonResponse(createGitHubRepository())
            );

            vi.stubGlobal("fetch", fetchMock);

            await app.inject({
                method: "GET",

                url: "/api/repositories/GabOof/DevPulse",
            });

            expect(fetchMock).toHaveBeenCalledTimes(1);

            const requestedUrl = String(fetchMock.mock.calls[0][0]);

            expect(requestedUrl).toBe("https://api.github.com/repos/GabOof/DevPulse");
        });

        it("deve enviar os headers esperados para o GitHub", async () => {
            const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) =>
                jsonResponse(createGitHubRepository())
            );

            vi.stubGlobal("fetch", fetchMock);

            await app.inject({
                method: "GET",

                url: "/api/repositories/GabOof/DevPulse",
            });

            const options = fetchMock.mock.calls[0][1] as RequestInit | undefined;

            const headers = options?.headers as Record<string, string> | undefined;

            expect(headers?.Accept).toBe("application/vnd.github+json");

            expect(headers?.["X-GitHub-Api-Version"]).toBe("2026-03-10");

            expect(headers?.["User-Agent"]).toBe("DevPulse");
        });

        it("não deve enviar Authorization em requisição anônima", async () => {
            const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) =>
                jsonResponse(createGitHubRepository())
            );

            vi.stubGlobal("fetch", fetchMock);

            await app.inject({
                method: "GET",

                url: "/api/repositories/GabOof/DevPulse",
            });

            const options = fetchMock.mock.calls[0][1] as RequestInit | undefined;

            const headers = options?.headers as Record<string, string> | undefined;

            expect(headers?.Authorization).toBeUndefined();
        });

        it("deve retornar 404 quando o GitHub retornar 404", async () => {
            const fetchMock = vi.fn(async () =>
                jsonResponse(
                    {
                        message: "Not Found",
                    },
                    404
                )
            );

            vi.stubGlobal("fetch", fetchMock);

            const response = await app.inject({
                method: "GET",

                url: "/api/repositories/GabOof/RepositorioInexistente",
            });

            expect(response.statusCode).toBe(404);

            expect(response.json().error).toBeDefined();
        });

        it("deve transformar rate limit do GitHub em 429", async () => {
            const fetchMock = vi.fn(async () =>
                jsonResponse(
                    {
                        message: "API rate limit exceeded",
                    },

                    403,

                    {
                        "X-RateLimit-Remaining": "0",
                    }
                )
            );

            vi.stubGlobal("fetch", fetchMock);

            const response = await app.inject({
                method: "GET",

                url: "/api/repositories/GabOof/DevPulse",
            });

            expect(response.statusCode).toBe(429);

            expect(response.json().error).toBeDefined();
        });
    });

    /*
     * =====================================================
     * ANALYTICS
     * =====================================================
     */

    describe("GET /api/repositories/:owner/:repo/analytics", () => {
        it("deve calcular analytics usando dados mockados do GitHub", async () => {
            const fetchMock = vi.fn(async (input: string | URL | Request) => {
                const url = String(input);

                if (url.includes("/commits?")) {
                    return jsonResponse(createGitHubCommits());
                }

                if (url.endsWith("/languages")) {
                    return jsonResponse(createGitHubLanguages());
                }

                return jsonResponse(
                    {
                        message: "Not Found",
                    },
                    404
                );
            });

            vi.stubGlobal("fetch", fetchMock);

            const response = await app.inject({
                method: "GET",

                url: "/api/repositories/GabOof/DevPulse/analytics?days=30",
            });

            expect(response.statusCode).toBe(200);

            const body = response.json();

            /*
             * =============================
             * PERIOD
             * =============================
             */

            expect(body.period.days).toBe(30);

            expect(body.period.since).toBeDefined();

            expect(body.period.until).toBeDefined();

            /*
             * =============================
             * SUMMARY
             * =============================
             */

            expect(body.summary.totalCommits).toBe(3);

            expect(body.summary.activeDays).toBe(3);

            expect(body.summary.averageCommitsPerActiveDay).toBe(1);

            expect(body.truncated).toBe(false);

            /*
             * =============================
             * COMMIT INTELLIGENCE
             * =============================
             */

            expect(body.commitIntelligence.conventionalCommits).toBe(2);

            expect(body.commitIntelligence.conventionalPercentage).toBeCloseTo(66.7, 1);

            /*
             * =============================
             * CATEGORIES
             * =============================
             */

            const feature = body.commitIntelligence.categories.find(
                (category: { category: string }) => category.category === "feature"
            );

            const fix = body.commitIntelligence.categories.find(
                (category: { category: string }) => category.category === "fix"
            );

            const docs = body.commitIntelligence.categories.find(
                (category: { category: string }) => category.category === "docs"
            );

            expect(feature?.count).toBe(1);

            expect(fix?.count).toBe(1);

            expect(docs?.count).toBe(1);

            /*
             * =============================
             * LANGUAGES
             * =============================
             *
             * LanguageUsage usa:
             *
             * {
             *   name,
             *   bytes,
             *   percentage
             * }
             */

            expect(body.languages).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: "TypeScript",
                    }),

                    expect.objectContaining({
                        name: "CSS",
                    }),

                    expect.objectContaining({
                        name: "JavaScript",
                    }),
                ])
            );

            const typescript = body.languages.find(
                (language: { name: string }) => language.name === "TypeScript"
            );

            expect(typescript).toBeDefined();

            expect(typescript.percentage).toBe(80);

            expect(typescript.bytes).toBe(80000);

            /*
             * =============================
             * COLLABORATION
             * =============================
             */

            expect(body.collaboration.totalContributors).toBe(2);

            expect(body.collaboration.contributors).toHaveLength(2);

            expect(body.collaboration.concentrationPercentage).toBeCloseTo(66.7, 1);

            /*
             * =============================
             * HEALTH SCORE
             * =============================
             */

            expect(body.projectHealth).toBeDefined();

            expect(body.projectHealth.score).toBeGreaterThanOrEqual(0);

            expect(body.projectHealth.score).toBeLessThanOrEqual(100);

            expect(body.projectHealth.dimensions).toHaveLength(5);
        });

        it("deve buscar commits e linguagens no GitHub", async () => {
            const fetchMock = vi.fn(async (input: string | URL | Request) => {
                const url = String(input);

                if (url.includes("/commits?")) {
                    return jsonResponse(createGitHubCommits());
                }

                if (url.endsWith("/languages")) {
                    return jsonResponse(createGitHubLanguages());
                }

                return jsonResponse({}, 404);
            });

            vi.stubGlobal("fetch", fetchMock);

            const response = await app.inject({
                method: "GET",

                url: "/api/repositories/GabOof/DevPulse/analytics?days=30",
            });

            expect(response.statusCode).toBe(200);

            const urls = fetchMock.mock.calls.map((call) => String(call[0]));

            expect(urls.some((url) => url.includes("/repos/GabOof/DevPulse/commits?"))).toBe(true);

            expect(urls.some((url) => url.endsWith("/repos/GabOof/DevPulse/languages"))).toBe(true);
        });

        it("deve tratar repositório sem commits", async () => {
            const fetchMock = vi.fn(async (input: string | URL | Request) => {
                const url = String(input);

                if (url.includes("/commits?")) {
                    return jsonResponse(
                        {
                            message: "Git Repository is empty.",
                        },
                        409
                    );
                }

                if (url.endsWith("/languages")) {
                    return jsonResponse({});
                }

                return jsonResponse({}, 404);
            });

            vi.stubGlobal("fetch", fetchMock);

            const response = await app.inject({
                method: "GET",

                url: "/api/repositories/GabOof/EmptyRepo/analytics?days=30",
            });

            expect(response.statusCode).toBe(200);

            const body = response.json();

            expect(body.summary.totalCommits).toBe(0);

            expect(body.summary.activeDays).toBe(0);

            expect(body.summary.averageCommitsPerActiveDay).toBe(0);

            expect(body.summary.busiestDay).toBeNull();

            expect(body.commitIntelligence.conventionalCommits).toBe(0);

            expect(body.commitIntelligence.conventionalPercentage).toBe(0);

            expect(body.commitIntelligence.breakingChanges).toBe(0);

            expect(body.collaboration.totalContributors).toBe(0);

            expect(body.languages).toEqual([]);

            expect(body.projectHealth.score).toBe(0);

            expect(body.truncated).toBe(false);
        });

        it("deve retornar 429 quando o GitHub limitar a coleta de analytics", async () => {
            const fetchMock = vi.fn(async () =>
                jsonResponse(
                    {
                        message: "API rate limit exceeded",
                    },

                    403,

                    {
                        "X-RateLimit-Remaining": "0",
                    }
                )
            );

            vi.stubGlobal("fetch", fetchMock);

            const response = await app.inject({
                method: "GET",

                url: "/api/repositories/GabOof/DevPulse/analytics?days=30",
            });

            expect(response.statusCode).toBe(429);
        });

        it("não deve consultar GitHub quando o período for inválido", async () => {
            const fetchMock = vi.fn();

            vi.stubGlobal("fetch", fetchMock);

            const response = await app.inject({
                method: "GET",

                url: "/api/repositories/GabOof/DevPulse/analytics?days=15",
            });

            expect(response.statusCode).toBe(400);

            expect(fetchMock).not.toHaveBeenCalled();
        });
    });
});
