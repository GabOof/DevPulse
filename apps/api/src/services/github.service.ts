import type { GitHubRepository, RepositoryAnalysis } from "../types/github.js";

import type {
    DailyActivity,
    GitHubCommit,
    GitHubLanguages,
    LanguageUsage,
    RepositoryAnalytics,
} from "../types/analytics.js";

const GITHUB_API_URL = "https://api.github.com";

const MAX_COMMIT_PAGES = 3;
const COMMITS_PER_PAGE = 100;

export class GitHubService {
    private getHeaders(): HeadersInit {
        return {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2026-03-10",
            "User-Agent": "DevPulse",
        };
    }

    async getRepository(owner: string, repo: string): Promise<RepositoryAnalysis> {
        const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}`, {
            headers: this.getHeaders(),
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
        days = 30
    ): Promise<RepositoryAnalytics> {
        const until = new Date();

        const since = new Date();
        since.setUTCDate(since.getUTCDate() - (days - 1));

        since.setUTCHours(0, 0, 0, 0);

        const [commitResult, languages] = await Promise.all([
            this.getCommits(owner, repo, since, until),

            this.getLanguages(owner, repo),
        ]);

        const activity = this.buildDailyActivity(commitResult.commits, since, days);

        const activeDays = activity.filter((day) => day.commits > 0).length;

        const totalCommits = commitResult.commits.length;

        const averageCommitsPerActiveDay =
            activeDays > 0 ? Number((totalCommits / activeDays).toFixed(2)) : 0;

        const busiestDay = this.findBusiestDay(activity);

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

            truncated: commitResult.truncated,
        };
    }

    private async getCommits(
        owner: string,
        repo: string,
        since: Date,
        until: Date
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
                    headers: this.getHeaders(),
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

    private async getLanguages(owner: string, repo: string): Promise<LanguageUsage[]> {
        const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/languages`, {
            headers: this.getHeaders(),
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
