import { timingSafeEqual } from "node:crypto";

import type { FastifyReply, FastifyRequest } from "fastify";

import { env } from "../config/env.js";

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

type AuthRedirectStatus = "denied" | "invalid" | "expired" | "invalid_state" | "success" | "error";

/*
 * =========================================================
 * COOKIE HELPERS
 * =========================================================
 */

function getSessionCookieName(): string {
    return env.auth.sessionCookieName;
}

/*
 * =========================================================
 * OAUTH COOKIE
 * =========================================================
 *
 * Este cookie existe apenas durante
 * o redirecionamento OAuth.
 *
 * Podemos manter SameSite=Lax porque
 * o callback do GitHub retorna por
 * navegação de topo para nossa API.
 */

function getOAuthCookieOptions() {
    return {
        path: "/api/auth/github",

        httpOnly: true,

        sameSite: "lax" as const,

        secure: env.auth.sessionCookieSecure,

        maxAge: OAUTH_TTL_SECONDS,
    };
}

function getOAuthCookieClearOptions() {
    return {
        path: "/api/auth/github",

        httpOnly: true,

        sameSite: "lax" as const,

        secure: env.auth.sessionCookieSecure,
    };
}

/*
 * =========================================================
 * SESSION COOKIE
 * =========================================================
 *
 * Desenvolvimento:
 *
 * SameSite=Lax
 * Secure=false
 *
 * Produção:
 *
 * SameSite=None
 * Secure=true
 *
 * Em produção isso é necessário porque:
 *
 * Frontend:
 * gaboof.github.io
 *
 * API:
 * *.onrender.com
 *
 * pertencem a sites diferentes.
 */

function getSessionCookieOptions(expires: Date) {
    return {
        path: "/",

        httpOnly: true,

        sameSite: env.auth.sessionCookieSameSite,

        secure: env.auth.sessionCookieSecure,

        expires,
    };
}

function getSessionCookieClearOptions() {
    return {
        path: "/",

        httpOnly: true,

        sameSite: env.auth.sessionCookieSameSite,

        secure: env.auth.sessionCookieSecure,
    };
}

/*
 * =========================================================
 * FRONTEND REDIRECT
 * =========================================================
 *
 * Cria a URL de retorno do OAuth sem
 * depender de FRONTEND_URL terminar
 * ou não com "/".
 *
 * Exemplos:
 *
 * http://localhost:5173
 *
 * ->
 *
 * http://localhost:5173/?auth=success
 *
 *
 * https://gaboof.github.io/DevPulse
 *
 * ->
 *
 * https://gaboof.github.io/DevPulse/?auth=success
 */

function getFrontendAuthRedirect(status: AuthRedirectStatus): string {
    const url = new URL(env.frontendUrl);

    /*
     * GitHub Pages trabalha melhor com
     * o pathname do projeto terminado
     * em "/".
     */

    if (!url.pathname.endsWith("/")) {
        url.pathname = `${url.pathname}/`;
    }

    /*
     * Evita carregar query/hash que
     * eventualmente tenham sido
     * configurados em FRONTEND_URL.
     */

    url.search = "";
    url.hash = "";

    url.searchParams.set("auth", status);

    return url.toString();
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
        const { code, state, error } = request.query;

        /*
         * =================================================
         * GITHUB DENIED ACCESS
         * =================================================
         */

        if (error) {
            return reply.redirect(getFrontendAuthRedirect("denied"));
        }

        /*
         * =================================================
         * INVALID CALLBACK
         * =================================================
         */

        if (!code || !state) {
            return reply.redirect(getFrontendAuthRedirect("invalid"));
        }

        /*
         * =================================================
         * OAUTH TRANSACTION COOKIE
         * =================================================
         */

        const encryptedTransaction = request.cookies[OAUTH_COOKIE_NAME];

        if (!encryptedTransaction) {
            return reply.redirect(getFrontendAuthRedirect("expired"));
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

            getOAuthCookieClearOptions()
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
            return reply.redirect(getFrontendAuthRedirect("invalid"));
        }

        /*
         * =================================================
         * TRANSACTION EXPIRATION
         * =================================================
         */

        if (transaction.expiresAt < Date.now()) {
            return reply.redirect(getFrontendAuthRedirect("expired"));
        }

        /*
         * =================================================
         * STATE VALIDATION
         * =================================================
         */

        if (!safeCompare(state, transaction.state)) {
            return reply.redirect(getFrontendAuthRedirect("invalid_state"));
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

            return reply.redirect(getFrontendAuthRedirect("success"));
        } catch (error) {
            request.log.error(error);

            return reply.redirect(getFrontendAuthRedirect("error"));
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

                getSessionCookieClearOptions()
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

            getSessionCookieClearOptions()
        );

        return reply.send({
            message: "Logout realizado com sucesso.",
        });
    }
}
