import type { ApiResponseMeta, DevPulseCacheStatus, GitHubRateLimitMeta } from "../services/api";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

interface ApiStatusPanelProps {
    repositoryMeta: ApiResponseMeta | null;

    analyticsMeta: ApiResponseMeta | null;

    refreshing: boolean;

    onRefresh: () => Promise<void>;
}

type RateLimitStatus = "healthy" | "warning" | "critical" | "unknown";

/*
 * =========================================================
 * FORMATTERS
 * =========================================================
 */

const integerFormatter = new Intl.NumberFormat("pt-BR");

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",

    month: "2-digit",

    hour: "2-digit",

    minute: "2-digit",
});

/*
 * =========================================================
 * CACHE STATUS
 * =========================================================
 */

function formatCacheStatus(status: DevPulseCacheStatus | null): string {
    switch (status) {
        case "HIT":
            return "Cache";

        case "MISS":
            return "GitHub";

        case "COALESCED":
            return "Compartilhada";

        default:
            return "—";
    }
}

/*
 * =========================================================
 * CACHE DESCRIPTION
 * =========================================================
 */

function getCacheDescription(status: DevPulseCacheStatus | null): string {
    switch (status) {
        case "HIT":
            return "Resposta reutilizada";

        case "MISS":
            return "Consultado no GitHub";

        case "COALESCED":
            return "Consulta compartilhada";

        default:
            return "Sem informação";
    }
}

/*
 * =========================================================
 * SAFE INTEGER
 * =========================================================
 */

function formatInteger(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return "—";
    }

    return integerFormatter.format(Math.max(0, Math.round(value)));
}

/*
 * =========================================================
 * DATE
 * =========================================================
 */

function formatDate(value: string | null | undefined): string {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return dateFormatter.format(date);
}

/*
 * =========================================================
 * RATE LIMIT STATUS
 * =========================================================
 */

function getRateLimitStatus(rateLimit: GitHubRateLimitMeta | null): RateLimitStatus {
    if (
        !rateLimit ||
        rateLimit.limit === null ||
        rateLimit.remaining === null ||
        !Number.isFinite(rateLimit.limit) ||
        !Number.isFinite(rateLimit.remaining) ||
        rateLimit.limit <= 0
    ) {
        return "unknown";
    }

    const percentage = rateLimit.remaining / rateLimit.limit;

    if (percentage <= 0.1) {
        return "critical";
    }

    if (percentage <= 0.3) {
        return "warning";
    }

    return "healthy";
}

/*
 * =========================================================
 * RATE LIMIT PERCENTAGE
 * =========================================================
 */

function getRateLimitPercentage(rateLimit: GitHubRateLimitMeta | null): number | null {
    if (
        !rateLimit ||
        rateLimit.limit === null ||
        rateLimit.remaining === null ||
        !Number.isFinite(rateLimit.limit) ||
        !Number.isFinite(rateLimit.remaining) ||
        rateLimit.limit <= 0
    ) {
        return null;
    }

    return Math.min(100, Math.max(0, (rateLimit.remaining / rateLimit.limit) * 100));
}

/*
 * =========================================================
 * RATE STATUS DESCRIPTION
 * =========================================================
 */

function getRateStatusDescription(status: RateLimitStatus): string {
    switch (status) {
        case "healthy":
            return "Quota saudável";

        case "warning":
            return "Quota reduzida";

        case "critical":
            return "Quota crítica";

        default:
            return "Quota desconhecida";
    }
}

/*
 * =========================================================
 * RESOURCE LABEL
 * =========================================================
 */

function formatResource(resource: string | null | undefined): string {
    if (!resource) {
        return "GitHub rate limit";
    }

    return `Recurso: ${resource}`;
}

/*
 * =========================================================
 * RETRY MESSAGE
 * =========================================================
 */

function getRetryMessage(rateLimit: GitHubRateLimitMeta | null): string | null {
    const seconds = rateLimit?.retryAfterSeconds;

    if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) {
        return null;
    }

    const roundedSeconds = Math.ceil(seconds);

    if (roundedSeconds < 60) {
        return `Nova tentativa recomendada em aproximadamente ${roundedSeconds} ${
            roundedSeconds === 1 ? "segundo" : "segundos"
        }.`;
    }

    const minutes = Math.ceil(roundedSeconds / 60);

    return `Nova tentativa recomendada em aproximadamente ${minutes} ${
        minutes === 1 ? "minuto" : "minutos"
    }.`;
}

/*
 * =========================================================
 * API STATUS PANEL
 * =========================================================
 */

