import type { FastifyInstance } from "fastify";

import { RepositoryController } from "../controllers/repository.controller.js";

import { AnalyticsController } from "../controllers/analytics.controller.js";

import { HistoryController } from "../controllers/history.controller.js";

import {
    analyticsRouteSchema,
    analyzeRouteSchema,
    historyRouteSchema,
    repositoryRouteSchema,
} from "../schemas/repository.schema.js";

const repositoryController = new RepositoryController();

const analyticsController = new AnalyticsController();

const historyController = new HistoryController();

export async function repositoryRoutes(app: FastifyInstance) {
    /*
     * =====================================================
     * REPOSITORY OVERVIEW
     * =====================================================
     */

    app.get(
        "/repositories/:owner/:repo",

        {
            schema: repositoryRouteSchema,
        },

        repositoryController.show.bind(repositoryController)
    );

    /*
     * =====================================================
     * ANALYTICS
     * =====================================================
     */

    app.get(
        "/repositories/:owner/:repo/analytics",

        {
            schema: analyticsRouteSchema,
        },

        analyticsController.show.bind(analyticsController)
    );

    /*
     * =====================================================
     * SAVE SNAPSHOT
     * =====================================================
     */

    app.post(
        "/repositories/:owner/:repo/analyze",

        {
            schema: analyzeRouteSchema,
        },

        historyController.analyze.bind(historyController)
    );

    /*
     * =====================================================
     * HISTORY
     * =====================================================
     */

    app.get(
        "/repositories/:owner/:repo/history",

        {
            schema: historyRouteSchema,
        },

        historyController.history.bind(historyController)
    );
}
