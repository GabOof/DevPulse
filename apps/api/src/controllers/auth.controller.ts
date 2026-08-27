import { timingSafeEqual } from "node:crypto";

import type { FastifyReply, FastifyRequest } from "fastify";

import { env, isProduction } from "../config/env.js";

import { EncryptionService } from "../services/encryption.service.js";

import { GitHubAuthService } from "../services/github-auth.service.js";

import { SessionService } from "../services/session.service.js";

import type { OAuthTransaction } from "../types/auth.js";

/*
 * =========================================================
 * SERVICES
 * =========================================================
 */

const githubAuthService = new GitHubAuthService();

const sessionService = new SessionService();

const encryptionService = new EncryptionService();

/*
 * =========================================================
 * OAUTH CONFIGURATION
 * =========================================================
 */

const OAUTH_COOKIE_NAME = "devpulse_oauth";

const OAUTH_TTL_SECONDS = 10 * 60;

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

interface CallbackQuery {
    code?: string;

    state?: string;

    error?: string;

    error_description?: string;
}

/*
 * =========================================================
 * COOKIE HELPERS
 * =========================================================
 */

function getSessionCookieName(): string {
    return env.auth.sessionCookieName;
}

/*
 * Cookie temporário utilizado apenas
 * durante o fluxo OAuth.
 */

function getOAuthCookieOptions() {
    return {
        path: "/api/auth/github",

        httpOnly: true,

        sameSite: "lax" as const,

        secure: isProduction(),

        maxAge: OAUTH_TTL_SECONDS,
    };
}

/*
 * Cookie responsável pela sessão
 * autenticada do usuário.
 */

function getSessionCookieOptions(expires: Date) {
    return {
        path: "/",

        httpOnly: true,

        sameSite: "lax" as const,

        secure: isProduction(),

        expires,
    };
}

/*
 * =========================================================
 * SAFE STRING COMPARISON
 * =========================================================
 *
 * Usamos timingSafeEqual para comparar
 * o state OAuth e reduzir diferenças
 * temporais observáveis.
 */

function safeCompare(
    left: string,

    right: string
): boolean {
    const leftBuffer = Buffer.from(left);

    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
}

/*
 * =========================================================
 * AUTH CONTROLLER
 * =========================================================
 */

export class AuthController {
    /*
     * =====================================================
     * GITHUB LOGIN
     * =====================================================
     *
     * Inicia o fluxo OAuth.
     *
     * GitHubAuthService cria:
     *
     * - state;
     * - PKCE code verifier;
     * - authorization URL.
     *
     * A transação é criptografada antes
     * de ser armazenada no cookie.
     */

    async github(
        _request: FastifyRequest,

        reply: FastifyReply
    ) {
        const { state, codeVerifier, authorizationUrl } =
            githubAuthService.createAuthorizationRequest();

        const transaction: OAuthTransaction = {
            state,

            codeVerifier,

            expiresAt: Date.now() + OAUTH_TTL_SECONDS * 1000,
        };

        const encryptedTransaction = encryptionService.encrypt(JSON.stringify(transaction));

        reply.setCookie(
            OAUTH_COOKIE_NAME,

            encryptedTransaction,

            getOAuthCookieOptions()
        );

        return reply.redirect(authorizationUrl);
    }

    /*
     * =====================================================
     * GITHUB CALLBACK
     * =====================================================
     */

