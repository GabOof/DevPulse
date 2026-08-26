import "dotenv/config";

import { buildApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 3333);

const HOST = process.env.HOST ?? "0.0.0.0";

async function start() {
    const app = await buildApp({
        logger: true,
    });

    try {
        await app.listen({
            port: PORT,
            host: HOST,
        });

        app.log.info(`DevPulse API running on port ${PORT}`);
    } catch (error) {
        app.log.error(error);

        process.exit(1);
    }
}

void start();
