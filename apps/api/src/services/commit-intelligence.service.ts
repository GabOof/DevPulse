import type {
    AnalyzedCommit,
    CommitCategory,
    CommitCategoryStats,
    CommitIntelligence,
    GitHubCommit,
} from "../types/analytics.js";

export class CommitIntelligenceService {
    analyze(commits: GitHubCommit[]): CommitIntelligence {
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
             * A API do GitHub retorna
             * os commits mais recentes
             * primeiro.
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
}
