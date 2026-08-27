import { Client } from "pg";

import { env } from "../config/env.js";

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
 * DATABASE
 * =========================================================
 */

async function checkDatabase(): Promise<DatabaseReadinessResult> {
    const startedAt = Date.now();

    /*
     * Criamos uma conexão curta apenas para
     * readiness.
     *
     * Ela é encerrada após SELECT 1.
     *
     * Isso evita deixar outro pool permanente
     * aberto além do utilizado pelo Prisma.
     */

    const client = new Client({
        connectionString: env.databaseUrl,

        connectionTimeoutMillis: 3000,

        application_name: "devpulse-readiness",
    });

    try {
        await client.connect();

        await client.query("SELECT 1");

        return {
            status: "up",

            latencyMs: Date.now() - startedAt,
        };
    } catch {
        return {
            status: "down",

            latencyMs: Date.now() - startedAt,
        };
    } finally {
        try {
            await client.end();
        } catch {
            /*
             * Caso a conexão nem tenha sido
             * estabelecida, não propagamos
             * erro de encerramento.
             */
        }
    }
}

/*
 * =========================================================
 * READINESS
 * =========================================================
 */

export async function checkReadiness(): Promise<ReadinessResult> {
    const database = await checkDatabase();

    const ready = database.status === "up";

    return {
        status: ready ? "ready" : "not_ready",

        service: "devpulse-api",

        checks: {
            database,
        },
    };
}
