import type { GitHubRepository, RepositoryAnalysis } from "../types/github.js";

const GITHUB_API_URL = "https://api.github.com";

export class GitHubService {
    async getRepository(owner: string, repo: string): Promise<RepositoryAnalysis> {
        const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}`, {
            headers: {
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2026-03-10",
                "User-Agent": "DevPulse",
            },
        });

        if (response.status === 404) {
            throw new Error("REPOSITORY_NOT_FOUND");
        }

        if (response.status === 403) {
            throw new Error("GITHUB_RATE_LIMIT");
        }

        if (!response.ok) {
            throw new Error("GITHUB_API_ERROR");
        }

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
}
