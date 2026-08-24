export interface GitHubCommit {
    sha: string;
    html_url: string;

    commit: {
        message: string;

        author: {
            name: string;
            date: string;
        } | null;

        committer: {
            name: string;
            date: string;
        } | null;
    };

    author: {
        login: string;
        avatar_url: string;
    } | null;
}

export type GitHubLanguages = Record<string, number>;

export interface DailyActivity {
    date: string;
    commits: number;
}

export interface LanguageUsage {
    name: string;
    bytes: number;
    percentage: number;
}

export interface RepositoryAnalytics {
    period: {
        days: number;
        since: string;
        until: string;
    };

    summary: {
        totalCommits: number;
        activeDays: number;
        averageCommitsPerActiveDay: number;

        busiestDay: {
            date: string;
            commits: number;
        } | null;
    };

    activity: DailyActivity[];

    languages: LanguageUsage[];

    truncated: boolean;
}
