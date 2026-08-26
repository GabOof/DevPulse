import type { FastifyInstance } from "fastify";

import { AnalyticsController } from "../controllers/analytics.controller.js";
import { RepositoryController } from "../controllers/repository.controller.js";

import { HistoryController } from "../controllers/history.controller.js";

const repositoryController = new RepositoryController();

const analyticsController = new AnalyticsController();

const historyController = new HistoryController();

export async function repositoryRoutes(app: FastifyInstance) {
    app.get("/repositories/:owner/:repo", repositoryController.show.bind(repositoryController));

    app.get(
        "/repositories/:owner/:repo/analytics",
        analyticsController.show.bind(analyticsController)
    );

    app.post(
        "/repositories/:owner/:repo/analyze",
        historyController.analyze.bind(historyController)
    );

    app.get(
        "/repositories/:owner/:repo/history",
        historyController.history.bind(historyController)
    );
}
