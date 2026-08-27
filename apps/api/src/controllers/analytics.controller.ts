import type { FastifyReply, FastifyRequest } from "fastify";

import { AuthContextService } from "../services/auth-context.service.js";

import { cachedGitHubService } from "../services/cached-github.service.js";

import { applyGitHubMetaHeaders } from "../http/github-response-meta.js";

const authContextService = new AuthContextService();

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

interface AnalyticsParams {
    owner: string;

    repo: string;
}

interface AnalyticsQuery {
    days?: number;

    refresh?: boolean;
}

/*
 * =========================================================
 * CONTROLLER
 * =========================================================
 */

export class AnalyticsController {
    async show(
        request: FastifyRequest<{
            Params: AnalyticsParams;

            Querystring: AnalyticsQuery;
        }>,

        reply: FastifyReply
    ) {
        const { owner, repo } = request.params;

        /*
         * O JSON Schema já garante que
         * será 7, 30 ou 90.
         *
         * Mantemos a validação abaixo
         * como defesa adicional.
         */

        const days = Number(request.query.days ?? 30);

        const forceRefresh = request.query.refresh ?? false;

        const allowedPeriods = [7, 30, 90];

        if (!allowedPeriods.includes(days)) {
            return reply.status(400).send({
                error: "Invalid period",

                message: "O período deve ser 7, 30 ou 90 dias.",
            });
        }

        try {
            const auth = await authContextService.resolveGitHubContext(request);

            const result = await cachedGitHubService.getRepositoryAnalytics(
                owner,

                repo,

                days,

                auth?.accessToken,

                {
                    forceRefresh,
                }
            );

            reply.header(
                "X-DevPulse-Cache",

                result.status
            );

            applyGitHubMetaHeaders(reply, auth?.accessToken);

            reply.header(
                "Cache-Control",

                "no-store"
            );

            return reply.send(result.value);
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
