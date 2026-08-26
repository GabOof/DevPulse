import type { AnalysisHistoryItem, AnalyticsPeriod, RepositoryAnalytics } from "../types/analytics";

import { AnalyticsSummary } from "./AnalyticsSummary";
import { CollaborationPanel } from "./CollaborationPanel";
import { CommitActivityChart } from "./CommitActivityChart";
import { CommitIntelligencePanel } from "./CommitIntelligencePanel";
import { LanguageDistribution } from "./LanguageDistribution";
import { ProjectEvolution } from "./ProjectEvolution";
import { ProjectHealthPanel } from "./ProjectHealthPanel";

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

const periods: AnalyticsPeriod[] = [7, 30, 90];

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
    return (
        <section className="analytics-dashboard">
            {/* =====================================
          CABEÇALHO
      ====================================== */}

            <header className="analytics-header">
                <div>
                    <span className="panel-eyebrow">Repository Analytics</span>

                    <h2>Análise do repositório</h2>

                    <p>
                        Métricas de atividade, tecnologias, commits, colaboração e evolução do
                        projeto.
                    </p>
                </div>

                <div className="analytics-actions">
                    {/* ===============================
              SELETOR DE PERÍODO
          ================================ */}

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

                    {/* ===============================
              SNAPSHOT
          ================================ */}

                    {authenticated ? (
                        <button
                            type="button"
                            className="save-snapshot-button"
                            disabled={snapshotSaving || loading}
                            onClick={() => void onSaveSnapshot()}
                        >
                            {snapshotSaving ? "Salvando..." : "Salvar snapshot"}
                        </button>
                    ) : (
                        <span className="snapshot-auth-hint">Entre para salvar histórico</span>
                    )}
                </div>
            </header>

            {/* =====================================
          MENSAGEM DO SNAPSHOT
      ====================================== */}

            {snapshotMessage && (
                <div className="snapshot-message" role="status">
                    {snapshotMessage}
                </div>
            )}

            {/* =====================================
          AVISO DE DADOS TRUNCADOS
      ====================================== */}

            {analytics.truncated && (
                <div className="analytics-warning">
                    <strong>Amostra limitada</strong>

                    <span>
                        O repositório possui mais commits do que o limite coletado pelo DevPulse
                        neste período. Algumas métricas são baseadas na amostra de commits
                        retornada.
                    </span>
                </div>
            )}

            {/* =====================================
          RESUMO
      ====================================== */}

            <AnalyticsSummary analytics={analytics} />

            {/* =====================================
          ATIVIDADE + LINGUAGENS
      ====================================== */}

            <div className="analytics-grid">
                <CommitActivityChart activity={analytics.activity} />

                <LanguageDistribution languages={analytics.languages} />
            </div>

            {/* =====================================
          PROJECT HEALTH SCORE
      ====================================== */}

            <ProjectHealthPanel health={analytics.projectHealth} />

            {/* =====================================
          COMMIT INTELLIGENCE
      ====================================== */}

            <CommitIntelligencePanel intelligence={analytics.commitIntelligence} />

            {/* =====================================
          COLLABORATION
      ====================================== */}

            <CollaborationPanel collaboration={analytics.collaboration} />

            {/* =====================================
          PROJECT EVOLUTION
      ====================================== */}

            {authenticated ? (
                <ProjectEvolution history={history} period={period} loading={historyLoading} />
            ) : (
                <section className="project-evolution">
                    <header className="evolution-header">
                        <div>
                            <span className="panel-eyebrow">Historical Analytics</span>

                            <h2>Project Evolution</h2>

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
