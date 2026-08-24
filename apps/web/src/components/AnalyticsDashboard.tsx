import type { AnalyticsPeriod, RepositoryAnalytics } from "../types/analytics";

import { AnalyticsSummary } from "./AnalyticsSummary";
import { CommitActivityChart } from "./CommitActivityChart";
import { LanguageDistribution } from "./LanguageDistribution";

import { CommitIntelligencePanel } from "./CommitIntelligencePanel";

interface AnalyticsDashboardProps {
    analytics: RepositoryAnalytics;
    period: AnalyticsPeriod;

    loading: boolean;

    onPeriodChange: (period: AnalyticsPeriod) => void;
}

const periods: AnalyticsPeriod[] = [7, 30, 90];

export function AnalyticsDashboard({
    analytics,
    period,
    loading,
    onPeriodChange,
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
            </header>

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
        </section>
    );
}
