import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "../config/env.js";

import { PrismaClient } from "../generated/prisma/client.js";

/*
 * =========================================================
 * DATABASE ADAPTER
 * =========================================================
 *
 * DATABASE_URL agora é obtida exclusivamente
 * através da configuração centralizada.
 *
 * env.databaseUrl também garante que a variável
 * obrigatória exista.
 */

const adapter = new PrismaPg({
    connectionString: env.databaseUrl,
});

/*
 * =========================================================
 * PRISMA CLIENT
 * =========================================================
 */

export const prisma = new PrismaClient({
    adapter,
});
