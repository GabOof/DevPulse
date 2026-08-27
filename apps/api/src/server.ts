import "dotenv/config";

import { buildApp } from "./app.js";

import { env, validateEnvironment } from "./config/env.js";

import { prisma } from "./lib/prisma.js";

/*
 * =========================================================
 * ENVIRONMENT VALIDATION
 * =========================================================
 */

try {
    validateEnvironment();
} catch (error) {
    console.error("Invalid DevPulse environment configuration.");

    console.error(error);

    process.exit(1);
}

/*
 * =========================================================
 * APPLICATION
 * =========================================================
 */

const app = await buildApp({
    logger: true,
});

/*
 * =========================================================
 * START SERVER
 * =========================================================
 */

try {
    await app.listen({
        host: env.host,

        port: env.port,
    });

    app.log.info(
        {
            host: env.host,

            port: env.port,

            environment: env.nodeEnv,

            trustProxy: env.trustProxy,
        },

        "DevPulse API started"
    );
} catch (error) {
    app.log.error(error);

    /*
     * Caso o Prisma tenha sido inicializado
     * durante o bootstrap, encerramos também.
     */

    try {
        await prisma.$disconnect();
    } catch {
        /*
         * Não substituímos o erro original
         * de inicialização.
         */
    }

    process.exit(1);
}

/*
 * =========================================================
 * GRACEFUL SHUTDOWN
 * =========================================================
 */

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;

    app.log.info(
        {
            signal,
        },

        "Shutting down DevPulse API"
    );

    let exitCode = 0;

    /*
     * =====================================================
     * FASTIFY
     * =====================================================
     */

    try {
        await app.close();

        app.log.info("Fastify server closed");
    } catch (error) {
        exitCode = 1;

        app.log.error(
            error,

            "Failed to close Fastify server"
        );
    }

    /*
     * =====================================================
     * PRISMA
     * =====================================================
     */

    try {
        await prisma.$disconnect();

        app.log.info("Prisma disconnected");
    } catch (error) {
        exitCode = 1;

        app.log.error(
            error,

            "Failed to disconnect Prisma"
        );
    }

    /*
     * Não usamos process.exit() aqui
     * porque isso pode interromper logs
     * ou operações pendentes.
     */

    process.exitCode = exitCode;
}

/*
 * Docker / Kubernetes / providers.
 */

process.on(
    "SIGTERM",

    () => {
        void shutdown("SIGTERM");
    }
);

/*
 * Ctrl+C.
 */

process.on(
    "SIGINT",

    () => {
        void shutdown("SIGINT");
    }
);
