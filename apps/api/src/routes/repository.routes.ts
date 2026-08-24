import type { FastifyInstance } from "fastify";

import { AnalyticsController } from "../controllers/analytics.controller.js";
import { RepositoryController } from "../controllers/repository.controller.js";

const repositoryController = new RepositoryController();

const analyticsController = new AnalyticsController();

export async function repositoryRoutes(app: FastifyInstance) {
    app.get("/repositories/:owner/:repo", repositoryController.show.bind(repositoryController));

    app.get(
        "/repositories/:owner/:repo/analytics",
        analyticsController.show.bind(analyticsController)
    );
}
