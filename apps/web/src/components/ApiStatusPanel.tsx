import type { ApiResponseMeta, DevPulseCacheStatus, GitHubRateLimitMeta } from "../services/api";

interface ApiStatusPanelProps {
    repositoryMeta: ApiResponseMeta | null;

    analyticsMeta: ApiResponseMeta | null;

    refreshing: boolean;

    onRefresh: () => Promise<void>;
}

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

function formatDate(value: string | null): string {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString("pt-BR", {
        day: "2-digit",

        month: "2-digit",

        hour: "2-digit",

        minute: "2-digit",
    });
}

function getRateLimitStatus(
    rateLimit: GitHubRateLimitMeta | null
): "healthy" | "warning" | "critical" | "unknown" {
    if (
        !rateLimit ||
        rateLimit.limit === null ||
        rateLimit.remaining === null ||
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

export function ApiStatusPanel({
    repositoryMeta,
    analyticsMeta,
    refreshing,
    onRefresh,
}: ApiStatusPanelProps) {
    /*
     * Analytics geralmente é a chamada
     * que faz mais requisições ao GitHub,
     * então preferimos seu snapshot.
     */

    const rateLimit = analyticsMeta?.githubRateLimit ?? repositoryMeta?.githubRateLimit ?? null;

    const rateStatus = getRateLimitStatus(rateLimit);

    const percentage =
        rateLimit?.limit && rateLimit.remaining !== null
            ? Math.max(
                  0,

                  Math.min(
                      100,

                      (rateLimit.remaining / rateLimit.limit) * 100
                  )
              )
            : null;

    return (
        <section className="api-status-panel">
            <div className="api-status-main">
                <div>
                    <span className="panel-eyebrow">Data freshness</span>

                    <h3>Status dos dados</h3>

                    <p>Cache local e último limite observado na API do GitHub.</p>
                </div>

                <button
                    type="button"
                    className="refresh-data-button"
                    disabled={refreshing}
                    onClick={() => void onRefresh()}
                >
                    {refreshing ? "Atualizando..." : "Atualizar agora"}
                </button>
            </div>

            <div className="api-status-grid">
                <div className="api-status-item">
                    <span>Repository</span>

                    <strong>{formatCacheStatus(repositoryMeta?.cache ?? null)}</strong>

                    <small>
                        {repositoryMeta?.cache === "HIT"
                            ? "Resposta reutilizada"
                            : repositoryMeta?.cache === "COALESCED"
                              ? "Consulta compartilhada"
                              : repositoryMeta?.cache === "MISS"
                                ? "Consultado no GitHub"
                                : "Sem informação"}
                    </small>
                </div>

                <div className="api-status-item">
                    <span>Analytics</span>

                    <strong>{formatCacheStatus(analyticsMeta?.cache ?? null)}</strong>

                    <small>
                        {analyticsMeta?.cache === "HIT"
                            ? "Resposta reutilizada"
                            : analyticsMeta?.cache === "COALESCED"
                              ? "Consulta compartilhada"
                              : analyticsMeta?.cache === "MISS"
                                ? "Consultado no GitHub"
                                : "Sem informação"}
                    </small>
                </div>

                <div className="api-status-item">
                    <span>GitHub API</span>

                    <strong className={`rate-limit-value ${rateStatus}`}>
                        {rateLimit?.remaining ?? "—"}
                    </strong>

                    <small>
                        {rateLimit?.limit !== null
                            ? `de ${rateLimit?.limit ?? "—"} disponíveis`
                            : "Limite não observado"}
                    </small>
                </div>

                <div className="api-status-item">
                    <span>Reset</span>

                    <strong className="api-status-date">
                        {formatDate(rateLimit?.resetAt ?? null)}
                    </strong>

                    <small>
                        {rateLimit?.resource
                            ? `Recurso: ${rateLimit.resource}`
                            : "GitHub rate limit"}
                    </small>
                </div>
            </div>

            {percentage !== null && (
                <div className="rate-limit-progress">
                    <div className="rate-limit-progress-header">
                        <span>Quota disponível</span>

                        <strong>{percentage.toFixed(0)}%</strong>
                    </div>

                    <div className="rate-limit-track">
                        <div
                            className={`rate-limit-fill ${rateStatus}`}
                            style={{
                                width: `${percentage}%`,
                            }}
                        />
                    </div>
                </div>
            )}

            {rateLimit?.observedAt && (
                <p className="api-status-observed">
                    Última observação da API: {formatDate(rateLimit.observedAt)}
                </p>
            )}
        </section>
    );
}
