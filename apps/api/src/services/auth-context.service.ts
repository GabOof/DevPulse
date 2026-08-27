import type { FastifyRequest } from "fastify";

import { env } from "../config/env.js";

import { GitHubAuthService } from "./github-auth.service.js";

import { SessionService } from "./session.service.js";

/*
 * =========================================================
 * SERVICES
 * =========================================================
 */

const sessionService = new SessionService();

const githubAuthService = new GitHubAuthService();

/*
 * =========================================================
 * AUTH CONTEXT SERVICE
 * =========================================================
 */

export class AuthContextService {
    /*
     * =====================================================
     * RESOLVE USER
     * =====================================================
     *
     * Tenta recuperar o usuário associado à sessão.
     *
     * Retorna null quando:
     *
     * - não existe cookie;
     * - sessão expirou;
     * - token de sessão não é válido.
     */

    async resolveUser(request: FastifyRequest) {
        const sessionToken = request.cookies[env.auth.sessionCookieName];

        if (!sessionToken) {
            return null;
        }

        return sessionService.findUserByToken(sessionToken);
    }

    /*
     * =====================================================
     * REQUIRE USER
     * =====================================================
     */

    async requireUser(request: FastifyRequest) {
        const user = await this.resolveUser(request);

        if (!user) {
            throw new Error("AUTH_REQUIRED");
        }

        return user;
    }

    /*
     * =====================================================
     * RESOLVE GITHUB CONTEXT
     * =====================================================
     *
     * Além do usuário, recupera um access
     * token válido do GitHub.
     *
     * GitHubAuthService é responsável por:
     *
     * - descriptografar tokens;
     * - verificar expiração;
     * - renovar access token quando necessário;
     * - persistir token renovado.
     */

    async resolveGitHubContext(request: FastifyRequest) {
        const user = await this.resolveUser(request);

        if (!user) {
            return null;
        }

        const accessToken = await githubAuthService.getValidAccessToken(user.id);

        return {
            user,

            userId: user.id,

            accessToken,
        };
    }

    /*
     * =====================================================
     * REQUIRE GITHUB CONTEXT
     * =====================================================
     */

    async requireGitHubContext(request: FastifyRequest) {
        const context = await this.resolveGitHubContext(request);

        if (!context) {
            throw new Error("AUTH_REQUIRED");
        }

        return context;
    }
}
