import type { AnalysisHistoryItem, AnalyticsPeriod, RepositoryAnalytics } from "../types/analytics";

import { AnalyticsSummary } from "./AnalyticsSummary";

import { CollaborationPanel } from "./CollaborationPanel";

import { CommitActivityChart } from "./CommitActivityChart";

import { CommitIntelligencePanel } from "./CommitIntelligencePanel";

import { LanguageDistribution } from "./LanguageDistribution";

import { ProjectEvolution } from "./ProjectEvolution";

import { ProjectHealthPanel } from "./ProjectHealthPanel";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

interface AnalyticsDashboardProps {
    analytics: RepositoryAnalytics;

    period: AnalyticsPeriod;

    loading: boolean;

    historyLoading: boolean;

    snapshotSaving: boolean;

    history: AnalysisHistoryItem[];

    snapshotMessage: string | null;

    authenticated: boolean;

    onPeriodChange: (period: AnalyticsPeriod) => void;

    onSaveSnapshot: () => Promise<void>;
}

/*
 * =========================================================
 * PERIODS
 * =========================================================
 */

const PERIODS: AnalyticsPeriod[] = [7, 30, 90];

/*
 * =========================================================
 * PERIOD LABEL
 * =========================================================
 */

function getPeriodLabel(period: AnalyticsPeriod): string {
    if (period === 7) {
        return "últimos 7 dias";
    }

    if (period === 30) {
        return "últimos 30 dias";
    }

    return "últimos 90 dias";
}

/*
 * =========================================================
 * ANALYTICS DASHBOARD
 * =========================================================
 */

export function AnalyticsDashboard({
    analytics,
    period,
    loading,
    historyLoading,
    snapshotSaving,
    history,
    snapshotMessage,
    authenticated,
    onPeriodChange,
    onSaveSnapshot,
}: AnalyticsDashboardProps) {
    const periodLabel = getPeriodLabel(period);

    const actionsDisabled = loading || snapshotSaving;

    return (
        <section
            className="analytics-dashboard"
            aria-labelledby="analytics-dashboard-title"
            aria-busy={loading}
        >
            {/* ==========================================
                HEADER
            ========================================== */}

            <header className="analytics-header">
                <div>
                    <span className="panel-eyebrow">Repository Analytics</span>

                    <h2 id="analytics-dashboard-title">Análise do repositório</h2>

                    <p>
                        Métricas de atividade, tecnologias, commits, colaboração e evolução do
                        projeto nos {periodLabel}.
                    </p>
                </div>

                <div className="analytics-actions">
                    {/* ==================================
                        PERIOD SELECTOR
                    ================================== */}

                    <div className="period-selector" aria-label="Período da análise">
                        {PERIODS.map((periodOption) => {
                            const active = periodOption === period;

                            return (
                                <button
                                    type="button"
                                    key={periodOption}
                                    disabled={actionsDisabled}
                                    className={active ? "active" : ""}
                                    aria-pressed={active}
                                    aria-label={`Analisar os últimos ${periodOption} dias`}
                                    title={`Analisar os últimos ${periodOption} dias`}
                                    onClick={() => onPeriodChange(periodOption)}
                                >
                                    {periodOption}d
                                </button>
                            );
                        })}
                    </div>

                    {/* ==================================
                        SNAPSHOT
                    ================================== */}

                    {authenticated ? (
                        <button
                            type="button"
                            className="save-snapshot-button"
                            disabled={snapshotSaving || loading}
                            aria-busy={snapshotSaving}
                            onClick={() => void onSaveSnapshot()}
                        >
                            {snapshotSaving ? "Salvando..." : "Salvar snapshot"}
                        </button>
                    ) : (
                        <span className="snapshot-auth-hint">Entre para salvar histórico</span>
                    )}
                </div>
            </header>

            {/* ==========================================
                PERIOD LOADING
            ========================================== */}

            {loading && (
                <div className="background-loading-status" role="status" aria-live="polite">
                    <span className="loading-spinner" aria-hidden="true" />

                    <span>Atualizando análise para o período selecionado...</span>
                </div>
            )}

            {/* ==========================================
                SNAPSHOT MESSAGE
            ========================================== */}

            {snapshotMessage && (
                <div className="snapshot-message" role="status" aria-live="polite">
                    {snapshotMessage}
                </div>
            )}

            {/* ==========================================
                TRUNCATED DATA WARNING
            ========================================== */}

            {analytics.truncated && (
                <div className="analytics-warning" role="note">
                    <strong>Amostra limitada</strong>

                    <span>
                        O repositório possui mais commits do que o limite coletado pelo DevPulse
                        neste período. Algumas métricas são baseadas na amostra de commits
                        retornada.
                    </span>
                </div>
            )}

            {/* ==========================================
                SUMMARY
            ========================================== */}

            <AnalyticsSummary analytics={analytics} />

            {/* ==========================================
                ACTIVITY + LANGUAGES
            ========================================== */}

            <div className="analytics-grid">
                <CommitActivityChart activity={analytics.activity} />

                <LanguageDistribution languages={analytics.languages} />
            </div>

            {/* ==========================================
                PROJECT HEALTH
            ========================================== */}

            <ProjectHealthPanel health={analytics.projectHealth} />

            {/* ==========================================
                COMMIT INTELLIGENCE
            ========================================== */}

            <CommitIntelligencePanel intelligence={analytics.commitIntelligence} />

            {/* ==========================================
                COLLABORATION
            ========================================== */}

            <CollaborationPanel collaboration={analytics.collaboration} />

            {/* ==========================================
                PROJECT EVOLUTION
            ========================================== */}

            {authenticated ? (
                <ProjectEvolution history={history} period={period} loading={historyLoading} />
            ) : (
                <section className="project-evolution" aria-labelledby="project-evolution-title">
                    <header className="evolution-header">
                        <div>
                            <span className="panel-eyebrow">Historical Analytics</span>

                            <h2 id="project-evolution-title">Project Evolution</h2>

                            <p>
                                Compare snapshots históricos do mesmo repositório ao longo do tempo.
                            </p>
                        </div>
                    </header>

                    <div className="evolution-empty">
                        <strong>Histórico disponível após autenticação</strong>

                        <p>
                            Entre com sua conta do GitHub para salvar snapshots e acompanhar a
                            evolução do projeto.
                        </p>
                    </div>
                </section>
            )}
        </section>
    );
}
