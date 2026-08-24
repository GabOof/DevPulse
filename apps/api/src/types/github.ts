export interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
    description: string | null;
    fork: boolean;

    owner: {
        login: string;
        avatar_url: string;
        html_url: string;
    };

    created_at: string;
    updated_at: string;
    pushed_at: string;

    homepage: string | null;

    size: number;

    stargazers_count: number;
    watchers_count: number;
    forks_count: number;
    open_issues_count: number;

    language: string | null;

    default_branch: string;

    topics?: string[];

    license: {
        name: string;
        spdx_id: string;
    } | null;
}

export interface RepositoryAnalysis {
    id: number;

    name: string;
    fullName: string;
    description: string | null;

    owner: {
        username: string;
        avatarUrl: string;
        profileUrl: string;
    };

    repositoryUrl: string;
    homepage: string | null;

    stats: {
        stars: number;
        forks: number;
        watchers: number;
        openIssues: number;
    };

    language: string | null;

    topics: string[];

    license: {
        name: string;
        spdxId: string;
    } | null;

    createdAt: string;
    updatedAt: string;
    pushedAt: string;

    defaultBranch: string;
}