    async callback(
        request: FastifyRequest<{
            Querystring: CallbackQuery;
        }>,

        reply: FastifyReply
    ) {
        const frontendUrl = env.frontendUrl;

        const { code, state, error } = request.query;

        /*
         * =================================================
         * GITHUB DENIED ACCESS
         * =================================================
         */

        if (error) {
            return reply.redirect(`${frontendUrl}/?auth=denied`);
        }

        /*
         * =================================================
         * INVALID CALLBACK
         * =================================================
         */

        if (!code || !state) {
            return reply.redirect(`${frontendUrl}/?auth=invalid`);
        }

        /*
         * =================================================
         * OAUTH TRANSACTION COOKIE
         * =================================================
         */

        const encryptedTransaction = request.cookies[OAUTH_COOKIE_NAME];

        if (!encryptedTransaction) {
            return reply.redirect(`${frontendUrl}/?auth=expired`);
        }

        /*
         * Cookie OAuth é one-shot.
         *
         * Depois que o callback começa
         * a ser processado, ele não deve
         * ser reutilizado.
         */

        reply.clearCookie(
            OAUTH_COOKIE_NAME,

            {
                path: "/api/auth/github",

                httpOnly: true,

                sameSite: "lax",

                secure: isProduction(),
            }
        );

        /*
         * =================================================
         * DECRYPT OAUTH TRANSACTION
         * =================================================
         */

        let transaction: OAuthTransaction;

        try {
            const decrypted = encryptionService.decrypt(encryptedTransaction);

            transaction = JSON.parse(decrypted) as OAuthTransaction;
        } catch {
            return reply.redirect(`${frontendUrl}/?auth=invalid`);
        }

        /*
         * =================================================
         * TRANSACTION EXPIRATION
         * =================================================
         */

        if (transaction.expiresAt < Date.now()) {
            return reply.redirect(`${frontendUrl}/?auth=expired`);
        }

        /*
         * =================================================
         * STATE VALIDATION
         * =================================================
         */

        if (!safeCompare(state, transaction.state)) {
            return reply.redirect(`${frontendUrl}/?auth=invalid_state`);
        }

        /*
         * =================================================
         * EXCHANGE CODE
         * =================================================
         */

        try {
            /*
             * Troca authorization code
             * por access token.
             */

            const tokenData = await githubAuthService.exchangeCode(code, transaction.codeVerifier);

            /*
             * Consulta usuário autenticado
             * no GitHub.
             */

            const githubUser = await githubAuthService.getGitHubUser(tokenData.access_token);

            /*
             * Persiste usuário e credencial
             * criptografada.
             */

            const user = await githubAuthService.persistUserAndCredential(githubUser, tokenData);

            /*
             * Cria sessão própria do
             * DevPulse.
             */

            const session = await sessionService.create(user.id);

            /*
             * O token de sessão fica apenas
             * em cookie HttpOnly.
             */

            reply.setCookie(
                getSessionCookieName(),

                session.token,

                getSessionCookieOptions(session.expiresAt)
            );

            return reply.redirect(`${frontendUrl}/?auth=success`);
        } catch (error) {
            request.log.error(error);

            return reply.redirect(`${frontendUrl}/?auth=error`);
        }
    }

    /*
     * =====================================================
     * CURRENT USER
     * =====================================================
     *
     * GET /api/auth/me
     */

    async me(
        request: FastifyRequest,

        reply: FastifyReply
    ) {
        const cookieName = getSessionCookieName();

        const token = request.cookies[cookieName];

        /*
         * Nenhuma sessão.
         */

        if (!token) {
            return reply.status(401).send({
                authenticated: false,
            });
        }

        /*
         * Verifica sessão no banco.
         */

        const user = await sessionService.findUserByToken(token);

        /*
         * Cookie existe, mas sessão
         * não existe ou expirou.
         */

        if (!user) {
            reply.clearCookie(
                cookieName,

                {
                    path: "/",

                    httpOnly: true,

                    sameSite: "lax",

                    secure: isProduction(),
                }
            );

            return reply.status(401).send({
                authenticated: false,
            });
        }

        /*
         * Usuário autenticado.
         */

        return reply.send({
            authenticated: true,

            user: {
                id: user.id,

                githubId: user.githubId.toString(),

                login: user.login,

                name: user.name,

                avatarUrl: user.avatarUrl,

                profileUrl: user.profileUrl,
            },
        });
    }

    /*
     * =====================================================
     * LOGOUT
     * =====================================================
     *
     * POST /api/auth/logout
     */

    async logout(
        request: FastifyRequest,

        reply: FastifyReply
    ) {
        const cookieName = getSessionCookieName();

        const token = request.cookies[cookieName];

        /*
         * Revoga sessão no servidor.
         */

        if (token) {
            await sessionService.revoke(token);
        }

        /*
         * Remove cookie do navegador.
         */

        reply.clearCookie(
            cookieName,

            {
                path: "/",

                httpOnly: true,

                sameSite: "lax",

                secure: isProduction(),
            }
        );

        return reply.send({
            message: "Logout realizado com sucesso.",
        });
    }
}
