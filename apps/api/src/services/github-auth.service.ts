import { createHash, randomBytes } from "node:crypto";

import { env } from "../config/env.js";

import { prisma } from "../lib/prisma.js";

import { EncryptionService } from "./encryption.service.js";

import type { GitHubOAuthUser, GitHubTokenResponse } from "../types/auth.js";

/*
 * =========================================================
 * GITHUB ENDPOINTS
 * =========================================================
 */

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

const GITHUB_API_URL = "https://api.github.com";

/*
 * =========================================================
 * TOKEN CONFIGURATION
 * =========================================================
 *
 * Se o access token estiver a menos de
 * 5 minutos de expirar, tentamos renová-lo.
 */

const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

/*
 * =========================================================
 * SERVICES
 * =========================================================
 */

const encryptionService = new EncryptionService();

/*
 * =========================================================
 * GITHUB AUTH SERVICE
 * =========================================================
 */

export class GitHubAuthService {
    /*
     * =====================================================
     * CREATE AUTHORIZATION REQUEST
     * =====================================================
     *
     * Cria:
     *
     * - state;
     * - PKCE code verifier;
     * - PKCE code challenge;
     * - URL de autorização do GitHub.
     */

    createAuthorizationRequest() {
        const clientId = env.github.clientId;

        const callbackUrl = env.github.callbackUrl;

        /*
         * State protege o fluxo contra CSRF.
         */

        const state = randomBytes(32).toString("base64url");

        /*
         * PKCE permite code verifiers
         * entre 43 e 128 caracteres.
         *
         * 48 bytes em Base64 URL-safe
         * gera um verifier adequado.
         */

        const codeVerifier = randomBytes(48).toString("base64url");

        /*
         * S256:
         *
         * BASE64URL(
         *     SHA256(code_verifier)
         * )
         */

        const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

        const params = new URLSearchParams({
            client_id: clientId,

            redirect_uri: callbackUrl,

            state,

            code_challenge: codeChallenge,

            code_challenge_method: "S256",
        });

        return {
            state,

            codeVerifier,

            authorizationUrl: `${GITHUB_AUTHORIZE_URL}?${params.toString()}`,
        };
    }

    /*
     * =====================================================
     * EXCHANGE AUTHORIZATION CODE
     * =====================================================
     *
     * Troca:
     *
     * authorization code
     *
     * por:
     *
     * access token
     * refresh token
     */

    async exchangeCode(
        code: string,

        codeVerifier: string
    ): Promise<GitHubTokenResponse> {
        const clientId = env.github.clientId;

        const clientSecret = env.github.clientSecret;

        const callbackUrl = env.github.callbackUrl;

        const body = new URLSearchParams({
            client_id: clientId,

            client_secret: clientSecret,

            code,

            redirect_uri: callbackUrl,

            code_verifier: codeVerifier,
        });

        const response = await fetch(
            GITHUB_TOKEN_URL,

            {
                method: "POST",

                headers: {
                    Accept: "application/json",

                    "Content-Type": "application/x-www-form-urlencoded",
                },

                body: body.toString(),
            }
        );

        if (!response.ok) {
            throw new Error("GITHUB_TOKEN_EXCHANGE_FAILED");
        }

        const data = (await response.json()) as GitHubTokenResponse;

        /*
         * GitHub também pode responder
         * HTTP 200 contendo um campo error.
         */

        if (data.error || !data.access_token) {
            throw new Error(data.error ?? "GITHUB_TOKEN_EXCHANGE_FAILED");
        }

        return data;
    }

    /*
     * =====================================================
     * GET AUTHENTICATED GITHUB USER
     * =====================================================
     */

    async getGitHubUser(accessToken: string): Promise<GitHubOAuthUser> {
        const response = await fetch(
            `${GITHUB_API_URL}/user`,

            {
                headers: {
                    Accept: "application/vnd.github+json",

                    Authorization: `Bearer ${accessToken}`,

                    "X-GitHub-Api-Version": "2026-03-10",

                    "User-Agent": "DevPulse",
                },
            }
        );

        if (!response.ok) {
            throw new Error("GITHUB_USER_FETCH_FAILED");
        }

        return (await response.json()) as GitHubOAuthUser;
    }

    /*
     * =====================================================
     * PERSIST USER AND CREDENTIAL
     * =====================================================
     *
     * Cria ou atualiza:
     *
     * User
     * +
     * GitHubCredential
     *
     * Tokens nunca são armazenados em texto puro.
     */

