import type { FastifyReply, FastifyRequest } from "fastify";

import { GitHubService } from "../services/github.service.js";

interface AnalyticsParams {
    owner: string;
    repo: string;
}

interface AnalyticsQuery {
    days?: string;
}

const githubService = new GitHubService();

export class AnalyticsController {
    async show(
        request: FastifyRequest<{
            Params: AnalyticsParams;
            Querystring: AnalyticsQuery;
        }>,
        reply: FastifyReply
    ) {
        const { owner, repo } = request.params;

        const days = Number(request.query.days ?? 30);

        const allowedPeriods = [7, 30, 90];

        if (!allowedPeriods.includes(days)) {
            return reply.status(400).send({
                error: "Invalid period",

                message: "O período deve ser 7, 30 ou 90 dias.",
            });
        }

        try {
            const analytics = await githubService.getRepositoryAnalytics(owner, repo, days);

            return reply.send(analytics);
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

                        message: "O limite de requisições da API do GitHub foi atingido.",
                    });
                }
            }

            request.log.error(error);

            return reply.status(500).send({
                error: "Internal server error",

                message: "Não foi possível calcular as métricas do repositório.",
            });
        }
    }
}
