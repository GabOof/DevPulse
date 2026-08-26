import type { GitHubRepository, RepositoryAnalysis } from "../types/github.js";

import type {
    AnalyzedCommit,
    CollaborationAnalytics,
    CollaborationRisk,
    CommitCategory,
    CommitCategoryStats,
    CommitIntelligence,
    ContributorActivity,
    DailyActivity,
    GitHubCommit,
    GitHubLanguages,
    LanguageUsage,
    RepositoryAnalytics,
} from "../types/analytics.js";

import { HealthScoreService } from "./health-score.service.js";

const GITHUB_API_URL = "https://api.github.com";

const MAX_COMMIT_PAGES = 3;
const COMMITS_PER_PAGE = 100;

export class GitHubService {
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

    async getRepository(
        owner: string,
        repo: string,
        accessToken?: string
    ): Promise<RepositoryAnalysis> {
        const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}`, {
            headers: this.getHeaders(accessToken),
        });

        this.handleResponseErrors(response);

        const data = (await response.json()) as GitHubRepository;

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

        const commitIntelligence = this.buildCommitIntelligence(commitResult.commits);

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
        const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/languages`, {
            headers: this.getHeaders(accessToken),
        });

        this.handleResponseErrors(response);

        const data = (await response.json()) as GitHubLanguages;

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

    private buildCommitIntelligence(commits: GitHubCommit[]): CommitIntelligence {
        const analyzedCommits = commits.map((commit) => this.analyzeCommit(commit));

        const conventionalCommits = analyzedCommits.filter((commit) => commit.conventional).length;

        const breakingChanges = analyzedCommits.filter((commit) => commit.breakingChange).length;

        const categoryOrder: CommitCategory[] = [
            "feature",
            "fix",
            "refactor",
            "docs",
            "test",
            "chore",
            "other",
        ];

        const categories: CommitCategoryStats[] = categoryOrder.map((category) => {
            const count = analyzedCommits.filter((commit) => commit.category === category).length;

            const percentage =
                commits.length > 0 ? Number(((count / commits.length) * 100).toFixed(1)) : 0;

            return {
                category,
                count,
                percentage,
            };
        });

        return {
            conventionalCommits,

            conventionalPercentage:
                commits.length > 0
                    ? Number(((conventionalCommits / commits.length) * 100).toFixed(1))
                    : 0,

            breakingChanges,

            categories,

            /*
             * A API do GitHub retorna os
             * commits mais recentes primeiro.
             *
             * Não precisamos enviar centenas
             * de mensagens para o frontend.
             */
            recentCommits: analyzedCommits.slice(0, 10),
        };
    }

    private analyzeCommit(commit: GitHubCommit): AnalyzedCommit {
        const message = commit.commit.message;

        const firstLine = message.split("\n")[0].trim();

        const classification = this.classifyCommit(message);

        const author = commit.commit.author?.name ?? commit.author?.login ?? "Autor desconhecido";

        const date = commit.commit.author?.date ?? commit.commit.committer?.date ?? "";

        return {
            sha: commit.sha,

            shortSha: commit.sha.slice(0, 7),

            message: firstLine,

            category: classification.category,

            conventional: classification.conventional,

            breakingChange: classification.breakingChange,

            author,

            authorUsername: commit.author?.login ?? null,

            date,

            url: commit.html_url,
        };
    }

    private classifyCommit(message: string): {
        category: CommitCategory;
        conventional: boolean;
        breakingChange: boolean;
    } {
        const firstLine = message.split("\n")[0].trim();

        const conventionalMatch = firstLine.match(/^([a-zA-Z]+)(?:\([^)]+\))?(!)?:\s+.+/);

        const breakingChange =
            Boolean(conventionalMatch?.[2]) || /(^|\n)BREAKING[ -]CHANGE:\s*/i.test(message);

        if (conventionalMatch) {
            const type = conventionalMatch[1].toLowerCase();

            return {
                category: this.mapConventionalType(type),

                conventional: true,

                breakingChange,
            };
        }

        return {
            category: this.classifyByKeywords(firstLine),

            conventional: false,

            breakingChange,
        };
    }

    private mapConventionalType(type: string): CommitCategory {
        switch (type) {
            case "feat":
            case "feature":
                return "feature";

            case "fix":
            case "bugfix":
                return "fix";

            case "refactor":
            case "perf":
            case "style":
                return "refactor";

            case "docs":
            case "doc":
                return "docs";

            case "test":
            case "tests":
                return "test";

            case "chore":
            case "build":
            case "ci":
                return "chore";

            default:
                return "other";
        }
    }

    private classifyByKeywords(message: string): CommitCategory {
        const normalized = message.toLowerCase();

        const rules: Array<{
            category: CommitCategory;
            patterns: RegExp[];
        }> = [
            {
                category: "fix",

                patterns: [
                    /\bfix(ed)?\b/i,
                    /\bbug\b/i,
                    /\bresolve(d)?\b/i,
                    /\bcorrect(ed)?\b/i,
                    /corrig/i,
                    /\berro\b/i,
                    /\bfalha\b/i,
                ],
            },

            {
                category: "feature",

                patterns: [
                    /\bfeature\b/i,
                    /\badd(ed)?\b/i,
                    /\bimplement(ed)?\b/i,
                    /\bcreat(ed|e)?\b/i,
                    /adicion/i,
                    /implement/i,
                    /\bcria(r|do|da)?\b/i,
                    /\bnovo\b/i,
                    /\bnova\b/i,
                ],
            },

            {
                category: "refactor",

                patterns: [
                    /\brefactor/i,
                    /\bcleanup\b/i,
                    /\bsimplif/i,
                    /\brestructur/i,
                    /reorganiz/i,
                    /otimiz/i,
                ],
            },

            {
                category: "docs",

                patterns: [/\bdocs?\b/i, /\breadme\b/i, /\bdocumentation\b/i, /documenta/i],
            },

            {
                category: "test",

                patterns: [
                    /\btests?\b/i,
                    /\bspec\b/i,
                    /\bcoverage\b/i,
                    /\bteste\b/i,
                    /\btestes\b/i,
                ],
            },

            {
                category: "chore",

                patterns: [
                    /\bchore\b/i,
                    /\bbuild\b/i,
                    /\bci\b/i,
                    /\bdeps?\b/i,
                    /\bdependenc/i,
                    /\bconfig\b/i,
                    /\bbump\b/i,
                    /\bmerge\b/i,
                    /\brelease\b/i,
                ],
            },
        ];

        for (const rule of rules) {
            const matched = rule.patterns.some((pattern) => pattern.test(normalized));

            if (matched) {
                return rule.category;
            }
        }

        return "other";
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

        if (response.status === 403 || response.status === 429) {
            throw new Error("GITHUB_RATE_LIMIT");
        }

        if (!response.ok) {
            throw new Error("GITHUB_API_ERROR");
        }
    }
}
