import "dotenv/config";

import { buildApp } from "./app.js";

import { env, validateEnvironment } from "./config/env.js";

/*
 * =========================================================
 * ENVIRONMENT VALIDATION
 * =========================================================
 *
 * Antes de abrir a porta HTTP, validamos
 * todas as configurações críticas.
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
        },

        "DevPulse API started"
    );
} catch (error) {
    app.log.error(error);

    process.exit(1);
}

/*
 * =========================================================
 * GRACEFUL SHUTDOWN
 * =========================================================
 */

let shuttingDown = false;

async function shutdown(signal: string) {
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

    try {
        await app.close();

        app.log.info("DevPulse API stopped");

        process.exit(0);
    } catch (error) {
        app.log.error(error);

        process.exit(1);
    }
}

/*
 * Docker / Linux shutdown.
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
