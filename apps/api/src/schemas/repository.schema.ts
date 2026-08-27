/*
 * =========================================================
 * REPOSITORY PARAMS
 * =========================================================
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
 * REFRESH QUERY
 * =========================================================
 *
 * Usado no Repository Overview.
 *
 * Exemplos:
 *
 * ?refresh=true
 * ?refresh=false
 */

export const refreshQuerySchema = {
    type: "object",

    additionalProperties: false,

    properties: {
        refresh: {
            type: "boolean",

            default: false,
        },
    },
} as const;

/*
 * =========================================================
 * ANALYTICS QUERY
 * =========================================================
 *
 * Analytics aceita:
 *
 * ?days=7
 * ?days=30
 * ?days=90
 *
 * e:
 *
 * ?refresh=true
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

        refresh: {
            type: "boolean",

            default: false,
        },
    },
} as const;

/*
 * =========================================================
 * ANALYZE QUERY
 * =========================================================
 *
 * O endpoint de snapshot não precisa de
 * refresh.
 */

export const analyzeQuerySchema = {
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

    querystring: refreshQuerySchema,
} as const;

export const analyticsRouteSchema = {
    params: repositoryParamsSchema,

    querystring: analyticsQuerySchema,
} as const;

export const analyzeRouteSchema = {
    params: repositoryParamsSchema,

    querystring: analyzeQuerySchema,
} as const;

export const historyRouteSchema = {
    params: repositoryParamsSchema,

    querystring: historyQuerySchema,
} as const;
