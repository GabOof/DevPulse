import { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

import type { RepositoryAnalytics } from "../types/analytics.js";
import type { RepositoryAnalysis } from "../types/github.js";

export class PersistenceService {
    private toJson(value: unknown): Prisma.InputJsonValue {
        return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    }

    async saveAnalysis(repository: RepositoryAnalysis, analytics: RepositoryAnalytics) {
        /*
         * Primeiro garantimos que o
         * repositório exista no banco.
         *
         * githubId é único, então podemos
         * usar upsert com segurança.
         */
        const storedRepository = await prisma.repository.upsert({
            where: {
                githubId: BigInt(repository.id),
            },

            update: {
                owner: repository.owner.username,

                name: repository.name,

                fullName: repository.fullName,

                repositoryUrl: repository.repositoryUrl,
            },

            create: {
                githubId: BigInt(repository.id),

                owner: repository.owner.username,

                name: repository.name,

                fullName: repository.fullName,

                repositoryUrl: repository.repositoryUrl,
            },
        });

        const busiestDay = analytics.summary.busiestDay;

        const snapshot = await prisma.analysisSnapshot.create({
            data: {
                repositoryId: storedRepository.id,

                periodDays: analytics.period.days,

                totalCommits: analytics.summary.totalCommits,

                activeDays: analytics.summary.activeDays,

                averageCommitsPerActiveDay: analytics.summary.averageCommitsPerActiveDay,

                busiestDayDate: busiestDay ? new Date(`${busiestDay.date}T00:00:00.000Z`) : null,

                busiestDayCommits: busiestDay?.commits ?? null,

                stars: repository.stats.stars,

                forks: repository.stats.forks,

                watchers: repository.stats.watchers,

                openIssues: repository.stats.openIssues,

                conventionalPercentage: analytics.commitIntelligence.conventionalPercentage,

                breakingChanges: analytics.commitIntelligence.breakingChanges,

                totalContributors: analytics.collaboration.totalContributors,

                concentrationPercentage: analytics.collaboration.concentrationPercentage,

                concentrationRisk: analytics.collaboration.concentrationRisk,

                languages: this.toJson(analytics.languages),

                categories: this.toJson(analytics.commitIntelligence.categories),

                activity: this.toJson(analytics.activity),

                contributors: this.toJson(analytics.collaboration.contributors),

                truncated: analytics.truncated,
            },
        });

        /*
         * Não retornamos o model Repository
         * diretamente porque githubId é
         * BigInt e BigInt não é serializável
         * diretamente em JSON.
         */
        return {
            id: snapshot.id,

            repository: {
                id: storedRepository.id,

                githubId: storedRepository.githubId.toString(),

                fullName: storedRepository.fullName,
            },

            periodDays: snapshot.periodDays,

            analyzedAt: snapshot.analyzedAt,

            summary: {
                totalCommits: snapshot.totalCommits,

                activeDays: snapshot.activeDays,

                conventionalPercentage: snapshot.conventionalPercentage,

                totalContributors: snapshot.totalContributors,

                concentrationPercentage: snapshot.concentrationPercentage,
            },
        };
    }

    async getHistory(owner: string, repo: string, days?: number) {
        const fullName = `${owner}/${repo}`;

        const repository = await prisma.repository.findFirst({
            where: {
                fullName: {
                    equals: fullName,
                    mode: "insensitive",
                },
            },
        });

        if (!repository) {
            return {
                repository: fullName,
                history: [],
            };
        }

        const snapshots = await prisma.analysisSnapshot.findMany({
            where: {
                repositoryId: repository.id,

                ...(days
                    ? {
                          periodDays: days,
                      }
                    : {}),
            },

            orderBy: {
                analyzedAt: "asc",
            },

            take: 100,
        });

        return {
            repository: repository.fullName,

            history: snapshots.map((snapshot) => ({
                id: snapshot.id,

                periodDays: snapshot.periodDays,

                analyzedAt: snapshot.analyzedAt,

                totalCommits: snapshot.totalCommits,

                activeDays: snapshot.activeDays,

                averageCommitsPerActiveDay: snapshot.averageCommitsPerActiveDay,

                stars: snapshot.stars,

                forks: snapshot.forks,

                openIssues: snapshot.openIssues,

                conventionalPercentage: snapshot.conventionalPercentage,

                breakingChanges: snapshot.breakingChanges,

                totalContributors: snapshot.totalContributors,

                concentrationPercentage: snapshot.concentrationPercentage,

                concentrationRisk: snapshot.concentrationRisk,

                truncated: snapshot.truncated,
            })),
        };
    }
}
