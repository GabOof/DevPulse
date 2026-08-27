import "dotenv/config";

import Fastify, { type FastifyInstance } from "fastify";

import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

import { env } from "./config/env.js";

import { repositoryRoutes } from "./routes/repository.routes.js";

import { authRoutes } from "./routes/auth.routes.js";

import { registerErrorHandler } from "./plugins/error-handler.js";

import { checkReadiness } from "./services/readiness.service.js";

import { DEVPULSE_EXPOSED_HEADERS } from "./http/github-response-meta.js";

/*
 * =========================================================
 * OPTIONS
 * =========================================================
 */

interface BuildAppOptions {
    logger?: boolean;
}

/*
 * =========================================================
 * BUILD APP
 * =========================================================
 */

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
    const app = Fastify({
        logger: options.logger ?? false,

        /*
         * Não queremos que o AJV remova
         * silenciosamente parâmetros
         * desconhecidos.
         */

        ajv: {
            customOptions: {
                removeAdditional: false,
            },
        },
    });

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
        origin: env.frontendUrl,

        credentials: true,

        /*
         * Permite que o frontend leia:
         *
         * X-DevPulse-Cache
         * X-DevPulse-GitHub-Remaining
         * etc.
         */

        exposedHeaders: DEVPULSE_EXPOSED_HEADERS,
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
     */

    await app.register(rateLimit, {
        max: env.rateLimit.max,

        timeWindow: "1 minute",
    });

    /*
     * =====================================================
     * LIVENESS
     * =====================================================
     *
     * /health responde mesmo que PostgreSQL
     * esteja indisponível.
     *
     * Isso indica apenas:
     *
     * "o processo da API está vivo?"
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
     * READINESS
     * =====================================================
     *
     * /ready verifica se a aplicação está
     * realmente pronta para receber tráfego.
     *
     * Nesta versão verificamos PostgreSQL.
     */

    app.get(
        "/ready",

        async (request, reply) => {
            const readiness = await checkReadiness();

            if (readiness.status === "ready") {
                return reply.status(200).send(readiness);
            }

            request.log.warn(
                {
                    readiness,
                },

                "DevPulse API is not ready"
            );

            return reply.status(503).send(readiness);
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
