import { describe, expect, it } from "vitest";

import { CacheKeyService } from "../cache-key.service.js";

describe("CacheKeyService", () => {
    const service = new CacheKeyService();

    it("deve criar chave pública para usuário anônimo", () => {
        expect(service.repository("GabOof", "DevPulse")).toBe("public:repository:gaboof:devpulse");
    });

    it("deve normalizar owner e repository", () => {
        expect(service.repository("  GABOOF ", " DevPulse ")).toBe(
            "public:repository:gaboof:devpulse"
        );
    });

    it("deve separar analytics pelo período", () => {
        const seven = service.analytics("GabOof", "DevPulse", 7);

        const thirty = service.analytics("GabOof", "DevPulse", 30);

        expect(seven).not.toBe(thirty);

        expect(seven).toBe("public:analytics:gaboof:devpulse:7");

        expect(thirty).toBe("public:analytics:gaboof:devpulse:30");
    });

    it("não deve colocar access token diretamente na chave", () => {
        const token = "ghu_super_secret_token";

        const key = service.repository("GabOof", "PrivateRepo", token);

        expect(key).not.toContain(token);

        expect(key.startsWith("auth:")).toBe(true);
    });

    it("deve produzir a mesma chave para o mesmo token", () => {
        const token = "ghu_token_a";

        const first = service.repository("GabOof", "PrivateRepo", token);

        const second = service.repository("GabOof", "PrivateRepo", token);

        expect(first).toBe(second);
    });

    it("deve isolar usuários com tokens diferentes", () => {
        const userA = service.repository("GabOof", "PrivateRepo", "ghu_user_a");

        const userB = service.repository("GabOof", "PrivateRepo", "ghu_user_b");

        expect(userA).not.toBe(userB);
    });

    it("cache autenticado deve ser diferente do cache público", () => {
        const publicKey = service.repository("GabOof", "DevPulse");

        const authenticatedKey = service.repository("GabOof", "DevPulse", "ghu_user");

        expect(authenticatedKey).not.toBe(publicKey);
    });
});
