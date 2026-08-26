import { describe, expect, it } from "vitest";

import { HealthScoreService } from "../health-score.service.js";

import type { CollaborationAnalytics, CommitIntelligence } from "../../types/analytics.js";

const service = new HealthScoreService();

function createCommitIntelligence(
    conventionalPercentage = 80,
    otherPercentage = 10
): CommitIntelligence {
    return {
        conventionalCommits: 8,

        conventionalPercentage,

        breakingChanges: 0,

        categories: [
            {
                category: "feature",
                count: 5,
                percentage: 90 - otherPercentage,
            },

            {
                category: "fix",
                count: 0,
                percentage: 0,
            },

            {
                category: "refactor",
                count: 0,
                percentage: 0,
            },

            {
                category: "docs",
                count: 0,
                percentage: 0,
            },

            {
                category: "test",
                count: 0,
                percentage: 0,
            },

            {
                category: "chore",
                count: 0,
                percentage: 0,
            },

            {
                category: "other",
                count: 1,
                percentage: otherPercentage,
            },
        ],

        recentCommits: [],
    };
}

function createCollaboration(
    totalContributors = 1,
    concentrationPercentage = 100
): CollaborationAnalytics {
    return {
        totalContributors,

        topContributor: null,

        concentrationPercentage,

        concentrationRisk:
            concentrationPercentage >= 80
                ? "very_high"
                : concentrationPercentage >= 60
                  ? "high"
                  : concentrationPercentage >= 40
                    ? "medium"
                    : "low",

        contributors: [],
    };
}

describe("HealthScoreService", () => {
    it("deve retornar score zero quando não existe atividade", () => {
        const result = service.calculate({
            periodDays: 30,

            totalCommits: 0,

            activeDays: 0,

            commitIntelligence: createCommitIntelligence(0, 0),

            collaboration: createCollaboration(0, 0),
        });

        expect(result.score).toBe(0);

        expect(result.level).toBe("critical");
    });

    it("deve limitar activity em 100 pontos", () => {
        const result = service.calculate({
            periodDays: 30,

            totalCommits: 500,

            activeDays: 10,

            commitIntelligence: createCommitIntelligence(),

            collaboration: createCollaboration(),
        });

        const activity = result.dimensions.find((dimension) => dimension.key === "activity");

        expect(activity?.score).toBe(100);
    });

    it("deve atribuir baseline neutro para projeto individual", () => {
        const result = service.calculate({
            periodDays: 30,

            totalCommits: 20,

            activeDays: 10,

            commitIntelligence: createCommitIntelligence(),

            collaboration: createCollaboration(1, 100),
        });

        const collaboration = result.dimensions.find(
            (dimension) => dimension.key === "collaboration"
        );

        expect(collaboration?.score).toBe(70);
    });

    it("deve dar pontuação alta para colaboração distribuída", () => {
        const result = service.calculate({
            periodDays: 30,

            totalCommits: 30,

            activeDays: 12,

            commitIntelligence: createCommitIntelligence(),

            collaboration: createCollaboration(3, 40),
        });

        const collaboration = result.dimensions.find(
            (dimension) => dimension.key === "collaboration"
        );

        expect(collaboration?.score).toBe(100);
    });

    it("deve penalizar alta concentração de contribuições", () => {
        const result = service.calculate({
            periodDays: 30,

            totalCommits: 30,

            activeDays: 12,

            commitIntelligence: createCommitIntelligence(),

            collaboration: createCollaboration(3, 90),
        });

        const collaboration = result.dimensions.find(
            (dimension) => dimension.key === "collaboration"
        );

        expect(collaboration?.score).toBe(25);
    });

    it("deve calcular change clarity usando percentual de other", () => {
        const result = service.calculate({
            periodDays: 30,

            totalCommits: 20,

            activeDays: 10,

            commitIntelligence: createCommitIntelligence(80, 25),

            collaboration: createCollaboration(),
        });

        const clarity = result.dimensions.find((dimension) => dimension.key === "change_clarity");

        expect(clarity?.score).toBe(75);
    });

    it("deve manter o score final entre 0 e 100", () => {
        const result = service.calculate({
            periodDays: 30,

            totalCommits: 999,

            activeDays: 999,

            commitIntelligence: createCommitIntelligence(100, 0),

            collaboration: createCollaboration(5, 20),
        });

        expect(result.score).toBeGreaterThanOrEqual(0);

        expect(result.score).toBeLessThanOrEqual(100);
    });
});
