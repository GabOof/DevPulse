/*
 * =========================================================
 * REPOSITORY PARAMS
 * =========================================================
 *
 * GitHub aceita nomes de owner/repository
 * compostos principalmente por:
 *
 * letras
 * números
 * hífen
 * underscore
 * ponto
 */

export const repositoryParamsSchema = {
    type: "object",

    additionalProperties: false,

    required: ["owner", "repo"],

    properties: {
        owner: {
            type: "string",

            minLength: 1,

            maxLength: 100,

            /*
             * Impede valores obviamente
             * inválidos como:
             *
             * !!!
             * espaço
             * ../
             */
            pattern: "^[A-Za-z0-9_.-]+$",
        },

        repo: {
            type: "string",

            minLength: 1,

            maxLength: 100,

            pattern: "^[A-Za-z0-9_.-]+$",
        },
    },
} as const;

/*
 * =========================================================
 * ANALYTICS QUERY
 * =========================================================
 *
 * O DevPulse suporta somente:
 *
 * 7 dias
 * 30 dias
 * 90 dias
 */

export const analyticsQuerySchema = {
    type: "object",

    additionalProperties: false,

    properties: {
        days: {
            type: "integer",

            enum: [7, 30, 90],

            default: 30,
        },
    },
} as const;

/*
 * =========================================================
 * HISTORY QUERY
 * =========================================================
 *
 * Histórico pode ser solicitado sem
 * days.
 *
 * Nesse caso o backend pode retornar
 * snapshots de diferentes períodos.
 */

export const historyQuerySchema = {
    type: "object",

    additionalProperties: false,

    properties: {
        days: {
            type: "integer",

            enum: [7, 30, 90],
        },
    },
} as const;

/*
 * =========================================================
 * ROUTE SCHEMAS
 * =========================================================
 */

export const repositoryRouteSchema = {
    params: repositoryParamsSchema,
} as const;

export const analyticsRouteSchema = {
    params: repositoryParamsSchema,

    querystring: analyticsQuerySchema,
} as const;

export const analyzeRouteSchema = {
    params: repositoryParamsSchema,

    querystring: analyticsQuerySchema,
} as const;

export const historyRouteSchema = {
    params: repositoryParamsSchema,

    querystring: historyQuerySchema,
} as const;
