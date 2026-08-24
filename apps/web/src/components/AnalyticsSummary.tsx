import type { RepositoryAnalytics } from "../types/analytics";

interface AnalyticsSummaryProps {
    analytics: RepositoryAnalytics;
}

function formatDate(date: string): string {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
    }).format(new Date(`${date}T12:00:00`));
}

export function AnalyticsSummary({ analytics }: AnalyticsSummaryProps) {
    const { totalCommits, activeDays, averageCommitsPerActiveDay, busiestDay } = analytics.summary;

    return (
        <div className="analytics-summary">
            <article className="analytics-metric">
                <span>Commits</span>

                <strong>{totalCommits}</strong>

                <small>no período analisado</small>
            </article>

            <article className="analytics-metric">
                <span>Dias ativos</span>

                <strong>{activeDays}</strong>

                <small>dias com commits</small>
            </article>

            <article className="analytics-metric">
                <span>Média</span>

                <strong>{averageCommitsPerActiveDay}</strong>

                <small>commits por dia ativo</small>
            </article>

            <article className="analytics-metric">
                <span>Pico de atividade</span>

                <strong>{busiestDay ? busiestDay.commits : 0}</strong>

                <small>
                    {busiestDay ? `${formatDate(busiestDay.date)} · commits` : "sem atividade"}
                </small>
            </article>
        </div>
    );
}
