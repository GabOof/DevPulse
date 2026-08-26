import { prisma } from "../lib/prisma.js";

async function main() {
    const repositories = await prisma.repository.findMany();

    console.log("Conexão com PostgreSQL funcionando.");

    console.log(`Repositórios armazenados: ${repositories.length}`);
}

main()
    .catch((error) => {
        console.error("Erro ao testar banco:", error);

        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
