import type { FastifyReply, FastifyRequest } from "fastify";

import { AuthContextService } from "../services/auth-context.service.js";
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
const authContextService = new AuthContextService();
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
            const auth = await authContextService.requireGitHubContext(request);
            /*
             * Overview e Analytics são
             * independentes.
             *
             * Executamos os dois
             * concorrentemente.
             */
            const [repository, analytics] = await Promise.all([
                githubService.getRepository(owner, repo, auth.accessToken),

                githubService.getRepositoryAnalytics(owner, repo, days, auth.accessToken),
            ]);

            const snapshot = await persistenceService.saveAnalysis(
                repository,
                analytics,
                auth.userId
            );

            return reply.status(201).send({
                message: "Análise armazenada com sucesso.",

                snapshot,
            });
        } catch (error) {
            if (error instanceof Error && error.message === "AUTH_REQUIRED") {
                return reply.status(401).send({
                    error: "Authentication required",

                    message: "Entre com GitHub para acessar seu histórico.",
                });
            }

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

        /*
         * ==========================
         * VALIDAR PERÍODO
         * ==========================
         */

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
            /*
             * ==========================
             * AUTENTICAÇÃO
             * ==========================
             *
             * Histórico é privado.
             *
             * Portanto precisamos saber
             * qual usuário está solicitando
             * os snapshots.
             */

            const user = await authContextService.requireUser(request);

            /*
             * ==========================
             * CONSULTAR HISTÓRICO
             * ==========================
             */

            const history = await persistenceService.getHistory(owner, repo, user.id, days);

            return reply.send(history);
        } catch (error) {
            /*
             * ==========================
             * USUÁRIO NÃO AUTENTICADO
             * ==========================
             */

            if (error instanceof Error && error.message === "AUTH_REQUIRED") {
                return reply.status(401).send({
                    error: "Authentication required",

                    message: "Entre com GitHub para acessar seu histórico.",
                });
            }

            /*
             * ==========================
             * ERRO INTERNO
             * ==========================
             */

            request.log.error(error);

            return reply.status(500).send({
                error: "Internal server error",

                message: "Não foi possível consultar o histórico.",
            });
        }
    }
}
