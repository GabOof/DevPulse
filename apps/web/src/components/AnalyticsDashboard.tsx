import type { AnalysisHistoryItem, AnalyticsPeriod, RepositoryAnalytics } from "../types/analytics";
import { AnalyticsSummary } from "./AnalyticsSummary";
import { CollaborationPanel } from "./CollaborationPanel";
import { CommitActivityChart } from "./CommitActivityChart";
import { CommitIntelligencePanel } from "./CommitIntelligencePanel";
import { LanguageDistribution } from "./LanguageDistribution";
import { ProjectEvolution } from "./ProjectEvolution";

interface AnalyticsDashboardProps {
    analytics: RepositoryAnalytics;

    period: AnalyticsPeriod;

    loading: boolean;
    historyLoading: boolean;
    snapshotSaving: boolean;

    history: AnalysisHistoryItem[];

    snapshotMessage: string | null;

    onPeriodChange: (period: AnalyticsPeriod) => void;

    onSaveSnapshot: () => Promise<void>;
}

const periods: AnalyticsPeriod[] = [7, 30, 90];

export function AnalyticsDashboard({
    analytics,
    period,
    loading,
    historyLoading,
    snapshotSaving,
    history,
    snapshotMessage,
    onPeriodChange,
    onSaveSnapshot,
}: AnalyticsDashboardProps) {
    return (
        <section className="analytics-dashboard">
            <header className="analytics-header">
                <div>
                    <span className="eyebrow">Repository Analytics</span>

                    <h2>Produtividade do projeto</h2>

                    <p>Métricas calculadas a partir da atividade recente do repositório.</p>
                </div>

                <div className="period-selector" aria-label="Período da análise">
                    {periods.map((periodOption) => (
                        <button
                            type="button"
                            key={periodOption}
                            disabled={loading}
                            className={periodOption === period ? "active" : ""}
                            onClick={() => onPeriodChange(periodOption)}
                        >
                            {periodOption}d
                        </button>
                    ))}
                </div>

                <div className="analytics-actions">
                    <div className="period-selector" aria-label="Período da análise">
                        {periods.map((periodOption) => (
                            <button
                                type="button"
                                key={periodOption}
                                disabled={loading}
                                className={periodOption === period ? "active" : ""}
                                onClick={() => onPeriodChange(periodOption)}
                            >
                                {periodOption}d
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="save-snapshot-button"
                        disabled={snapshotSaving}
                        onClick={() => void onSaveSnapshot()}
                    >
                        {snapshotSaving ? "Salvando..." : "Salvar snapshot"}
                    </button>
                </div>
            </header>

            {snapshotMessage && <div className="snapshot-message">{snapshotMessage}</div>}

            {analytics.truncated && (
                <div className="analytics-warning">
                    O repositório possui um volume elevado de atividade. Os dados deste período
                    foram limitados aos primeiros 300 commits.
                </div>
            )}

            <AnalyticsSummary analytics={analytics} />

            <div className="analytics-grid">
                <CommitActivityChart activity={analytics.activity} />

                <LanguageDistribution languages={analytics.languages} />
            </div>

            <CommitIntelligencePanel intelligence={analytics.commitIntelligence} />

            <CollaborationPanel collaboration={analytics.collaboration} />

            <ProjectEvolution history={history} period={period} loading={historyLoading} />
        </section>
    );
}
