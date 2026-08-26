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

export type CommitCategory = "feature" | "fix" | "refactor" | "docs" | "test" | "chore" | "other";

export interface CommitCategoryStats {
    category: CommitCategory;
    count: number;
    percentage: number;
}

export interface AnalyzedCommit {
    sha: string;
    shortSha: string;

    message: string;

    category: CommitCategory;

    conventional: boolean;
    breakingChange: boolean;

    author: string;
    authorUsername: string | null;

    date: string;

    url: string;
}

export interface CommitIntelligence {
    conventionalCommits: number;
    conventionalPercentage: number;

    breakingChanges: number;

    categories: CommitCategoryStats[];

    recentCommits: AnalyzedCommit[];
}

export type CollaborationRisk = "low" | "medium" | "high" | "very_high";

export interface ContributorActivity {
    id: string;

    name: string;
    username: string | null;

    avatarUrl: string | null;
    profileUrl: string | null;

    commits: number;
    percentage: number;
}

export interface CollaborationAnalytics {
    totalContributors: number;

    topContributor: ContributorActivity | null;

    concentrationPercentage: number;

    concentrationRisk: CollaborationRisk;

    contributors: ContributorActivity[];
}

export interface AnalysisHistoryItem {
    id: string;

    periodDays: number;
    analyzedAt: string;

    totalCommits: number;
    activeDays: number;
    averageCommitsPerActiveDay: number;

    stars: number;
    forks: number;
    openIssues: number;

    conventionalPercentage: number;
    breakingChanges: number;

    totalContributors: number;

    concentrationPercentage: number;
    concentrationRisk: CollaborationRisk;

    truncated: boolean;
}

export interface RepositoryHistory {
    repository: string;
    history: AnalysisHistoryItem[];
}

export interface SavedAnalysisResponse {
    message: string;

    snapshot: {
        id: string;

        repository: {
            id: string;
            githubId: string;
            fullName: string;
        };

        periodDays: number;
        analyzedAt: string;

        summary: {
            totalCommits: number;
            activeDays: number;
            conventionalPercentage: number;
            totalContributors: number;
            concentrationPercentage: number;
        };
    };
}

export type HealthDimensionKey =
    | "activity"
    | "consistency"
    | "commit_hygiene"
    | "change_clarity"
    | "collaboration";

export type ProjectHealthLevel = "excellent" | "good" | "attention" | "critical";

export interface HealthDimension {
    key: HealthDimensionKey;

    score: number;

    weight: number;

    weightedScore: number;
}

export interface ProjectHealthScore {
    score: number;

    level: ProjectHealthLevel;

    dimensions: HealthDimension[];

    methodology: {
        version: string;

        description: string;
    };
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

    commitIntelligence: CommitIntelligence;

    collaboration: CollaborationAnalytics;

    projectHealth: ProjectHealthScore;

    truncated: boolean;
}

export type AnalyticsPeriod = 7 | 30 | 90;
