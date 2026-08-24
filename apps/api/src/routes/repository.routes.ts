import type { FastifyInstance } from "fastify";

import { RepositoryController } from "../controllers/repository.controller.js";

const repositoryController = new RepositoryController();

export async function repositoryRoutes(app: FastifyInstance) {
    app.get("/repositories/:owner/:repo", repositoryController.show.bind(repositoryController));
}