    async persistUserAndCredential(
        githubUser: GitHubOAuthUser,

        tokenData: GitHubTokenResponse
    ) {
        const now = Date.now();

        /*
         * =================================================
         * TOKEN EXPIRATION
         * =================================================
         */

        const accessTokenExpiresAt = tokenData.expires_in
            ? new Date(now + tokenData.expires_in * 1000)
            : null;

        const refreshTokenExpiresAt = tokenData.refresh_token_expires_in
            ? new Date(now + tokenData.refresh_token_expires_in * 1000)
            : null;

        /*
         * =================================================
         * USER
         * =================================================
         */

        const user = await prisma.user.upsert({
            where: {
                githubId: BigInt(githubUser.id),
            },

            update: {
                login: githubUser.login,

                name: githubUser.name,

                avatarUrl: githubUser.avatar_url,

                profileUrl: githubUser.html_url,
            },

            create: {
                githubId: BigInt(githubUser.id),

                login: githubUser.login,

                name: githubUser.name,

                avatarUrl: githubUser.avatar_url,

                profileUrl: githubUser.html_url,
            },
        });

        /*
         * =================================================
         * GITHUB CREDENTIAL
         * =================================================
         */

        await prisma.gitHubCredential.upsert({
            where: {
                userId: user.id,
            },

            update: {
                accessTokenEncrypted: encryptionService.encrypt(tokenData.access_token),

                accessTokenExpiresAt,

                refreshTokenEncrypted: tokenData.refresh_token
                    ? encryptionService.encrypt(tokenData.refresh_token)
                    : null,

                refreshTokenExpiresAt,

                tokenType: tokenData.token_type ?? "bearer",
            },

            create: {
                userId: user.id,

                accessTokenEncrypted: encryptionService.encrypt(tokenData.access_token),

                accessTokenExpiresAt,

                refreshTokenEncrypted: tokenData.refresh_token
                    ? encryptionService.encrypt(tokenData.refresh_token)
                    : null,

                refreshTokenExpiresAt,

                tokenType: tokenData.token_type ?? "bearer",
            },
        });

        return user;
    }

    /*
     * =====================================================
     * GET VALID ACCESS TOKEN
     * =====================================================
     *
     * Retorna o access token atual caso
     * ainda esteja válido.
     *
     * Caso esteja próximo da expiração,
     * tenta renová-lo.
     */

    async getValidAccessToken(userId: string): Promise<string> {
        const credential = await prisma.gitHubCredential.findUnique({
            where: {
                userId,
            },
        });

        if (!credential) {
            throw new Error("GITHUB_CREDENTIAL_NOT_FOUND");
        }

        const accessToken = encryptionService.decrypt(credential.accessTokenEncrypted);

        /*
         * Algumas configurações de OAuth
         * podem utilizar tokens sem uma
         * expiração explícita.
         */

        if (!credential.accessTokenExpiresAt) {
            return accessToken;
        }

        /*
         * Renovamos um pouco antes da
         * expiração para evitar que o token
         * expire durante uma operação.
         */

        const expiresSoon =
            credential.accessTokenExpiresAt.getTime() - Date.now() < TOKEN_REFRESH_MARGIN_MS;

        if (!expiresSoon) {
            return accessToken;
        }

        /*
         * =================================================
         * REFRESH TOKEN
         * =================================================
         */

        if (!credential.refreshTokenEncrypted) {
            throw new Error("GITHUB_REAUTH_REQUIRED");
        }

        if (credential.refreshTokenExpiresAt && credential.refreshTokenExpiresAt < new Date()) {
            throw new Error("GITHUB_REAUTH_REQUIRED");
        }

        return this.refreshAccessToken(
            userId,

            credential.refreshTokenEncrypted
        );
    }

    /*
     * =====================================================
     * REFRESH ACCESS TOKEN
     * =====================================================
     */

    private async refreshAccessToken(
        userId: string,

        encryptedRefreshToken: string
    ): Promise<string> {
        const clientId = env.github.clientId;

        const clientSecret = env.github.clientSecret;

        /*
         * Refresh token é armazenado
         * criptografado no banco.
         */

        const refreshToken = encryptionService.decrypt(encryptedRefreshToken);

        const body = new URLSearchParams({
            client_id: clientId,

            client_secret: clientSecret,

            grant_type: "refresh_token",

            refresh_token: refreshToken,
        });

        const response = await fetch(
            GITHUB_TOKEN_URL,

            {
                method: "POST",

                headers: {
                    Accept: "application/json",

                    "Content-Type": "application/x-www-form-urlencoded",
                },

                body: body.toString(),
            }
        );

        if (!response.ok) {
            throw new Error("GITHUB_REAUTH_REQUIRED");
        }

        const tokenData = (await response.json()) as GitHubTokenResponse;

        if (tokenData.error || !tokenData.access_token) {
            throw new Error("GITHUB_REAUTH_REQUIRED");
        }

        const now = Date.now();

        /*
         * =================================================
         * NEW EXPIRATION TIMES
         * =================================================
         */

        const accessTokenExpiresAt = tokenData.expires_in
            ? new Date(now + tokenData.expires_in * 1000)
            : null;

        const refreshTokenExpiresAt = tokenData.refresh_token_expires_in
            ? new Date(now + tokenData.refresh_token_expires_in * 1000)
            : null;

        /*
         * =================================================
         * REFRESH TOKEN ROTATION
         * =================================================
         *
         * O GitHub pode rotacionar o
         * refresh token.
         *
         * Portanto persistimos os NOVOS
         * tokens retornados.
         */

        await prisma.gitHubCredential.update({
            where: {
                userId,
            },

            data: {
                accessTokenEncrypted: encryptionService.encrypt(tokenData.access_token),

                accessTokenExpiresAt,

                refreshTokenEncrypted: tokenData.refresh_token
                    ? encryptionService.encrypt(tokenData.refresh_token)
                    : null,

                refreshTokenExpiresAt,

                tokenType: tokenData.token_type ?? "bearer",
            },
        });

        return tokenData.access_token;
    }
}
