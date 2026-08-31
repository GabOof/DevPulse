import { onRequest } from "firebase-functions/v2/https";

import { buildApp } from "./app.js";

import { validateEnvironment } from "./config/env.js";

/**
 * =========================================================
 * FIREBASE FASTIFY INSTANCE
 * =========================================================
 *
 * A aplicação é inicializada somente quando
 * a primeira requisição chegar.
 *
 * Depois disso, a mesma Promise é reutilizada
 * enquanto a instância da Cloud Function
 * permanecer ativa.
 */

let appPromise: ReturnType<typeof buildApp> | null = null;

/**
 * =========================================================
 * GET APP
 * =========================================================
 */

function getApp(): ReturnType<typeof buildApp> {
    if (!appPromise) {
        appPromise = createApp();
    }

    return appPromise;
}

/**
 * =========================================================
 * CREATE APP
 * =========================================================
 */

async function createApp() {
    /**
     * Valida o ambiente somente durante
     * a inicialização real da função.
     */

    validateEnvironment();

    const app = await buildApp({
        logger: true,

        /**
         * Cloud Functions 2nd gen roda
         * atrás da infraestrutura HTTP
         * do Google Cloud.
         */

        trustProxy: true,

        /**
         * Ativa o parser adaptado ao
         * Firebase Functions.
         */

        firebaseFunctions: true,
    });

    /**
     * Garante que plugins e rotas estejam
     * completamente registrados antes da
     * primeira requisição.
     */

    await app.ready();

    return app;
}

/**
 * =========================================================
 * FIREBASE HTTP FUNCTION
 * =========================================================
 *
 * Região:
 *
 * southamerica-east1 = São Paulo
 *
 * O Fastify continua responsável pelo CORS,
 * portanto desabilitamos a camada automática
 * de CORS do Firebase.
 */

export const api = onRequest(
    {
        region: "southamerica-east1",

        cors: false,

        timeoutSeconds: 120,

        memory: "512MiB",

        minInstances: 0,
    },

    async (request, response) => {
        const app = await getApp();

        /**
         * Firebase fornece objetos HTTP
         * compatíveis com o servidor Node.
         *
         * Encaminhamos diretamente para
         * o servidor interno do Fastify.
         */

        app.server.emit("request", request, response);
    }
);
