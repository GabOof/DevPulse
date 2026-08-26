import type { FastifyInstance } from "fastify";

import { AuthController } from "../controllers/auth.controller.js";

const authController = new AuthController();

export async function authRoutes(app: FastifyInstance) {
    app.get("/github", authController.github.bind(authController));

    app.get("/github/callback", authController.callback.bind(authController));

    app.get("/me", authController.me.bind(authController));

    app.post("/logout", authController.logout.bind(authController));
}
