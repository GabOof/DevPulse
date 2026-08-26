import "dotenv/config";

import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";

import cors from "@fastify/cors";

import cookie from "@fastify/cookie";

import helmet from "@fastify/helmet";

import rateLimit from "@fastify/rate-limit";

import { repositoryRoutes } from "./routes/repository.routes.js";

import { authRoutes } from "./routes/auth.routes.js";

import { registerErrorHandler } from "./plugins/error-handler.js";

/*
 * =========================================================
 * RATE LIMIT
 * =========================================================
 */

function getRateLimitMax(): number {
    const value = Number(process.env.RATE_LIMIT_MAX ?? 120);

    if (!Number.isFinite(value) || value <= 0) {
        return 120;
    }

    return Math.floor(value);
}

/*
 * =========================================================
 * BUILD APP
 * =========================================================
 */

export async function buildApp(options: FastifyServerOptions = {}): Promise<FastifyInstance> {
    const app = Fastify(options);

    /*
     * =====================================================
     * ERROR HANDLER
     * =====================================================
     */

    registerErrorHandler(app);

    /*
     * =====================================================
     * SECURITY HEADERS
     * =====================================================
     */

    await app.register(helmet);

    /*
     * =====================================================
     * CORS
     * =====================================================
     */

    await app.register(cors, {
        origin: process.env.FRONTEND_URL ?? "http://localhost:5173",

        credentials: true,
    });

    /*
     * =====================================================
     * COOKIES
     * =====================================================
     */

    await app.register(cookie);

    /*
     * =====================================================
     * RATE LIMIT
     * =====================================================
     *
     * Protege a API do DevPulse,
     * independentemente do rate limit
     * existente na API do GitHub.
     *
     * Default:
     *
     * 120 requests / minuto / IP
     */

    await app.register(rateLimit, {
        max: getRateLimitMax(),

        timeWindow: "1 minute",
    });

    /*
     * =====================================================
     * HEALTH
     * =====================================================
     */

    app.get(
        "/health",

        async () => {
            return {
                status: "ok",

                service: "devpulse-api",
            };
        }
    );

    /*
     * =====================================================
     * REPOSITORY ROUTES
     * =====================================================
     */

    await app.register(repositoryRoutes, {
        prefix: "/api",
    });

    /*
     * =====================================================
     * AUTH ROUTES
     * =====================================================
     */

    await app.register(authRoutes, {
        prefix: "/api/auth",
    });

    return app;
}
