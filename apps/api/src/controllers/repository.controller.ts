import type { FastifyReply, FastifyRequest } from "fastify";

import { GitHubService } from "../services/github.service.js";

interface RepositoryParams {
    owner: string;
    repo: string;
}

const githubService = new GitHubService();

export class RepositoryController {
    async show(
        request: FastifyRequest<{
            Params: RepositoryParams;
        }>,
        reply: FastifyReply
    ) {
        const { owner, repo } = request.params;

        try {
            const repository = await githubService.getRepository(owner, repo);

            return reply.send(repository);
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
