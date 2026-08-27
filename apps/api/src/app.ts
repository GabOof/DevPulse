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

import { checkReadiness, type ReadinessResult } from "./services/readiness.service.js";

import { DEVPULSE_EXPOSED_HEADERS } from "./http/github-response-meta.js";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

type ReadinessCheck = () => Promise<ReadinessResult>;

interface BuildAppOptions {
    logger?: boolean;

    trustProxy?: boolean;

    readinessCheck?: ReadinessCheck;
}

/*
 * =========================================================
 * BUILD APP
 * =========================================================
 */

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
    /*
     * Permite substituir o check
     * em testes sem acessar PostgreSQL.
     */

    const readinessCheck = options.readinessCheck ?? checkReadiness;

    const app = Fastify({
        logger: options.logger ?? false,

        /*
         * Necessário quando a API fica
         * atrás de reverse proxy.
         *
         * Não habilitamos automaticamente:
         * somente TRUST_PROXY=true.
         */

        trustProxy: options.trustProxy ?? env.trustProxy,

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
     * HEALTH
     * =====================================================
     *
     * Liveness check.
     *
     * Não verifica PostgreSQL.
     */

    app.get(
        "/health",

        async (_request, reply) => {
            reply.header("Cache-Control", "no-store");

            return reply.send({
                status: "ok",

                service: "devpulse-api",
            });
        }
    );

    /*
     * =====================================================
     * READY
     * =====================================================
     *
     * Readiness check.
     *
     * A instância somente é considerada
     * pronta caso as dependências críticas
     * estejam disponíveis.
     */

    app.get(
        "/ready",

        async (request, reply) => {
            reply.header("Cache-Control", "no-store");

            const readiness = await readinessCheck();

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

    await app.register(
        repositoryRoutes,

        {
            prefix: "/api",
        }
    );

    /*
     * =====================================================
     * AUTH ROUTES
     * =====================================================
     */

    await app.register(
        authRoutes,

        {
            prefix: "/api/auth",
        }
    );

    return app;
}
