export type CacheStatus = "HIT" | "MISS" | "COALESCED";

interface CacheEntry<T> {
    value: T;

    createdAt: number;

    expiresAt: number;
}

export interface CacheStats {
    hits: number;

    misses: number;

    sets: number;

    deduplicated: number;

    size: number;
}

export interface CacheResult<T> {
    value: T;

    status: CacheStatus;
}

export interface CacheGetOrSetOptions {
    forceRefresh?: boolean;
}

export class CacheService {
    /*
     * =====================================================
     * CACHE
     * =====================================================
     */

    private readonly cache = new Map<string, CacheEntry<unknown>>();

    /*
     * =====================================================
     * REQUESTS EM ANDAMENTO
     * =====================================================
     *
     * Evita várias chamadas simultâneas
     * para a mesma chave.
     */

    private readonly inFlight = new Map<string, Promise<unknown>>();

    /*
     * =====================================================
     * STATS
     * =====================================================
     */

    private hits = 0;

    private misses = 0;

    private sets = 0;

    private deduplicated = 0;

    /*
     * =====================================================
     * GET
     * =====================================================
     */

    get<T>(key: string): T | undefined {
        const entry = this.cache.get(key);

        if (!entry) {
            this.misses++;

            return undefined;
        }

        if (this.isExpired(entry)) {
            this.cache.delete(key);

            this.misses++;

            return undefined;
        }

        this.hits++;

        return entry.value as T;
    }

    /*
     * =====================================================
     * PEEK
     * =====================================================
     *
     * Consulta sem alterar estatísticas.
     */

    peek<T>(key: string): T | undefined {
        const entry = this.cache.get(key);

        if (!entry) {
            return undefined;
        }

        if (this.isExpired(entry)) {
            this.cache.delete(key);

            return undefined;
        }

        return entry.value as T;
    }

    /*
     * =====================================================
     * SET
     * =====================================================
     */

    set<T>(
        key: string,

        value: T,

        ttlMs: number
    ): void {
        this.validateTtl(ttlMs);

        const now = Date.now();

        this.cache.set(key, {
            value,

            createdAt: now,

            expiresAt: now + ttlMs,
        });

        this.sets++;
    }

    /*
     * =====================================================
     * DELETE
     * =====================================================
     */

    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /*
     * =====================================================
     * CLEAR
     * =====================================================
     */

    clear(): void {
        this.cache.clear();

        this.inFlight.clear();

        this.resetStats();
    }

    /*
     * =====================================================
     * HAS
     * =====================================================
     */

    has(key: string): boolean {
        return this.peek(key) !== undefined;
    }

    /*
     * =====================================================
     * GET OR SET
     * =====================================================
     */

    async getOrSet<T>(
        key: string,

        ttlMs: number,

        factory: () => Promise<T>,

        options: CacheGetOrSetOptions = {}
    ): Promise<T> {
        const result = await this.getOrSetWithMeta(key, ttlMs, factory, options);

        return result.value;
    }

    /*
     * =====================================================
     * GET OR SET WITH META
     * =====================================================
     *
     * HIT
     *   valor veio do cache.
     *
     * MISS
     *   foi necessário executar factory.
     *
     * COALESCED
     *   outra chamada para a mesma chave
     *   já estava sendo executada.
     */

    async getOrSetWithMeta<T>(
        key: string,

        ttlMs: number,

        factory: () => Promise<T>,

        options: CacheGetOrSetOptions = {}
    ): Promise<CacheResult<T>> {
        this.validateTtl(ttlMs);

        const forceRefresh = options.forceRefresh ?? false;

        /*
         * =============================================
         * CACHE HIT
         * =============================================
         */

        if (!forceRefresh) {
            const cached = this.get<T>(key);

            if (cached !== undefined) {
                return {
                    value: cached,

                    status: "HIT",
                };
            }
        }

        /*
         * =============================================
         * REQUEST JÁ EM ANDAMENTO
         * =============================================
         */

        const running = this.inFlight.get(key);

        if (running) {
            this.deduplicated++;

            const value = (await running) as T;

            return {
                value,

                status: "COALESCED",
            };
        }

        /*
         * =============================================
         * NOVA REQUEST
         * =============================================
         *
         * Promise.resolve().then(factory)
         * também transforma erro síncrono
         * da factory em Promise rejeitada.
         */

        const promise = Promise.resolve().then(factory);

        this.inFlight.set(key, promise);

        try {
            const value = await promise;

            this.set(key, value, ttlMs);

            return {
                value,

                status: "MISS",
            };
        } finally {
            /*
             * A Promise nunca deve ficar
             * permanentemente na fila,
             * inclusive quando falha.
             */

            this.inFlight.delete(key);
        }
    }

    /*
     * =====================================================
     * STATS
     * =====================================================
     */

    getStats(): CacheStats {
        this.removeExpiredEntries();

        return {
            hits: this.hits,

            misses: this.misses,

            sets: this.sets,

            deduplicated: this.deduplicated,

            size: this.cache.size,
        };
    }

    /*
     * =====================================================
     * RESET STATS
     * =====================================================
     */

    resetStats(): void {
        this.hits = 0;

        this.misses = 0;

        this.sets = 0;

        this.deduplicated = 0;
    }

    /*
     * =====================================================
     * HELPERS
     * =====================================================
     */

    private isExpired(entry: CacheEntry<unknown>): boolean {
        return Date.now() >= entry.expiresAt;
    }

    private validateTtl(ttlMs: number): void {
        if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
            throw new Error("CACHE_INVALID_TTL");
        }
    }

    private removeExpiredEntries(): void {
        for (const [key, entry] of this.cache) {
            if (this.isExpired(entry)) {
                this.cache.delete(key);
            }
        }
    }
}

/*
 * =========================================================
 * GLOBAL INSTANCE
 * =========================================================
 */

export const cacheService = new CacheService();
