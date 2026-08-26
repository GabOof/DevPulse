import { timingSafeEqual } from "node:crypto";

import type { FastifyReply, FastifyRequest } from "fastify";

import { EncryptionService } from "../services/encryption.service.js";
import { GitHubAuthService } from "../services/github-auth.service.js";
import { SessionService } from "../services/session.service.js";

import type { OAuthTransaction } from "../types/auth.js";

const githubAuthService = new GitHubAuthService();

const sessionService = new SessionService();

const encryptionService = new EncryptionService();

const OAUTH_COOKIE_NAME = "devpulse_oauth";

const OAUTH_TTL_SECONDS = 10 * 60;

interface CallbackQuery {
    code?: string;

    state?: string;

    error?: string;

    error_description?: string;
}

function getSessionCookieName() {
    return process.env.SESSION_COOKIE_NAME ?? "devpulse_session";
}

function getFrontendUrl() {
    return process.env.FRONTEND_URL ?? "http://localhost:5173";
}

function isProduction() {
    return process.env.NODE_ENV === "production";
}

function safeCompare(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);

    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
}

export class AuthController {
    async github(_request: FastifyRequest, reply: FastifyReply) {
        const { state, codeVerifier, authorizationUrl } =
            githubAuthService.createAuthorizationRequest();

        const transaction: OAuthTransaction = {
            state,

            codeVerifier,

            expiresAt: Date.now() + OAUTH_TTL_SECONDS * 1000,
        };

        const encryptedTransaction = encryptionService.encrypt(JSON.stringify(transaction));

        reply.setCookie(OAUTH_COOKIE_NAME, encryptedTransaction, {
            path: "/api/auth/github",

            httpOnly: true,

            sameSite: "lax",

            secure: isProduction(),

            maxAge: OAUTH_TTL_SECONDS,
        });

        return reply.redirect(authorizationUrl);
    }

    async callback(
        request: FastifyRequest<{
            Querystring: CallbackQuery;
        }>,
        reply: FastifyReply
    ) {
        const frontendUrl = getFrontendUrl();

        const { code, state, error } = request.query;

        if (error) {
            return reply.redirect(`${frontendUrl}/?auth=denied`);
        }

        if (!code || !state) {
            return reply.redirect(`${frontendUrl}/?auth=invalid`);
        }

        const encryptedTransaction = request.cookies[OAUTH_COOKIE_NAME];

        if (!encryptedTransaction) {
            return reply.redirect(`${frontendUrl}/?auth=expired`);
        }

        /*
         * Cookie de transação é one-shot.
         */
        reply.clearCookie(OAUTH_COOKIE_NAME, {
            path: "/api/auth/github",
        });

        let transaction: OAuthTransaction;

        try {
            const decrypted = encryptionService.decrypt(encryptedTransaction);

            transaction = JSON.parse(decrypted) as OAuthTransaction;
        } catch {
            return reply.redirect(`${frontendUrl}/?auth=invalid`);
        }

        if (transaction.expiresAt < Date.now()) {
            return reply.redirect(`${frontendUrl}/?auth=expired`);
        }

        if (!safeCompare(state, transaction.state)) {
            return reply.redirect(`${frontendUrl}/?auth=invalid_state`);
        }

        try {
            const tokenData = await githubAuthService.exchangeCode(code, transaction.codeVerifier);

            const githubUser = await githubAuthService.getGitHubUser(tokenData.access_token);

            const user = await githubAuthService.persistUserAndCredential(githubUser, tokenData);

            const session = await sessionService.create(user.id);

            reply.setCookie(getSessionCookieName(), session.token, {
                path: "/",

                httpOnly: true,

                sameSite: "lax",

                secure: isProduction(),

                expires: session.expiresAt,
            });

            return reply.redirect(`${frontendUrl}/?auth=success`);
        } catch (error) {
            request.log.error(error);

            return reply.redirect(`${frontendUrl}/?auth=error`);
        }
    }

    async me(request: FastifyRequest, reply: FastifyReply) {
        const token = request.cookies[getSessionCookieName()];

        if (!token) {
            return reply.status(401).send({
                authenticated: false,
            });
        }

        const user = await sessionService.findUserByToken(token);

        if (!user) {
            reply.clearCookie(getSessionCookieName(), {
                path: "/",
            });

            return reply.status(401).send({
                authenticated: false,
            });
        }

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

    async logout(request: FastifyRequest, reply: FastifyReply) {
        const cookieName = getSessionCookieName();

        const token = request.cookies[cookieName];

        if (token) {
            await sessionService.revoke(token);
        }

        reply.clearCookie(cookieName, {
            path: "/",
        });

        return reply.send({
            message: "Logout realizado com sucesso.",
        });
    }
}
