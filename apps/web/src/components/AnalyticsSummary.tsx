import type { RepositoryAnalytics } from "../types/analytics";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

interface AnalyticsSummaryProps {
    analytics: RepositoryAnalytics;
}

/*
 * =========================================================
 * FORMATTERS
 * =========================================================
 */

const integerFormatter = new Intl.NumberFormat("pt-BR");

const decimalFormatter = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",

    month: "short",
});

/*
 * =========================================================
 * FORMAT INTEGER
 * =========================================================
 */

function formatInteger(value: number): string {
    if (!Number.isFinite(value)) {
        return "0";
    }

    return integerFormatter.format(value);
}

/*
 * =========================================================
 * FORMAT DECIMAL
 * =========================================================
 */

function formatDecimal(value: number): string {
    if (!Number.isFinite(value)) {
        return "0";
    }

    return decimalFormatter.format(value);
}

/*
 * =========================================================
 * FORMAT DATE
 * =========================================================
 */

function formatDate(value: string): string {
    /*
     * Datas da atividade normalmente chegam
     * no formato:
     *
     * YYYY-MM-DD
     *
     * Adicionamos horário local para evitar
     * mudanças de dia causadas por timezone.
     */

    const date = new Date(`${value}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
        return "Data não informada";
    }

    return dateFormatter.format(date);
}

/*
 * =========================================================
 * ANALYTICS SUMMARY
 * =========================================================
 */

export function AnalyticsSummary({ analytics }: AnalyticsSummaryProps) {
    const { totalCommits, activeDays, averageCommitsPerActiveDay, busiestDay } = analytics.summary;

    const hasBusiestDay = Boolean(busiestDay && busiestDay.commits > 0);

    return (
        <div className="analytics-summary" aria-label="Resumo da atividade do repositório">
            {/* ==========================================
                TOTAL COMMITS
            ========================================== */}

            <article className="analytics-metric">
                <span>Commits</span>

                <strong>{formatInteger(totalCommits)}</strong>

                <small>no período analisado</small>
            </article>

            {/* ==========================================
                ACTIVE DAYS
            ========================================== */}

            <article className="analytics-metric">
                <span>Dias ativos</span>

                <strong>{formatInteger(activeDays)}</strong>

                <small>dias com commits</small>
            </article>

            {/* ==========================================
                AVERAGE
            ========================================== */}

            <article className="analytics-metric">
                <span>Média</span>

                <strong>{formatDecimal(averageCommitsPerActiveDay)}</strong>

                <small>commits por dia ativo</small>
            </article>

            {/* ==========================================
                BUSIEST DAY
            ========================================== */}

            <article className="analytics-metric">
                <span>Pico de atividade</span>

                <strong>
                    {hasBusiestDay && busiestDay ? formatInteger(busiestDay.commits) : "0"}
                </strong>

                <small>
                    {hasBusiestDay && busiestDay
                        ? `${formatDate(busiestDay.date)} · commits`
                        : "sem atividade no período"}
                </small>
            </article>
        </div>
    );
}
