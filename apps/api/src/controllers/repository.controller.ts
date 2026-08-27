import type { FastifyReply, FastifyRequest } from "fastify";

import { AuthContextService } from "../services/auth-context.service.js";

import { cachedGitHubService } from "../services/cached-github.service.js";

const authContextService = new AuthContextService();

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

interface RepositoryParams {
    owner: string;

    repo: string;
}

interface RepositoryQuery {
    refresh?: boolean;
}

/*
 * =========================================================
 * CONTROLLER
 * =========================================================
 */

export class RepositoryController {
    async show(
        request: FastifyRequest<{
            Params: RepositoryParams;

            Querystring: RepositoryQuery;
        }>,

        reply: FastifyReply
    ) {
        const { owner, repo } = request.params;

        /*
         * O AJV do Fastify converte:
         *
         * ?refresh=true
         *
         * para boolean true.
         */

        const forceRefresh = request.query.refresh ?? false;

        try {
            /*
             * Usuário autenticado:
             *
             * accessToken será usado tanto
             * para GitHub quanto para separar
             * o cache.
             *
             * Usuário anônimo:
             *
             * accessToken será undefined e
             * usaremos cache público.
             */

            const auth = await authContextService.resolveGitHubContext(request);

            const result = await cachedGitHubService.getRepository(
                owner,

                repo,

                auth?.accessToken,

                {
                    forceRefresh,
                }
            );

            /*
             * HIT
             * MISS
             * COALESCED
             */

            reply.header(
                "X-DevPulse-Cache",

                result.status
            );

            /*
             * Evitamos que proxies/browsers
             * criem outro cache HTTP por cima
             * do cache controlado pelo
             * DevPulse.
             *
             * Mais adiante poderemos trocar
             * isso por ETag.
             */

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

                message: "Não foi possível consultar o repositório.",
            });
        }
    }
}
