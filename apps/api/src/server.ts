import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import "dotenv/config";
import Fastify from "fastify";

import { authRoutes } from "./routes/auth.routes.js";
import { repositoryRoutes } from "./routes/repository.routes.js";

const app = Fastify({
    logger: true,
});

await app.register(cookie);

await app.register(cors, {
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",

    credentials: true,
});

app.get("/health", async () => {
    return {
        status: "ok",
        service: "devpulse-api",
    };
});

await app.register(authRoutes, {
    prefix: "/api/auth",
});

await app.register(repositoryRoutes, {
    prefix: "/api",
});

const start = async () => {
    try {
        await app.listen({
            port: 3333,
            host: "0.0.0.0",
        });

        console.log("DevPulse API rodando em http://localhost:3333");
    } catch (error) {
        app.log.error(error);
        process.exit(1);
    }
};

start();
