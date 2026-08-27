import "dotenv/config";

import Fastify, { type FastifyInstance } from "fastify";

import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

import { repositoryRoutes } from "./routes/repository.routes.js";

import { authRoutes } from "./routes/auth.routes.js";

import { registerErrorHandler } from "./plugins/error-handler.js";

import { DEVPULSE_EXPOSED_HEADERS } from "./http/github-response-meta.js";

/*
 * =========================================================
 * BUILD APP OPTIONS
 * =========================================================
 *
 * Não usamos FastifyServerOptions diretamente porque
 * ele também representa configurações HTTP/2, HTTPS,
 * JTD etc.
 *
 * Neste momento o DevPulse só precisa controlar se
 * o logger estará ativo.
 */

interface BuildAppOptions {
    logger?: boolean;
}

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

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
    /*
     * =====================================================
     * FASTIFY
     * =====================================================
     *
     * O Fastify usa por padrão:
     *
     * removeAdditional: true
     *
     * Isso significa que:
     *
     * ?days=30&admin=true
     *
     * com additionalProperties: false
     *
     * poderia simplesmente ter "admin"
     * removido.
     *
     * No DevPulse queremos validação
     * estrita:
     *
     * parâmetro desconhecido
     *          ↓
     *         400
     */

    const app = Fastify({
        logger: options.logger ?? false,

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
        origin: process.env.FRONTEND_URL ?? "http://localhost:5173",

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
     *
     * Proteção própria do DevPulse.
     *
     * Default:
     *
     * 120 requisições por minuto/IP.
     */

    await app.register(rateLimit, {
        max: getRateLimitMax(),

        timeWindow: "1 minute",
    });

    /*
     * =====================================================
     * HEALTH CHECK
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
