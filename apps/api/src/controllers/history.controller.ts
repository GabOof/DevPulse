import type { FastifyReply, FastifyRequest } from "fastify";

import { GitHubService } from "../services/github.service.js";

import { PersistenceService } from "../services/persistence.service.js";

interface RepositoryParams {
    owner: string;
    repo: string;
}

interface AnalysisQuery {
    days?: string;
}

const githubService = new GitHubService();

const persistenceService = new PersistenceService();

const allowedPeriods = [7, 30, 90];

export class HistoryController {
    async analyze(
        request: FastifyRequest<{
            Params: RepositoryParams;
            Querystring: AnalysisQuery;
        }>,
        reply: FastifyReply
    ) {
        const { owner, repo } = request.params;

        const days = Number(request.query.days ?? 30);

        if (!allowedPeriods.includes(days)) {
            return reply.status(400).send({
                error: "Invalid period",

                message: "O período deve ser 7, 30 ou 90 dias.",
            });
        }

        try {
            /*
             * Overview e Analytics são
             * independentes.
             *
             * Executamos os dois
             * concorrentemente.
             */
            const [repository, analytics] = await Promise.all([
                githubService.getRepository(owner, repo),

                githubService.getRepositoryAnalytics(owner, repo, days),
            ]);

            const snapshot = await persistenceService.saveAnalysis(repository, analytics);

            return reply.status(201).send({
                message: "Análise armazenada com sucesso.",

                snapshot,
            });
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === "REPOSITORY_NOT_FOUND") {
                    return reply.status(404).send({
                        error: "Repository not found",

                        message: `O repositório ${owner}/${repo} não foi encontrado.`,
                    });
                }

                if (error.message === "GITHUB_RATE_LIMIT") {
                    return reply.status(429).send({
                        error: "GitHub rate limit exceeded",

                        message: "O limite da API do GitHub foi atingido.",
                    });
                }
            }

            request.log.error(error);

            return reply.status(500).send({
                error: "Internal server error",

                message: "Não foi possível armazenar a análise.",
            });
        }
    }

    async history(
        request: FastifyRequest<{
            Params: RepositoryParams;
            Querystring: AnalysisQuery;
        }>,
        reply: FastifyReply
    ) {
        const { owner, repo } = request.params;

        let days: number | undefined;

        if (request.query.days !== undefined) {
            days = Number(request.query.days);

            if (!allowedPeriods.includes(days)) {
                return reply.status(400).send({
                    error: "Invalid period",

                    message: "O período deve ser 7, 30 ou 90 dias.",
                });
            }
        }

        try {
            const history = await persistenceService.getHistory(owner, repo, days);

            return reply.send(history);
        } catch (error) {
            request.log.error(error);

            return reply.status(500).send({
                error: "Internal server error",

                message: "Não foi possível consultar o histórico.",
            });
        }
    }
}
