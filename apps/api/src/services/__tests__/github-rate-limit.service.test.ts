import { beforeEach, describe, expect, it, vi } from "vitest";

import { CacheKeyService } from "../cache-key.service.js";

import { GitHubRateLimitService } from "../github-rate-limit.service.js";

describe("GitHubRateLimitService", () => {
    let service: GitHubRateLimitService;

    beforeEach(() => {
        service = new GitHubRateLimitService(new CacheKeyService());

        vi.useFakeTimers();

        vi.setSystemTime(new Date("2026-08-27T12:00:00Z"));
    });

    /*
     * =================================================
     * CAPTURE
     * =================================================
     */

    it("deve capturar headers de rate limit", () => {
        const headers = new Headers({
            "x-ratelimit-limit": "5000",

            "x-ratelimit-remaining": "4875",

            "x-ratelimit-used": "125",

            "x-ratelimit-reset": "1787835600",

            "x-ratelimit-resource": "core",
        });

        const result = service.observe(headers);

        expect(result).not.toBeNull();

        expect(result?.limit).toBe(5000);

        expect(result?.remaining).toBe(4875);

        expect(result?.used).toBe(125);

        expect(result?.resource).toBe("core");
    });

    /*
     * =================================================
     * OBSERVED AT
     * =================================================
     */

    it("deve registrar momento da observação", () => {
        const headers = new Headers({
            "x-ratelimit-limit": "5000",
        });

        const result = service.observe(headers);

        expect(result?.observedAt).toBe("2026-08-27T12:00:00.000Z");
    });

    /*
     * =================================================
     * NO HEADERS
     * =================================================
     */

    it("não deve criar snapshot sem headers relevantes", () => {
        const result = service.observe(new Headers());

        expect(result).toBeNull();

        expect(service.get()).toBeNull();
    });

    /*
     * =================================================
     * PUBLIC
     * =================================================
     */

    it("deve armazenar snapshot público", () => {
        service.observe(
            new Headers({
                "x-ratelimit-remaining": "50",
            })
        );

        expect(service.get()?.remaining).toBe(50);
    });

    /*
     * =================================================
     * TOKEN ISOLATION
     * =================================================
     */

    it("deve separar rate limit entre tokens", () => {
        service.observe(
            new Headers({
                "x-ratelimit-remaining": "4000",
            }),

            "ghu_user_a"
        );

        service.observe(
            new Headers({
                "x-ratelimit-remaining": "2000",
            }),

            "ghu_user_b"
        );

        expect(service.get("ghu_user_a")?.remaining).toBe(4000);

        expect(service.get("ghu_user_b")?.remaining).toBe(2000);
    });

    /*
     * =================================================
     * UPDATE
     * =================================================
     */

    it("nova resposta deve atualizar snapshot", () => {
        service.observe(
            new Headers({
                "x-ratelimit-remaining": "100",
            })
        );

        service.observe(
            new Headers({
                "x-ratelimit-remaining": "99",
            })
        );

        expect(service.get()?.remaining).toBe(99);
    });

    /*
     * =================================================
     * RETRY AFTER
     * =================================================
     */

    it("deve capturar Retry-After", () => {
        service.observe(
            new Headers({
                "retry-after": "60",

                "x-ratelimit-remaining": "0",
            })
        );

        expect(service.get()?.retryAfterSeconds).toBe(60);
    });
});
