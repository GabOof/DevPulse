import "dotenv/config";

import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";

import cookie from "@fastify/cookie";
import cors from "@fastify/cors";

import { repositoryRoutes } from "./routes/repository.routes.js";

import { authRoutes } from "./routes/auth.routes.js";

export async function buildApp(options: FastifyServerOptions = {}): Promise<FastifyInstance> {
    const app = Fastify(options);

    /*
     * ==========================
     * CORS
     * ==========================
     */

    await app.register(cors, {
        origin: process.env.FRONTEND_URL ?? "http://localhost:5173",

        credentials: true,
    });

    /*
     * ==========================
     * COOKIES
     * ==========================
     *
     * Precisa ser registrado antes
     * das rotas de autenticação.
     */

    await app.register(cookie);

    /*
     * ==========================
     * HEALTH CHECK
     * ==========================
     */

    app.get("/health", async () => {
        return {
            status: "ok",

            service: "devpulse-api",
        };
    });

    /*
     * ==========================
     * REPOSITORY ROUTES
     * ==========================
     */

    await app.register(repositoryRoutes, {
        prefix: "/api",
    });

    /*
     * ==========================
     * AUTH ROUTES
     * ==========================
     */

    await app.register(authRoutes, {
        prefix: "/api/auth",
    });

    return app;
}
