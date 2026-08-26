import type { FastifyError, FastifyInstance } from "fastify";

import { AppError } from "../errors/app-error.js";

interface ValidationItem {
    instancePath?: string;

    schemaPath?: string;

    keyword?: string;

    params?: {
        missingProperty?: string;

        [key: string]: unknown;
    };

    message?: string;
}

type ExtendedFastifyError = FastifyError & {
    validation?: ValidationItem[];

    validationContext?: string;

    statusCode?: number;
};

/*
 * =========================================================
 * VALIDATION HELPERS
 * =========================================================
 */

function isDaysValidationError(error: ExtendedFastifyError): boolean {
    if (error.validationContext !== "querystring") {
        return false;
    }

    return Boolean(
        error.validation?.some((validation) => {
            return (
                validation.instancePath === "/days" || validation.params?.missingProperty === "days"
            );
        })
    );
}

/*
 * =========================================================
 * ERROR HANDLER
 * =========================================================
 */

export function registerErrorHandler(app: FastifyInstance): void {
    /*
     * ==========================
     * 404
     * ==========================
     */

    app.setNotFoundHandler((request, reply) => {
        return reply.status(404).send({
            error: "Route not found",

            message: "A rota solicitada não existe.",

            path: request.url,
        });
    });

    /*
     * ==========================
     * GLOBAL ERROR HANDLER
     * ==========================
     */

    app.setErrorHandler((error, request, reply) => {
        const fastifyError = error as ExtendedFastifyError;

        /*
         * ======================
         * AppError
         * ======================
         */

        if (error instanceof AppError) {
            if (error.statusCode >= 500) {
                request.log.error(
                    {
                        err: error,

                        code: error.code,
                    },

                    "Application error"
                );
            }

            return reply.status(error.statusCode).send({
                error: error.code,

                message: error.message,

                ...(error.details !== undefined
                    ? {
                          details: error.details,
                      }
                    : {}),
            });
        }

        /*
         * ======================
         * Fastify validation
         * ======================
         */

        if (fastifyError.validation) {
            /*
             * Preservamos o contrato
             * que o frontend e os
             * testes já utilizam para
             * days.
             */
            if (isDaysValidationError(fastifyError)) {
                return reply.status(400).send({
                    error: "Invalid period",

                    message: "O período deve ser 7, 30 ou 90 dias.",
                });
            }

            /*
             * Não devolvemos a
             * estrutura interna do
             * AJV para o cliente.
             */
            return reply.status(400).send({
                error: "Validation error",

                message: "Os parâmetros enviados são inválidos.",
            });
        }

        /*
         * ======================
         * RATE LIMIT
         * ======================
         */

        if (fastifyError.statusCode === 429 || fastifyError.code === "FST_ERR_RATE_LIMIT") {
            return reply.status(429).send({
                error: "Rate limit exceeded",

                message:
                    "Muitas requisições foram realizadas. Tente novamente em alguns instantes.",
            });
        }

        /*
         * ======================
         * ERROS HTTP CONHECIDOS
         * ======================
         */

        if (
            fastifyError.statusCode &&
            fastifyError.statusCode >= 400 &&
            fastifyError.statusCode < 500
        ) {
            return reply.status(fastifyError.statusCode).send({
                error: "Request error",

                message: fastifyError.message,
            });
        }

        /*
         * ======================
         * ERRO NÃO TRATADO
         * ======================
         *
         * Logamos internamente, mas
         * não enviamos stack trace
         * para o cliente.
         */

        request.log.error(
            {
                err: error,

                method: request.method,

                url: request.url,
            },

            "Unhandled application error"
        );

        return reply.status(500).send({
            error: "Internal server error",

            message: "Ocorreu um erro interno no servidor.",
        });
    });
}
