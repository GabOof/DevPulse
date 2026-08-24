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

export type AnalyticsPeriod = 7 | 30 | 90;
