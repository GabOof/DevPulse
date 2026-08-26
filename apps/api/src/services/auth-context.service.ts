import type { FastifyRequest } from "fastify";

import { GitHubAuthService } from "./github-auth.service.js";
import { SessionService } from "./session.service.js";

const sessionService = new SessionService();

const githubAuthService = new GitHubAuthService();

function getSessionCookieName() {
    return process.env.SESSION_COOKIE_NAME ?? "devpulse_session";
}

export class AuthContextService {
    async resolveUser(request: FastifyRequest) {
        const sessionToken = request.cookies[getSessionCookieName()];

        if (!sessionToken) {
            return null;
        }

        return sessionService.findUserByToken(sessionToken);
    }

    async requireUser(request: FastifyRequest) {
        const user = await this.resolveUser(request);

        if (!user) {
            throw new Error("AUTH_REQUIRED");
        }

        return user;
    }

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

    async requireGitHubContext(request: FastifyRequest) {
        const context = await this.resolveGitHubContext(request);

        if (!context) {
            throw new Error("AUTH_REQUIRED");
        }

        return context;
    }
}
