import type { FastifyReply } from "fastify";

import { githubRateLimitService } from "../services/github-rate-limit.service.js";

/*
 * =========================================================
 * HEADERS QUE O FRONTEND PODE LER
 * =========================================================
 */

export const DEVPULSE_EXPOSED_HEADERS = [
    "X-DevPulse-Cache",

    "X-DevPulse-GitHub-Limit",

    "X-DevPulse-GitHub-Remaining",

    "X-DevPulse-GitHub-Used",

    "X-DevPulse-GitHub-Reset",

    "X-DevPulse-GitHub-Resource",

    "X-DevPulse-GitHub-Retry-After",

    "X-DevPulse-GitHub-Observed-At",
];

/*
 * =========================================================
 * GITHUB RATE LIMIT HEADERS
 * =========================================================
 */

export function applyGitHubMetaHeaders(
    reply: FastifyReply,

    accessToken?: string
): void {
    const snapshot = githubRateLimitService.get(accessToken);

    if (!snapshot) {
        return;
    }

    if (snapshot.limit !== null) {
        reply.header(
            "X-DevPulse-GitHub-Limit",

            String(snapshot.limit)
        );
    }

    if (snapshot.remaining !== null) {
        reply.header(
            "X-DevPulse-GitHub-Remaining",

            String(snapshot.remaining)
        );
    }

    if (snapshot.used !== null) {
        reply.header(
            "X-DevPulse-GitHub-Used",

            String(snapshot.used)
        );
    }

    if (snapshot.resetAt) {
        reply.header(
            "X-DevPulse-GitHub-Reset",

            snapshot.resetAt
        );
    }

    if (snapshot.resource) {
        reply.header(
            "X-DevPulse-GitHub-Resource",

            snapshot.resource
        );
    }

    if (snapshot.retryAfterSeconds !== null) {
        reply.header(
            "X-DevPulse-GitHub-Retry-After",

            String(snapshot.retryAfterSeconds)
        );
    }

    reply.header(
        "X-DevPulse-GitHub-Observed-At",

        snapshot.observedAt
    );
}
