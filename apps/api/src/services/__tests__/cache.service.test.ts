import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CacheService } from "../cache.service.js";

describe("CacheService", () => {
    let cache: CacheService;

    beforeEach(() => {
        cache = new CacheService();

        vi.useFakeTimers();

        vi.setSystemTime(new Date("2026-08-27T12:00:00Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    /*
     * =================================================
     * SET / GET
     * =================================================
     */

    it("deve salvar e recuperar um valor", () => {
        cache.set(
            "repository:GabOof:DevPulse",

            {
                name: "DevPulse",
            },

            60_000
        );

        const result = cache.get<{
            name: string;
        }>("repository:GabOof:DevPulse");

        expect(result).toEqual({
            name: "DevPulse",
        });
    });

    /*
     * =================================================
     * MISS
     * =================================================
     */

    it("deve retornar undefined para chave inexistente", () => {
        expect(cache.get("not-found")).toBeUndefined();
    });

    /*
     * =================================================
     * TTL
     * =================================================
     */

    it("deve expirar valor após o TTL", () => {
        cache.set(
            "repository",

            {
                name: "DevPulse",
            },

            1_000
        );

        /*
         * Antes de expirar.
         */

        vi.advanceTimersByTime(999);

        expect(cache.get("repository")).toBeDefined();

        /*
         * Exatamente no limite
         * deve ser considerado
         * expirado.
         */

        vi.advanceTimersByTime(1);

        expect(cache.get("repository")).toBeUndefined();
    });

    /*
     * =================================================
     * DELETE
     * =================================================
     */

    it("deve remover uma entrada específica", () => {
        cache.set(
            "repository",

            "DevPulse",

            60_000
        );

        const removed = cache.delete("repository");

        expect(removed).toBe(true);

        expect(cache.get("repository")).toBeUndefined();
    });

    /*
     * =================================================
     * CLEAR
     * =================================================
     */

    it("deve limpar todas as entradas", () => {
        cache.set("repository:1", "one", 60_000);

        cache.set("repository:2", "two", 60_000);

        cache.clear();

        expect(cache.getStats().size).toBe(0);
    });

    /*
     * =================================================
     * INVALID TTL
     * =================================================
     */

    it("deve rejeitar TTL igual ou menor que zero", () => {
        expect(() =>
            cache.set(
                "repository",

                "DevPulse",

                0
            )
        ).toThrow("CACHE_INVALID_TTL");
    });

    /*
     * =================================================
     * GET OR SET
     * =================================================
     */

    it("deve executar factory quando não existir cache", async () => {
        const factory = vi.fn(async () => ({
            name: "DevPulse",
        }));

        const result = await cache.getOrSet(
            "repository",

            60_000,

            factory
        );

        expect(result).toEqual({
            name: "DevPulse",
        });

        expect(factory).toHaveBeenCalledTimes(1);
    });

    it("deve usar cache e não executar factory novamente", async () => {
        const factory = vi.fn(async () => ({
            name: "DevPulse",
        }));

        await cache.getOrSet(
            "repository",

            60_000,

            factory
        );

        const result = await cache.getOrSet(
            "repository",

            60_000,

            factory
        );

        expect(result).toEqual({
            name: "DevPulse",
        });

        expect(factory).toHaveBeenCalledTimes(1);
    });

    /*
     * =================================================
     * FORCE REFRESH
     * =================================================
     */

    it("deve ignorar cache quando forceRefresh for true", async () => {
        const factory = vi.fn();

        factory
            .mockResolvedValueOnce({
                version: 1,
            })
            .mockResolvedValueOnce({
                version: 2,
            });

        const first = await cache.getOrSet(
            "repository",

            60_000,

            factory
        );

        const second = await cache.getOrSet(
            "repository",

            60_000,

            factory,

            {
                forceRefresh: true,
            }
        );

        expect(first).toEqual({
            version: 1,
        });

        expect(second).toEqual({
            version: 2,
        });

        expect(factory).toHaveBeenCalledTimes(2);
    });

    /*
     * =================================================
     * REQUEST DEDUPLICATION
     * =================================================
     */

    it("deve deduplicar requisições simultâneas", async () => {
        let resolveFactory: (value: { name: string }) => void = () => {};

        const factory = vi.fn(
            () =>
                new Promise<{
                    name: string;
                }>((resolve) => {
                    resolveFactory = resolve;
                })
        );

        /*
         * Três solicitações simultâneas
         * para a mesma chave.
         */

        const request1 = cache.getOrSet(
            "repository",

            60_000,

            factory
        );

        const request2 = cache.getOrSet(
            "repository",

            60_000,

            factory
        );

        const request3 = cache.getOrSet(
            "repository",

            60_000,

            factory
        );

        /*
         * A factory é iniciada através de:
         *
         * Promise.resolve().then(factory)
         *
         * Portanto precisamos permitir que
         * a fila de microtasks execute antes
         * de verificar o mock.
         */

        await Promise.resolve();

        /*
         * Mesmo com três solicitações,
         * apenas uma factory deve executar.
         */

        expect(factory).toHaveBeenCalledTimes(1);

        /*
         * Finaliza a consulta simulada.
         */

        resolveFactory({
            name: "DevPulse",
        });

        const results = await Promise.all([request1, request2, request3]);

        expect(results).toEqual([
            {
                name: "DevPulse",
            },

            {
                name: "DevPulse",
            },

            {
                name: "DevPulse",
            },
        ]);

        /*
         * Continua tendo apenas uma
         * execução real.
         */

        expect(factory).toHaveBeenCalledTimes(1);

        /*
         * As outras duas solicitações
         * reutilizaram a Promise em andamento.
         */

        expect(cache.getStats().deduplicated).toBe(2);
    });

    /*
     * =================================================
     * FAILED REQUEST
     * =================================================
     */

    it("não deve armazenar resultado quando factory falhar", async () => {
        const factory = vi
            .fn()
            .mockRejectedValueOnce(new Error("GitHub unavailable"))
            .mockResolvedValueOnce({
                name: "DevPulse",
            });

        await expect(
            cache.getOrSet(
                "repository",

                60_000,

                factory
            )
        ).rejects.toThrow("GitHub unavailable");

        /*
         * Segunda tentativa deve
         * executar factory novamente.
         */

        const result = await cache.getOrSet(
            "repository",

            60_000,

            factory
        );

        expect(result).toEqual({
            name: "DevPulse",
        });

        expect(factory).toHaveBeenCalledTimes(2);
    });

    /*
     * =================================================
     * STATS
     * =================================================
     */

    it("deve registrar hits e misses", () => {
        cache.set(
            "repository",

            "DevPulse",

            60_000
        );

        /*
         * HIT
         */

        cache.get("repository");

        /*
         * MISS
         */

        cache.get("unknown");

        const stats = cache.getStats();

        expect(stats.hits).toBe(1);

        expect(stats.misses).toBe(1);

        expect(stats.sets).toBe(1);

        expect(stats.size).toBe(1);
    });

    /*
     * =================================================
     * RESET STATS
     * =================================================
     */

    it("deve resetar estatísticas sem apagar cache", () => {
        cache.set(
            "repository",

            "DevPulse",

            60_000
        );

        cache.get("repository");

        cache.resetStats();

        const stats = cache.getStats();

        expect(stats.hits).toBe(0);

        expect(stats.misses).toBe(0);

        expect(stats.sets).toBe(0);

        expect(stats.deduplicated).toBe(0);

        /*
         * Cache continua existindo.
         */
        expect(stats.size).toBe(1);
    });
});
