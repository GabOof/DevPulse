import { prisma } from "../lib/prisma.js";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

export interface DatabaseReadinessResult {
    status: "up" | "down";

    latencyMs: number;
}

export interface ReadinessResult {
    status: "ready" | "not_ready";

    service: "devpulse-api";

    checks: {
        database: DatabaseReadinessResult;
    };
}

/*
 * =========================================================
 * DATABASE CHECK
 * =========================================================
 */

async function checkDatabase(): Promise<DatabaseReadinessResult> {
    const startedAt = Date.now();

    try {
        /*
         * A consulta passa pelo mesmo
         * Prisma utilizado pelo restante
         * da aplicação.
         */

        await prisma.$queryRawUnsafe("SELECT 1");

        return {
            status: "up",

            latencyMs: Date.now() - startedAt,
        };
    } catch {
        /*
         * Não retornamos detalhes internos
         * do PostgreSQL ao cliente.
         */

        return {
            status: "down",

            latencyMs: Date.now() - startedAt,
        };
    }
}

/*
 * =========================================================
 * READINESS
 * =========================================================
 */

export async function checkReadiness(): Promise<ReadinessResult> {
    const database = await checkDatabase();

    return {
        status: database.status === "up" ? "ready" : "not_ready",

        service: "devpulse-api",

        checks: {
            database,
        },
    };
}
