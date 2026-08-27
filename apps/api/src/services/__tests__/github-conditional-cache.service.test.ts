import { beforeEach, describe, expect, it, vi } from "vitest";

import { CacheKeyService } from "../cache-key.service.js";

import { GitHubConditionalCacheService } from "../github-conditional-cache.service.js";

describe("GitHubConditionalCacheService", () => {
    let service: GitHubConditionalCacheService;

    beforeEach(() => {
        vi.useFakeTimers();

        vi.setSystemTime(new Date("2026-08-27T12:00:00Z"));

        service = new GitHubConditionalCacheService(new CacheKeyService());
    });

    it("deve armazenar ETag e dados", () => {
        const url = "https://api.github.com/repos/GabOof/DevPulse";

        service.set(
            url,

            '"repo-v1"',

            {
                name: "DevPulse",
            }
        );

        const result = service.get<{
            name: string;
        }>(url);

        expect(result).toEqual({
            etag: '"repo-v1"',

            data: {
                name: "DevPulse",
            },

            storedAt: "2026-08-27T12:00:00.000Z",
        });
    });

    it("deve retornar null quando não existir entrada", () => {
        expect(service.get("https://api.github.com/repos/GabOof/DevPulse")).toBeNull();
    });

    it("deve separar cache público e autenticado", () => {
        const url = "https://api.github.com/repos/GabOof/DevPulse";

        service.set(
            url,

            '"public"',

            {
                version: "public",
            }
        );

        service.set(
            url,

            '"private"',

            {
                version: "private",
            },

            "ghu_user"
        );

        expect(
            service.get<{
                version: string;
            }>(url)?.data.version
        ).toBe("public");

        expect(
            service.get<{
                version: string;
            }>(url, "ghu_user")?.data.version
        ).toBe("private");
    });

    it("deve separar tokens diferentes", () => {
        const url = "https://api.github.com/repos/company/private";

        service.set(
            url,
            '"a"',
            {
                user: "A",
            },
            "ghu_a"
        );

        service.set(
            url,
            '"b"',
            {
                user: "B",
            },
            "ghu_b"
        );

        expect(
            service.get<{
                user: string;
            }>(url, "ghu_a")?.data.user
        ).toBe("A");

        expect(
            service.get<{
                user: string;
            }>(url, "ghu_b")?.data.user
        ).toBe("B");
    });

    it("deve ignorar ETag vazio", () => {
        service.set("https://api.github.com/test", " ", {
            test: true,
        });

        expect(service.size()).toBe(0);
    });

    it("deve remover entrada", () => {
        const url = "https://api.github.com/test";

        service.set(url, '"v1"', {
            test: true,
        });

        expect(service.delete(url)).toBe(true);

        expect(service.get(url)).toBeNull();
    });

    it("deve limpar todas as entradas", () => {
        service.set("https://api.github.com/a", '"a"', {});

        service.set("https://api.github.com/b", '"b"', {});

        service.clear();

        expect(service.size()).toBe(0);
    });
});
