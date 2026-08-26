import { createHash, randomBytes } from "node:crypto";

import { prisma } from "../lib/prisma.js";

const SESSION_DURATION_DAYS = 7;

export class SessionService {
    private hashToken(token: string): string {
        return createHash("sha256").update(token).digest("hex");
    }

    async create(userId: string) {
        const token = randomBytes(32).toString("hex");

        const tokenHash = this.hashToken(token);

        const expiresAt = new Date();

        expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

        const session = await prisma.session.create({
            data: {
                userId,

                tokenHash,

                expiresAt,
            },
        });

        return {
            token,

            expiresAt: session.expiresAt,
        };
    }

    async findUserByToken(token: string) {
        const tokenHash = this.hashToken(token);

        const session = await prisma.session.findUnique({
            where: {
                tokenHash,
            },

            include: {
                user: true,
            },
        });

        if (!session) {
            return null;
        }

        if (session.expiresAt < new Date()) {
            await prisma.session.delete({
                where: {
                    id: session.id,
                },
            });

            return null;
        }

        return session.user;
    }

    async revoke(token: string) {
        const tokenHash = this.hashToken(token);

        await prisma.session.deleteMany({
            where: {
                tokenHash,
            },
        });
    }
}