export function ApiStatusPanel({
    repositoryMeta,
    analyticsMeta,
    refreshing,
    onRefresh,
}: ApiStatusPanelProps) {
    /*
     * =====================================================
     * RATE LIMIT SOURCE
     * =====================================================
     *
     * Analytics normalmente realiza mais
     * interações com a API do GitHub.
     *
     * Portanto seu snapshot tem prioridade.
     */

    const rateLimit = analyticsMeta?.githubRateLimit ?? repositoryMeta?.githubRateLimit ?? null;

    const rateStatus = getRateLimitStatus(rateLimit);

    const percentage = getRateLimitPercentage(rateLimit);

    const retryMessage = getRetryMessage(rateLimit);

    const repositoryCache = repositoryMeta?.cache ?? null;

    const analyticsCache = analyticsMeta?.cache ?? null;

    return (
        <section className="api-status-panel" aria-labelledby="api-status-title">
            {/* ==========================================
                HEADER
            ========================================== */}

            <div className="api-status-main">
                <div>
                    <span className="panel-eyebrow">Data freshness</span>

                    <h3 id="api-status-title">Status dos dados</h3>

                    <p>
                        Origem das respostas, utilização da quota e último limite observado na API
                        do GitHub.
                    </p>
                </div>

                <button
                    type="button"
                    className="refresh-data-button"
                    disabled={refreshing}
                    aria-busy={refreshing}
                    onClick={() => void onRefresh()}
                >
                    {refreshing ? "Atualizando..." : "Atualizar agora"}
                </button>
            </div>

            {/* ==========================================
                STATUS GRID
            ========================================== */}

            <div className="api-status-grid" aria-label="Status das fontes de dados">
                {/* ======================================
                    REPOSITORY CACHE
                ====================================== */}

                <div className="api-status-item">
                    <span>Repository</span>

                    <strong>{formatCacheStatus(repositoryCache)}</strong>

                    <small>{getCacheDescription(repositoryCache)}</small>
                </div>

                {/* ======================================
                    ANALYTICS CACHE
                ====================================== */}

                <div className="api-status-item">
                    <span>Analytics</span>

                    <strong>{formatCacheStatus(analyticsCache)}</strong>

                    <small>{getCacheDescription(analyticsCache)}</small>
                </div>

                {/* ======================================
                    GITHUB API
                ====================================== */}

                <div className="api-status-item">
                    <span>GitHub API</span>

                    <strong className={`rate-limit-value ${rateStatus}`}>
                        {formatInteger(rateLimit?.remaining)}
                    </strong>

                    <small>
                        {rateLimit?.limit !== null && rateLimit?.limit !== undefined
                            ? `de ${formatInteger(rateLimit.limit)} disponíveis`
                            : "Limite não observado"}
                    </small>
                </div>

                {/* ======================================
                    RESET
                ====================================== */}

                <div className="api-status-item">
                    <span>Reset</span>

                    <strong className="api-status-date">{formatDate(rateLimit?.resetAt)}</strong>

                    <small>{formatResource(rateLimit?.resource)}</small>
                </div>
            </div>

            {/* ==========================================
                QUOTA
            ========================================== */}

            {percentage !== null && (
                <div className="rate-limit-progress">
                    <div className="rate-limit-progress-header">
                        <span>Quota disponível</span>

                        <strong>{Math.round(percentage)}%</strong>
                    </div>

                    <div
                        className="rate-limit-track"
                        role="progressbar"
                        aria-label={`Quota disponível da API do GitHub: ${Math.round(percentage)}%`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percentage}
                        aria-valuetext={`${formatInteger(rateLimit?.remaining)} de ${formatInteger(
                            rateLimit?.limit
                        )} requisições disponíveis`}
                    >
                        <div
                            className={`rate-limit-fill ${rateStatus}`}
                            aria-hidden="true"
                            style={{
                                width: `${percentage}%`,
                            }}
                        />
                    </div>

                    <small className="api-status-observed">
                        {getRateStatusDescription(rateStatus)}
                    </small>
                </div>
            )}

            {/* ==========================================
                RETRY AFTER
            ========================================== */}

            {retryMessage && (
                <p className="api-status-observed" role="status">
                    {retryMessage}
                </p>
            )}

            {/* ==========================================
                LAST OBSERVED
            ========================================== */}

            {rateLimit?.observedAt && (
                <p className="api-status-observed">
                    Última observação da API: {formatDate(rateLimit.observedAt)}
                </p>
            )}
        </section>
    );
}
