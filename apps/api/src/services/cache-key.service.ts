import { createHash } from "node:crypto";

export class CacheKeyService {
    /*
     * =====================================================
     * ACCESS SCOPE
     * =====================================================
     *
     * Sem token:
     *
     * public
     *
     * Com token:
     *
     * auth:<sha256>
     *
     * O token nunca aparece diretamente
     * no cache.
     */

    getAccessScope(accessToken?: string): string {
        const token = accessToken?.trim();

        if (!token) {
            return "public";
        }

        const hash = createHash("sha256").update(token).digest("hex");

        return `auth:${hash}`;
    }

    /*
     * =====================================================
     * REPOSITORY KEY
     * =====================================================
     */

    repository(
        owner: string,

        repo: string,

        accessToken?: string
    ): string {
        return [
            this.getAccessScope(accessToken),

            "repository",

            this.normalize(owner),

            this.normalize(repo),
        ].join(":");
    }

    /*
     * =====================================================
     * ANALYTICS KEY
     * =====================================================
     */

    analytics(
        owner: string,

        repo: string,

        days: number,

        accessToken?: string
    ): string {
        return [
            this.getAccessScope(accessToken),

            "analytics",

            this.normalize(owner),

            this.normalize(repo),

            String(days),
        ].join(":");
    }

    /*
     * =====================================================
     * NORMALIZATION
     * =====================================================
     */

    private normalize(value: string): string {
        return value.trim().toLowerCase();
    }
}

export const cacheKeyService = new CacheKeyService();
