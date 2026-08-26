import type {
    CollaborationAnalytics,
    CommitIntelligence,
    HealthDimension,
    ProjectHealthLevel,
    ProjectHealthScore,
} from "../types/analytics.js";

interface HealthScoreInput {
    periodDays: number;

    totalCommits: number;

    activeDays: number;

    commitIntelligence: CommitIntelligence;

    collaboration: CollaborationAnalytics;
}

export class HealthScoreService {
    calculate(input: HealthScoreInput): ProjectHealthScore {
        const dimensions: HealthDimension[] = [
            this.calculateActivity(input),

            this.calculateConsistency(input),

            this.calculateCommitHygiene(input),

            this.calculateChangeClarity(input),

            this.calculateCollaboration(input),
        ];

        const score = Number(
            dimensions.reduce((total, dimension) => total + dimension.weightedScore, 0).toFixed(1)
        );

        return {
            score,

            level: this.getHealthLevel(score),

            dimensions,

            methodology: {
                version: "1.0",

                description:
                    "Heuristic score based on repository activity, consistency, commit-message hygiene, change classification clarity and contributor activity distribution.",
            },
        };
    }

    private calculateActivity(input: HealthScoreInput): HealthDimension {
        /*
         * Consideramos como referência
         * aproximadamente 0.5 commit
         * por dia do período.
         *
         * 30 dias -> referência 15 commits
         * 90 dias -> referência 45 commits
         */
        const targetCommits = Math.max(5, input.periodDays * 0.5);

        const score = this.clamp((input.totalCommits / targetCommits) * 100);

        return this.createDimension("activity", score, 0.25);
    }

    private calculateConsistency(input: HealthScoreInput): HealthDimension {
        /*
         * A referência é atividade
         * em aproximadamente 30% dos
         * dias analisados.
         *
         * Não exigimos commits todos
         * os dias, porque isso não seria
         * uma métrica saudável.
         */
        const targetActiveDays = Math.max(3, Math.ceil(input.periodDays * 0.3));

        const score = this.clamp((input.activeDays / targetActiveDays) * 100);

        return this.createDimension("consistency", score, 0.2);
    }

    private calculateCommitHygiene(input: HealthScoreInput): HealthDimension {
        /*
         * Aqui utilizamos diretamente
         * o percentual de mensagens que
         * seguem Conventional Commits.
         */
        const score = this.clamp(input.commitIntelligence.conventionalPercentage);

        return this.createDimension("commit_hygiene", score, 0.2);
    }

    private calculateChangeClarity(input: HealthScoreInput): HealthDimension {
        if (input.totalCommits === 0) {
            return this.createDimension("change_clarity", 0, 0.15);
        }

        const otherCategory = input.commitIntelligence.categories.find(
            (category) => category.category === "other"
        );

        const otherPercentage = otherCategory?.percentage ?? 0;

        /*
         * Quanto menor o percentual
         * "other", maior a capacidade
         * do DevPulse de compreender
         * semanticamente o histórico.
         */
        const score = this.clamp(100 - otherPercentage);

        return this.createDimension("change_clarity", score, 0.15);
    }

    private calculateCollaboration(input: HealthScoreInput): HealthDimension {
        const { totalContributors, concentrationPercentage } = input.collaboration;

        /*
         * Nenhuma atividade:
         * não existe colaboração
         * mensurável.
         */
        if (input.totalCommits === 0) {
            return this.createDimension("collaboration", 0, 0.2);
        }

        /*
         * Repositórios individuais são
         * perfeitamente legítimos.
         *
         * Por isso um único contribuidor
         * recebe um valor neutro de 70,
         * em vez de uma penalização extrema.
         */
        if (totalContributors <= 1) {
            return this.createDimension("collaboration", 70, 0.2);
        }

        /*
         * Até 40% de concentração no
         * maior contribuidor é considerado
         * distribuição forte.
         *
         * Acima disso aplicamos uma
         * penalização progressiva.
         */
        const excessConcentration = Math.max(0, concentrationPercentage - 40);

        const score = this.clamp(100 - excessConcentration * 1.5);

        return this.createDimension("collaboration", score, 0.2);
    }

    private createDimension(
        key: HealthDimension["key"],
        score: number,
        weight: number
    ): HealthDimension {
        const normalizedScore = Number(this.clamp(score).toFixed(1));

        return {
            key,

            score: normalizedScore,

            weight,

            weightedScore: Number((normalizedScore * weight).toFixed(1)),
        };
    }

    private getHealthLevel(score: number): ProjectHealthLevel {
        if (score >= 85) {
            return "excellent";
        }

        if (score >= 70) {
            return "good";
        }

        if (score >= 50) {
            return "attention";
        }

        return "critical";
    }

    private clamp(value: number): number {
        return Math.min(100, Math.max(0, value));
    }
}
