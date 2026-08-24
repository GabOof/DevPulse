export interface Repository {
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
