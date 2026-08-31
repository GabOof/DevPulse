import "dotenv/config";

import type { IncomingMessage } from "node:http";

import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";

import cookie from "@fastify/cookie";

import cors from "@fastify/cors";

import helmet from "@fastify/helmet";

import rateLimit, { normalizeIP } from "@fastify/rate-limit";

import { env } from "./config/env.js";

import { repositoryRoutes } from "./routes/repository.routes.js";

import { authRoutes } from "./routes/auth.routes.js";

import { registerErrorHandler } from "./plugins/error-handler.js";

import { checkReadiness, type ReadinessResult } from "./services/readiness.service.js";

import { DEVPULSE_EXPOSED_HEADERS } from "./http/github-response-meta.js";

/**
 * =========================================================
 * TYPES
 * =========================================================
 */

type ReadinessCheck = () => Promise<ReadinessResult>;

interface BuildAppOptions {
    logger?: boolean;

    trustProxy?: boolean;

    readinessCheck?: ReadinessCheck;

    /**
     * Ativa adaptações específicas para
     * Firebase Functions.
     */
    firebaseFunctions?: boolean;
}

interface FirebaseParsedRequest extends IncomingMessage {
    body?: unknown;

    rawBody?: Buffer;
}

/**
 * =========================================================
 * FIREBASE BODY PARSER
 * =========================================================
 *
 * Firebase Functions processa o body JSON
 * antes de encaminhá-lo ao Fastify.
 *
 * Por isso, no ambiente Firebase, reutilizamos
 * o body já processado.
 */

function registerFirebaseBodyParser(app: FastifyInstance): void {
    app.removeContentTypeParser("application/json");

    app.addContentTypeParser("application/json", {}, (_request, payload, done) => {
        const firebasePayload = payload as unknown as FirebaseParsedRequest;

        done(null, firebasePayload.body);
    });
}

/**
 * =========================================================
 * HEADER VALUE
 * =========================================================
 */

function getHeaderValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
        return value[0]?.trim();
    }

    return value?.trim();
}

/**
 * =========================================================
 * X-FORWARDED-FOR
 * =========================================================
 *
 * Cloud Functions adiciona X-Forwarded-For.
 *
 * O primeiro endereço normalmente representa
 * o cliente que iniciou a requisição.
 */

function getForwardedIp(request: FastifyRequest): string | undefined {
    const forwardedFor = getHeaderValue(request.headers["x-forwarded-for"]);

    if (!forwardedFor) {
        return undefined;
    }

    const firstIp = forwardedFor.split(",")[0]?.trim();

    return firstIp || undefined;
}

/**
 * =========================================================
 * NORMALIZE CLIENT IP
 * =========================================================
 */

function normalizeClientIp(value: string | undefined): string | null {
    if (!value) {
        return null;
    }

    try {
        return normalizeIP(value, 64);
    } catch {
        return null;
    }
}

/**
 * =========================================================
 * RATE LIMIT KEY
 * =========================================================
 *
 * Em um servidor Node tradicional o Fastify
 * normalmente consegue resolver request.ip.
 *
 * No Firebase Emulator, entretanto, o objeto
 * HTTP encaminhado pode não possuir socket
 * suficiente para que Fastify monte esse campo.
 *
 * Usamos então uma sequência de fallbacks.
 */

function getRateLimitKey(request: FastifyRequest): string {
    const candidates = [
        request.ip,

        getForwardedIp(request),

        getHeaderValue(request.headers["x-real-ip"]),

        request.raw.socket?.remoteAddress,
    ];

    for (const candidate of candidates) {
        const normalized = normalizeClientIp(candidate);

        if (normalized) {
            return normalized;
        }
    }

    /**
     * Fallback extremo.
     *
     * Isso evita derrubar a API caso um ambiente
     * não disponibilize nenhuma informação de IP.
     *
     * Nesse cenário, essas requisições compartilharão
     * o mesmo bucket de rate limit.
     */

    return "unknown-client";
}

/**
 * =========================================================
 * BUILD APP
 * =========================================================
 */

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
    /**
     * Permite substituir o check
     * em testes sem acessar PostgreSQL.
     */

    const readinessCheck = options.readinessCheck ?? checkReadiness;

    const app = Fastify({
        logger: options.logger ?? false,

        /**
         * Necessário quando a API fica
         * atrás de reverse proxy.
         */

        trustProxy: options.trustProxy ?? env.trustProxy,

        ajv: {
            customOptions: {
                removeAdditional: false,
            },
        },
    });

    /**
     * =====================================================
     * FIREBASE FUNCTIONS
     * =====================================================
     */

    if (options.firebaseFunctions) {
        registerFirebaseBodyParser(app);
    }

    /**
     * =====================================================
     * ERROR HANDLER
     * =====================================================
     */

    registerErrorHandler(app);

    /**
     * =====================================================
     * SECURITY HEADERS
     * =====================================================
     */

    await app.register(helmet);

    /**
     * =====================================================
     * CORS
     * =====================================================
     */

    await app.register(cors, {
        origin: env.frontendUrl,

        credentials: true,

        exposedHeaders: DEVPULSE_EXPOSED_HEADERS,
    });

    /**
     * =====================================================
     * COOKIES
     * =====================================================
     */

    await app.register(cookie);

    /**
     * =====================================================
     * RATE LIMIT
     * =====================================================
     */

    await app.register(rateLimit, {
        max: env.rateLimit.max,

        timeWindow: "1 minute",

        /**
         * Não dependemos exclusivamente
         * de request.ip porque ele pode
         * ficar indisponível no Firebase
         * Emulator.
         */

        keyGenerator: getRateLimitKey,
    });

    /**
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

    /**
     * =====================================================
     * READY
     * =====================================================
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

    /**
     * =====================================================
     * REPOSITORY ROUTES
     * =====================================================
     */

    await app.register(repositoryRoutes, {
        prefix: "/api",
    });

    /**
     * =====================================================
     * AUTH ROUTES
     * =====================================================
     */

    await app.register(authRoutes, {
        prefix: "/api/auth",
    });

    return app;
}
