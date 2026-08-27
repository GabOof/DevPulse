import type { GitHubRepository, RepositoryAnalysis } from "../types/github.js";

import type {
    CollaborationAnalytics,
    CollaborationRisk,
    ContributorActivity,
    DailyActivity,
    GitHubCommit,
    GitHubLanguages,
    LanguageUsage,
    RepositoryAnalytics,
} from "../types/analytics.js";

import { CommitIntelligenceService } from "./commit-intelligence.service.js";
import { githubConditionalCacheService } from "./github-conditional-cache.service.js";
import { githubRateLimitService } from "./github-rate-limit.service.js";
import { HealthScoreService } from "./health-score.service.js";

const GITHUB_API_URL = "https://api.github.com";

const MAX_COMMIT_PAGES = 3;
const COMMITS_PER_PAGE = 100;

export class GitHubService {
    private readonly commitIntelligenceService = new CommitIntelligenceService();
    private readonly healthScoreService = new HealthScoreService();

    private getHeaders(accessToken?: string): HeadersInit {
        const headers: Record<string, string> = {
            Accept: "application/vnd.github+json",

            "X-GitHub-Api-Version": "2026-03-10",

            "User-Agent": "DevPulse",
        };

        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
        }

        return headers;
    }

    private async getJsonWithConditionalCache<T>(
        url: string,

        accessToken?: string
    ): Promise<T> {
        /*
         * =====================================================
         * CONDITIONAL CACHE
         * =====================================================
         */

        const cached = githubConditionalCacheService.get<T>(url, accessToken);

        /*
         * Headers base da API.
         */

        const headers = new Headers(this.getHeaders(accessToken));

        /*
         * Se já conhecemos o ETag dessa
         * representação, pedimos ao GitHub
         * apenas para verificar se mudou.
         */

        if (cached) {
            headers.set("If-None-Match", cached.etag);
        }

        const response = await fetch(url, {
            headers,
        });

        /*
         * Sempre observamos o rate limit,
         * inclusive em 304.
         */

        githubRateLimitService.observe(response.headers, accessToken);

        /*
         * =====================================================
         * 304 NOT MODIFIED
         * =====================================================
         */

        if (response.status === 304) {
            /*
             * Só enviamos If-None-Match quando
             * existia uma entrada local.
             *
             * Esta proteção deixa o helper
             * seguro mesmo se alguma coisa
             * mudar futuramente.
             */

            if (!cached) {
                throw new Error("GITHUB_CONDITIONAL_CACHE_MISS");
            }

            return cached.data;
        }

        /*
         * =====================================================
         * ERRORS
         * =====================================================
         */

        this.handleResponseErrors(response);

        /*
         * =====================================================
         * 200 RESPONSE
         * =====================================================
         */

        const data = (await response.json()) as T;

        const etag = response.headers.get("etag");

        /*
         * Nem todo endpoint é obrigado a
         * fornecer ETag.
         *
         * Só armazenamos quando existir.
         */

        if (etag) {
            githubConditionalCacheService.set(url, etag, data, accessToken);
        }

        return data;
    }

    async getRepository(
        owner: string,
        repo: string,
        accessToken?: string
    ): Promise<RepositoryAnalysis> {
        const url = `${GITHUB_API_URL}/repos/${owner}/${repo}`;

        const data = await this.getJsonWithConditionalCache<GitHubRepository>(url, accessToken);

        return {
            id: data.id,

            name: data.name,
            fullName: data.full_name,
            description: data.description,

            owner: {
                username: data.owner.login,
                avatarUrl: data.owner.avatar_url,
                profileUrl: data.owner.html_url,
            },

            repositoryUrl: data.html_url,
            homepage: data.homepage,

            stats: {
                stars: data.stargazers_count,
                forks: data.forks_count,
                watchers: data.watchers_count,
                openIssues: data.open_issues_count,
            },

            language: data.language,

            topics: data.topics ?? [],

            license: data.license
                ? {
                      name: data.license.name,
                      spdxId: data.license.spdx_id,
                  }
                : null,

            createdAt: data.created_at,
            updatedAt: data.updated_at,
            pushedAt: data.pushed_at,

            defaultBranch: data.default_branch,
        };
    }

    async getRepositoryAnalytics(
        owner: string,
        repo: string,
        days = 30,
        accessToken?: string
    ): Promise<RepositoryAnalytics> {
        const until = new Date();

        const since = new Date();
        since.setUTCDate(since.getUTCDate() - (days - 1));

        since.setUTCHours(0, 0, 0, 0);

        const [commitResult, languages] = await Promise.all([
            this.getCommits(owner, repo, since, until, accessToken),

            this.getLanguages(owner, repo, accessToken),
        ]);

        const activity = this.buildDailyActivity(commitResult.commits, since, days);

        const activeDays = activity.filter((day) => day.commits > 0).length;

        const totalCommits = commitResult.commits.length;

        const averageCommitsPerActiveDay =
            activeDays > 0 ? Number((totalCommits / activeDays).toFixed(2)) : 0;

        const busiestDay = this.findBusiestDay(activity);

        const commitIntelligence = this.commitIntelligenceService.analyze(commitResult.commits);

        const collaboration = this.buildCollaborationAnalytics(commitResult.commits);

        const projectHealth = this.healthScoreService.calculate({
            periodDays: days,

            totalCommits,

            activeDays,

            commitIntelligence,

            collaboration,
        });

        return {
            period: {
                days,
                since: since.toISOString(),
                until: until.toISOString(),
            },

            summary: {
                totalCommits,
                activeDays,
                averageCommitsPerActiveDay,
                busiestDay,
            },

            activity,

            languages,

            commitIntelligence,

            collaboration,

            projectHealth,

            truncated: commitResult.truncated,
        };
    }

    private async getCommits(
        owner: string,
        repo: string,
        since: Date,
        until: Date,
        accessToken?: string
    ): Promise<{
        commits: GitHubCommit[];
        truncated: boolean;
    }> {
        const commits: GitHubCommit[] = [];

        let lastPageSize = 0;

        for (let page = 1; page <= MAX_COMMIT_PAGES; page++) {
            const params = new URLSearchParams({
                since: since.toISOString(),
                until: until.toISOString(),
                per_page: COMMITS_PER_PAGE.toString(),
                page: page.toString(),
            });

            const response = await fetch(
                `${GITHUB_API_URL}/repos/${owner}/${repo}/commits?${params.toString()}`,
                {
                    headers: this.getHeaders(accessToken),
                }
            );

            githubRateLimitService.observe(response.headers, accessToken);

            /*
             * Um repositório Git vazio pode
             * retornar HTTP 409.
             */
            if (response.status === 409) {
                return {
                    commits: [],
                    truncated: false,
                };
            }

            this.handleResponseErrors(response);

            const pageCommits = (await response.json()) as GitHubCommit[];

            commits.push(...pageCommits);

            lastPageSize = pageCommits.length;

            if (pageCommits.length < COMMITS_PER_PAGE) {
                break;
            }
        }

        return {
            commits,

            truncated:
                commits.length === MAX_COMMIT_PAGES * COMMITS_PER_PAGE &&
                lastPageSize === COMMITS_PER_PAGE,
        };
    }

    private async getLanguages(
        owner: string,
        repo: string,
        accessToken?: string
    ): Promise<LanguageUsage[]> {
        const url = `${GITHUB_API_URL}/repos/${owner}/${repo}/languages`;

        const data = await this.getJsonWithConditionalCache<GitHubLanguages>(url, accessToken);

        const totalBytes = Object.values(data).reduce((total, bytes) => total + bytes, 0);

        if (totalBytes === 0) {
            return [];
        }

        return Object.entries(data)
            .map(([name, bytes]) => ({
                name,
                bytes,

                percentage: Number(((bytes / totalBytes) * 100).toFixed(2)),
            }))
            .sort((a, b) => b.percentage - a.percentage);
    }

    private buildDailyActivity(
        commits: GitHubCommit[],
        since: Date,
        days: number
    ): DailyActivity[] {
        const activityMap = new Map<string, number>();

        for (let index = 0; index < days; index++) {
            const date = new Date(since);

            date.setUTCDate(since.getUTCDate() + index);

            const key = date.toISOString().slice(0, 10);

            activityMap.set(key, 0);
        }

        for (const commit of commits) {
            const commitDate = commit.commit.author?.date ?? commit.commit.committer?.date;

            if (!commitDate) {
                continue;
            }

            const key = commitDate.slice(0, 10);

            if (!activityMap.has(key)) {
                continue;
            }

            activityMap.set(key, (activityMap.get(key) ?? 0) + 1);
        }

        return Array.from(activityMap.entries()).map(([date, commitCount]) => ({
            date,
            commits: commitCount,
        }));
    }

    private findBusiestDay(activity: DailyActivity[]): {
        date: string;
        commits: number;
    } | null {
        const activeDays = activity.filter((day) => day.commits > 0);

        if (activeDays.length === 0) {
            return null;
        }

        return activeDays.reduce((busiest, current) =>
            current.commits > busiest.commits ? current : busiest
        );
    }

    private buildCollaborationAnalytics(commits: GitHubCommit[]): CollaborationAnalytics {
        const contributorMap = new Map<
            string,
            {
                id: string;
                name: string;
                username: string | null;
                avatarUrl: string | null;
                profileUrl: string | null;
                commits: number;
            }
        >();

        for (const commit of commits) {
            const username = commit.author?.login ?? null;

            const name = commit.commit.author?.name ?? username ?? "Autor desconhecido";

            /*
             * Quando existe uma conta GitHub
             * vinculada ao commit, ela será
             * nossa identidade principal.
             *
             * Caso contrário, usamos o nome
             * armazenado no commit.
             */
            const id = username
                ? `github:${username.toLowerCase()}`
                : `name:${name.trim().toLowerCase()}`;

            const existing = contributorMap.get(id);

            if (existing) {
                existing.commits += 1;

                continue;
            }

            contributorMap.set(id, {
                id,

                name,

                username,

                avatarUrl: commit.author?.avatar_url ?? null,

                profileUrl: username ? `https://github.com/${username}` : null,

                commits: 1,
            });
        }

        const totalCommits = commits.length;

        const contributors: ContributorActivity[] = Array.from(contributorMap.values())
            .map((contributor) => ({
                ...contributor,

                percentage:
                    totalCommits > 0
                        ? Number(((contributor.commits / totalCommits) * 100).toFixed(1))
                        : 0,
            }))
            .sort((a, b) => b.commits - a.commits);

        const topContributor = contributors[0] ?? null;

        const concentrationPercentage = topContributor?.percentage ?? 0;

        return {
            totalContributors: contributors.length,

            topContributor,

            concentrationPercentage,

            concentrationRisk: this.calculateConcentrationRisk(concentrationPercentage),

            contributors,
        };
    }

    private calculateConcentrationRisk(percentage: number): CollaborationRisk {
        if (percentage >= 80) {
            return "very_high";
        }

        if (percentage >= 60) {
            return "high";
        }

        if (percentage >= 40) {
            return "medium";
        }

        return "low";
    }

    private handleResponseErrors(response: Response): void {
        if (response.status === 404) {
            throw new Error("REPOSITORY_NOT_FOUND");
        }

        if (response.status === 429) {
            throw new Error("GITHUB_RATE_LIMIT");
        }

        if (response.status === 403) {
            const remaining = response.headers.get("x-ratelimit-remaining");

            const retryAfter = response.headers.get("retry-after");

            /*
             * Primary rate limit:
             *
             * x-ratelimit-remaining = 0
             *
             * Secondary rate limit:
             *
             * normalmente pode fornecer Retry-After.
             */

            if (remaining === "0" || retryAfter !== null) {
                throw new Error("GITHUB_RATE_LIMIT");
            }

            throw new Error("GITHUB_FORBIDDEN");
        }

        if (!response.ok) {
            throw new Error("GITHUB_API_ERROR");
        }
    }
}
