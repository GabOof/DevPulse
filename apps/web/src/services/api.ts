import type { Repository } from "../types/repository";

import type {
    AnalyticsPeriod,
    RepositoryAnalytics,
    RepositoryHistory,
    SavedAnalysisResponse,
} from "../types/analytics";

import { API_URL } from "../config/api";

/*
 * =========================================================
 * API TYPES
 * =========================================================
 */

interface ApiError {
    error: string;

    message: string;
}

export type DevPulseCacheStatus = "HIT" | "MISS" | "COALESCED";

export interface GitHubRateLimitMeta {
    limit: number | null;

    remaining: number | null;

    used: number | null;

    resetAt: string | null;

    resource: string | null;

    retryAfterSeconds: number | null;

    observedAt: string | null;
}

export interface ApiResponseMeta {
    cache: DevPulseCacheStatus | null;

    githubRateLimit: GitHubRateLimitMeta | null;
}

export interface ApiDataResponse<T> {
    data: T;

    meta: ApiResponseMeta;
}

interface RefreshOptions {
    refresh?: boolean;
}

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function parseNumberHeader(value: string | null): number | null {
    if (value === null || value.trim() === "") {
        return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
}

function parseCacheStatus(value: string | null): DevPulseCacheStatus | null {
    if (value === "HIT" || value === "MISS" || value === "COALESCED") {
        return value;
    }

    return null;
}

function readResponseMeta(response: Response): ApiResponseMeta {
    const cache = parseCacheStatus(response.headers.get("x-devpulse-cache"));

    const limit = parseNumberHeader(response.headers.get("x-devpulse-github-limit"));

    const remaining = parseNumberHeader(response.headers.get("x-devpulse-github-remaining"));

    const used = parseNumberHeader(response.headers.get("x-devpulse-github-used"));

    const resetAt = response.headers.get("x-devpulse-github-reset");

    const resource = response.headers.get("x-devpulse-github-resource");

    const retryAfterSeconds = parseNumberHeader(
        response.headers.get("x-devpulse-github-retry-after")
    );

    const observedAt = response.headers.get("x-devpulse-github-observed-at");

    const hasRateLimit =
        limit !== null ||
        remaining !== null ||
        used !== null ||
        resetAt !== null ||
        resource !== null ||
        retryAfterSeconds !== null ||
        observedAt !== null;

    return {
        cache,

        githubRateLimit: hasRateLimit
            ? {
                  limit,

                  remaining,

                  used,

                  resetAt,

                  resource,

                  retryAfterSeconds,

                  observedAt,
              }
            : null,
    };
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        let message = "Não foi possível concluir a solicitação.";

        try {
            const data = (await response.json()) as ApiError;

            message = data.message || message;
        } catch {
            /*
             * Mantemos mensagem padrão.
             */
        }

        throw new Error(message);
    }

    return (await response.json()) as T;
}

async function handleResponseWithMeta<T>(response: Response): Promise<ApiDataResponse<T>> {
    /*
     * Lemos os headers antes/depois do body
     * sem problema, pois Headers continuam
     * disponíveis após response.json().
     */

    const meta = readResponseMeta(response);

    const data = await handleResponse<T>(response);

    return {
        data,
        meta,
    };
}

/*
 * =========================================================
 * REPOSITORY
 * =========================================================
 */

export async function getRepository(
    owner: string,

    repo: string,

    options: RefreshOptions = {}
): Promise<ApiDataResponse<Repository>> {
    const params = new URLSearchParams();

    if (options.refresh) {
        params.set("refresh", "true");
    }

    const query = params.size > 0 ? `?${params.toString()}` : "";

    const response = await fetch(
        `${API_URL}/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
        )}${query}`,

        {
            credentials: "include",
        }
    );

    return handleResponseWithMeta<Repository>(response);
}

/*
 * =========================================================
 * ANALYTICS
 * =========================================================
 */

export async function getRepositoryAnalytics(
    owner: string,

    repo: string,

    days: AnalyticsPeriod = 30,

    options: RefreshOptions = {}
): Promise<ApiDataResponse<RepositoryAnalytics>> {
    const params = new URLSearchParams({
        days: String(days),
    });

    if (options.refresh) {
        params.set("refresh", "true");
    }

    const response = await fetch(
        `${API_URL}/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
        )}/analytics?${params.toString()}`,

        {
            credentials: "include",
        }
    );

    return handleResponseWithMeta<RepositoryAnalytics>(response);
}

/*
 * =========================================================
 * SAVE SNAPSHOT
 * =========================================================
 */

export async function saveRepositoryAnalysis(
    owner: string,

    repo: string,

    days: AnalyticsPeriod
): Promise<SavedAnalysisResponse> {
    const response = await fetch(
        `${API_URL}/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
        )}/analyze?days=${days}`,

        {
            method: "POST",

            credentials: "include",
        }
    );

    return handleResponse<SavedAnalysisResponse>(response);
}

/*
 * =========================================================
 * HISTORY
 * =========================================================
 */

export async function getRepositoryHistory(
    owner: string,

    repo: string,

    days: AnalyticsPeriod
): Promise<RepositoryHistory> {
    const response = await fetch(
        `${API_URL}/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
        )}/history?days=${days}`,

        {
            credentials: "include",
        }
    );

    return handleResponse<RepositoryHistory>(response);
}
