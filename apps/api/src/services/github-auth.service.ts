import { createHash, randomBytes } from "node:crypto";

import { prisma } from "../lib/prisma.js";

import { EncryptionService } from "./encryption.service.js";

import type { GitHubOAuthUser, GitHubTokenResponse } from "../types/auth.js";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

const GITHUB_API_URL = "https://api.github.com";

const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

const encryptionService = new EncryptionService();

export class GitHubAuthService {
    createAuthorizationRequest() {
        const clientId = this.getRequiredEnvironmentVariable("GITHUB_CLIENT_ID");

        const callbackUrl = this.getRequiredEnvironmentVariable("GITHUB_CALLBACK_URL");

        const state = randomBytes(32).toString("base64url");

        /*
         * PKCE permite verifiers entre
         * 43 e 128 caracteres.
         */
        const codeVerifier = randomBytes(48).toString("base64url");

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

    async exchangeCode(code: string, codeVerifier: string): Promise<GitHubTokenResponse> {
        const clientId = this.getRequiredEnvironmentVariable("GITHUB_CLIENT_ID");

        const clientSecret = this.getRequiredEnvironmentVariable("GITHUB_CLIENT_SECRET");

        const callbackUrl = this.getRequiredEnvironmentVariable("GITHUB_CALLBACK_URL");

        const body = new URLSearchParams({
            client_id: clientId,

            client_secret: clientSecret,

            code,

            redirect_uri: callbackUrl,

            code_verifier: codeVerifier,
        });

        const response = await fetch(GITHUB_TOKEN_URL, {
            method: "POST",

            headers: {
                Accept: "application/json",

                "Content-Type": "application/x-www-form-urlencoded",
            },

            body: body.toString(),
        });

        if (!response.ok) {
            throw new Error("GITHUB_TOKEN_EXCHANGE_FAILED");
        }

        const data = (await response.json()) as GitHubTokenResponse;

        if (data.error || !data.access_token) {
            throw new Error(data.error ?? "GITHUB_TOKEN_EXCHANGE_FAILED");
        }

        return data;
    }

    async getGitHubUser(accessToken: string): Promise<GitHubOAuthUser> {
        const response = await fetch(`${GITHUB_API_URL}/user`, {
            headers: {
                Accept: "application/vnd.github+json",

                Authorization: `Bearer ${accessToken}`,

                "X-GitHub-Api-Version": "2026-03-10",

                "User-Agent": "DevPulse",
            },
        });

        if (!response.ok) {
            throw new Error("GITHUB_USER_FETCH_FAILED");
        }

        return (await response.json()) as GitHubOAuthUser;
    }

    async persistUserAndCredential(githubUser: GitHubOAuthUser, tokenData: GitHubTokenResponse) {
        const now = Date.now();

        const accessTokenExpiresAt = tokenData.expires_in
            ? new Date(now + tokenData.expires_in * 1000)
            : null;

        const refreshTokenExpiresAt = tokenData.refresh_token_expires_in
            ? new Date(now + tokenData.refresh_token_expires_in * 1000)
            : null;

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
         * Caso a aplicação tenha tokens
         * sem expiração habilitados.
         */
        if (!credential.accessTokenExpiresAt) {
            return accessToken;
        }

        const expiresSoon =
            credential.accessTokenExpiresAt.getTime() - Date.now() < TOKEN_REFRESH_MARGIN_MS;

        if (!expiresSoon) {
            return accessToken;
        }

        if (!credential.refreshTokenEncrypted) {
            throw new Error("GITHUB_REAUTH_REQUIRED");
        }

        if (credential.refreshTokenExpiresAt && credential.refreshTokenExpiresAt < new Date()) {
            throw new Error("GITHUB_REAUTH_REQUIRED");
        }

        return this.refreshAccessToken(userId, credential.refreshTokenEncrypted);
    }

    private async refreshAccessToken(
        userId: string,
        encryptedRefreshToken: string
    ): Promise<string> {
        const clientId = this.getRequiredEnvironmentVariable("GITHUB_CLIENT_ID");

        const clientSecret = this.getRequiredEnvironmentVariable("GITHUB_CLIENT_SECRET");

        const refreshToken = encryptionService.decrypt(encryptedRefreshToken);

        const body = new URLSearchParams({
            client_id: clientId,

            client_secret: clientSecret,

            grant_type: "refresh_token",

            refresh_token: refreshToken,
        });

        const response = await fetch(GITHUB_TOKEN_URL, {
            method: "POST",

            headers: {
                Accept: "application/json",

                "Content-Type": "application/x-www-form-urlencoded",
            },

            body: body.toString(),
        });

        if (!response.ok) {
            throw new Error("GITHUB_REAUTH_REQUIRED");
        }

        const tokenData = (await response.json()) as GitHubTokenResponse;

        if (tokenData.error || !tokenData.access_token) {
            throw new Error("GITHUB_REAUTH_REQUIRED");
        }

        const now = Date.now();

        const accessTokenExpiresAt = tokenData.expires_in
            ? new Date(now + tokenData.expires_in * 1000)
            : null;

        const refreshTokenExpiresAt = tokenData.refresh_token_expires_in
            ? new Date(now + tokenData.refresh_token_expires_in * 1000)
            : null;

        /*
         * O GitHub rotaciona o refresh
         * token. Portanto precisamos
         * persistir o NOVO refresh token.
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

    private getRequiredEnvironmentVariable(name: string): string {
        const value = process.env[name];

        if (!value) {
            throw new Error(`${name} não configurada.`);
        }

        return value;
    }
}
