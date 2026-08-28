import { useMemo } from "react";

import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import type { AnalysisHistoryItem, AnalyticsPeriod } from "../types/analytics";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

interface ProjectEvolutionProps {
    history: AnalysisHistoryItem[];

    period: AnalyticsPeriod;

    loading: boolean;
}

/*
 * =========================================================
 * FORMATTERS
 * =========================================================
 */

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",

    month: "2-digit",
});

const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",

    month: "short",

    year: "numeric",

    hour: "2-digit",

    minute: "2-digit",
});

const integerFormatter = new Intl.NumberFormat("pt-BR");

const percentageFormatter = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
});

/*
 * =========================================================
 * NORMALIZE COUNT
 * =========================================================
 */

function normalizeCount(value: number): number {
    if (!Number.isFinite(value) || value < 0) {
        return 0;
    }

    return Math.round(value);
}

/*
 * =========================================================
 * NORMALIZE PERCENTAGE
 * =========================================================
 */

function normalizePercentage(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.min(100, Math.max(0, value));
}

/*
 * =========================================================
 * FORMAT COUNT
 * =========================================================
 */

function formatCount(value: number): string {
    return integerFormatter.format(normalizeCount(value));
}

/*
 * =========================================================
 * FORMAT PERCENTAGE
 * =========================================================
 */

function formatPercentage(value: number): string {
    return `${percentageFormatter.format(normalizePercentage(value))}%`;
}

/*
 * =========================================================
 * SAFE DATE
 * =========================================================
 */

function parseDate(value: string): Date | null {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

/*
 * =========================================================
 * FORMAT SHORT DATE
 * =========================================================
 */

function formatDate(value: string): string {
    const date = parseDate(value);

    if (!date) {
        return "—";
    }

    return shortDateFormatter.format(date);
}

/*
 * =========================================================
 * FORMAT FULL DATE
 * =========================================================
 */

function formatFullDate(value: string): string {
    const date = parseDate(value);

    if (!date) {
        return "Data indisponível";
    }

    return fullDateFormatter.format(date);
}

/*
 * =========================================================
 * DATE TIMESTAMP
 * =========================================================
 */

function getTimestamp(value: string): number {
    const date = parseDate(value);

    return date?.getTime() ?? 0;
}

/*
 * =========================================================
 * PROJECT EVOLUTION
 * =========================================================
 */

export function ProjectEvolution({ history, period, loading }: ProjectEvolutionProps) {
    /*
     * =====================================================
     * CHART DATA
     * =====================================================
     *
     * Não dependemos da ordem retornada pelo backend.
     *
     * Os snapshots são ordenados cronologicamente antes
     * de serem utilizados nos gráficos.
     */

    const chartData = useMemo(
        () =>
            [...history]
                .sort(
                    (first, second) =>
                        getTimestamp(first.analyzedAt) - getTimestamp(second.analyzedAt)
                )
                .map((snapshot) => ({
                    ...snapshot,

                    totalCommits: normalizeCount(snapshot.totalCommits),

                    conventionalPercentage: normalizePercentage(snapshot.conventionalPercentage),

                    totalContributors: normalizeCount(snapshot.totalContributors),

                    date: formatDate(snapshot.analyzedAt),

                    fullDate: formatFullDate(snapshot.analyzedAt),
                })),
        [history]
    );

    /*
     * =====================================================
     * LATEST SNAPSHOT
     * =====================================================
     */

    const latest = chartData.length > 0 ? chartData[chartData.length - 1] : null;

    const snapshotCount = chartData.length;

    const hasHistory = snapshotCount > 0;

    const hasTrend = snapshotCount >= 2;

    /*
     * =====================================================
     * ACCESSIBLE SUMMARIES
     * =====================================================
     */

    const commitsChartDescription = hasTrend
        ? `Evolução do número de commits em ${snapshotCount} snapshots armazenados.`
        : "Ainda não existem snapshots suficientes para calcular uma tendência de commits.";

    const conventionalChartDescription = hasTrend
        ? `Evolução da porcentagem de Conventional Commits em ${snapshotCount} snapshots armazenados.`
        : "Ainda não existem snapshots suficientes para calcular uma tendência de Conventional Commits.";

    const contributorsChartDescription = hasTrend
        ? `Evolução do número de contribuidores em ${snapshotCount} snapshots armazenados.`
        : "Ainda não existem snapshots suficientes para calcular uma tendência de contribuidores.";

    return (
        <section
            className="project-evolution"
            aria-labelledby="project-evolution-title"
            aria-busy={loading}
        >
            {/* ==========================================
                HEADER
            ========================================== */}

            <header className="evolution-header">
                <div>
                    <span className="panel-eyebrow">Historical Analytics</span>

                    <h2 id="project-evolution-title">Project Evolution</h2>

                    <p>Evolução das métricas armazenadas para análises de {period} dias.</p>
                </div>

                <div
                    className="snapshot-counter"
                    aria-label={`${snapshotCount} ${
                        snapshotCount === 1 ? "snapshot armazenado" : "snapshots armazenados"
                    }`}
                >
                    <span>Snapshots</span>

                    <strong>{formatCount(snapshotCount)}</strong>
                </div>
            </header>

            {/* ==========================================
                LOADING
            ========================================== */}

            {loading ? (
                <div className="evolution-empty" role="status" aria-live="polite">
                    <span className="loading-spinner" aria-hidden="true" />

                    <strong>Carregando histórico</strong>

                    <p>Recuperando snapshots armazenados para este período.</p>
                </div>
            ) : !hasHistory ? (
                /* ======================================
                    EMPTY
                ====================================== */

                <div className="evolution-empty" role="status">
                    <strong>Nenhum snapshot armazenado</strong>

                    <p>Salve a análise atual para iniciar o histórico deste repositório.</p>
                </div>
            ) : (
                <>
                    {/* ==================================
                        LATEST SNAPSHOT SUMMARY
                    ================================== */}

                    <div className="evolution-summary" aria-label="Resumo do snapshot mais recente">
                        <article>
                            <span>Último snapshot</span>

                            <strong>{latest ? latest.fullDate : "—"}</strong>
                        </article>

                        <article>
                            <span>Commits</span>

                            <strong>{formatCount(latest?.totalCommits ?? 0)}</strong>
                        </article>

                        <article>
                            <span>Conventional</span>

                            <strong>{formatPercentage(latest?.conventionalPercentage ?? 0)}</strong>
                        </article>

                        <article>
                            <span>Contribuidores</span>

                            <strong>{formatCount(latest?.totalContributors ?? 0)}</strong>
                        </article>
                    </div>

                    {/* ==================================
                        FIRST SNAPSHOT
                    ================================== */}

                    {!hasTrend && (
                        <div className="evolution-notice" role="status">
                            O primeiro snapshot foi registrado. Salve uma nova análise futuramente
                            para que o DevPulse possa comparar os resultados e apresentar tendências
                            temporais.
                        </div>
                    )}

                    {/* ==================================
                        CHARTS
                    ================================== */}

                    {hasTrend && (
                        <div className="evolution-charts">
                            {/* ==========================
                                COMMITS
                            ========================== */}

                            <section
                                className="analytics-panel"
                                aria-labelledby="commit-evolution-title"
                            >
                                <div className="panel-header">
                                    <div>
                                        <span className="panel-eyebrow">Atividade</span>

                                        <h3 id="commit-evolution-title">Evolução de commits</h3>
                                    </div>
                                </div>

                                <div
                                    className="evolution-chart-container"
                                    role="img"
                                    aria-label={commitsChartDescription}
                                >
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={chartData}
                                            margin={{
                                                top: 10,

                                                right: 10,

                                                bottom: 0,

                                                left: -20,
                                            }}
                                        >
                                            <CartesianGrid
                                                vertical={false}
                                                stroke="var(--border-soft)"
                                                strokeDasharray="3 3"
                                            />

                                            <XAxis
                                                dataKey="date"
                                                tickLine={false}
                                                axisLine={false}
                                                minTickGap={20}
                                                tick={{
                                                    fill: "var(--text-muted)",

                                                    fontSize: 11,
                                                }}
                                            />

                                            <YAxis
                                                allowDecimals={false}
                                                domain={[0, "auto"]}
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{
                                                    fill: "var(--text-muted)",

                                                    fontSize: 11,
                                                }}
                                            />

                                            <Tooltip
                                                contentStyle={{
                                                    background: "var(--surface-elevated)",

                                                    border: "1px solid var(--border)",

                                                    borderRadius: "8px",

                                                    boxShadow: "0 12px 30px rgb(0 0 0 / 25%)",
                                                }}
                                                labelStyle={{
                                                    color: "var(--text)",
                                                }}
                                                itemStyle={{
                                                    color: "var(--text-secondary)",
                                                }}
                                                formatter={(value) => [
                                                    `${formatCount(Number(value))} commits`,

                                                    "Commits",
                                                ]}
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="totalCommits"
                                                name="Commits"
                                                stroke="var(--accent)"
                                                strokeWidth={2}
                                                dot={{
                                                    r: 4,
                                                }}
                                                activeDot={{
                                                    r: 6,
                                                }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </section>

                            {/* ==========================
                                CONVENTIONAL COMMITS
                            ========================== */}

                            <section
                                className="analytics-panel"
                                aria-labelledby="conventional-evolution-title"
                            >
                                <div className="panel-header">
                                    <div>
                                        <span className="panel-eyebrow">Padronização</span>

                                        <h3 id="conventional-evolution-title">
                                            Conventional Commits
                                        </h3>
                                    </div>
                                </div>

                                <div
                                    className="evolution-chart-container"
                                    role="img"
                                    aria-label={conventionalChartDescription}
                                >
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={chartData}
                                            margin={{
                                                top: 10,

                                                right: 10,

                                                bottom: 0,

                                                left: -20,
                                            }}
                                        >
                                            <CartesianGrid
                                                vertical={false}
                                                stroke="var(--border-soft)"
                                                strokeDasharray="3 3"
                                            />

                                            <XAxis
                                                dataKey="date"
                                                tickLine={false}
                                                axisLine={false}
                                                minTickGap={20}
                                                tick={{
                                                    fill: "var(--text-muted)",

                                                    fontSize: 11,
                                                }}
                                            />

                                            <YAxis
                                                domain={[0, 100]}
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{
                                                    fill: "var(--text-muted)",

                                                    fontSize: 11,
                                                }}
                                                unit="%"
                                            />

                                            <Tooltip
                                                contentStyle={{
                                                    background: "var(--surface-elevated)",

                                                    border: "1px solid var(--border)",

                                                    borderRadius: "8px",

                                                    boxShadow: "0 12px 30px rgb(0 0 0 / 25%)",
                                                }}
                                                labelStyle={{
                                                    color: "var(--text)",
                                                }}
                                                itemStyle={{
                                                    color: "var(--text-secondary)",
                                                }}
                                                formatter={(value) => [
                                                    formatPercentage(Number(value)),

                                                    "Conventional",
                                                ]}
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="conventionalPercentage"
                                                name="Conventional"
                                                stroke="var(--green)"
                                                strokeWidth={2}
                                                dot={{
                                                    r: 4,
                                                }}
                                                activeDot={{
                                                    r: 6,
                                                }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </section>

                            {/* ==========================
                                CONTRIBUTORS
                            ========================== */}

                            <section
                                className="analytics-panel"
                                aria-labelledby="contributors-evolution-title"
                            >
                                <div className="panel-header">
                                    <div>
                                        <span className="panel-eyebrow">Colaboração</span>

                                        <h3 id="contributors-evolution-title">
                                            Evolução de contribuidores
                                        </h3>
                                    </div>
                                </div>

                                <div
                                    className="evolution-chart-container"
                                    role="img"
                                    aria-label={contributorsChartDescription}
                                >
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={chartData}
                                            margin={{
                                                top: 10,

                                                right: 10,

                                                bottom: 0,

                                                left: -20,
                                            }}
                                        >
                                            <CartesianGrid
                                                vertical={false}
                                                stroke="var(--border-soft)"
                                                strokeDasharray="3 3"
                                            />

                                            <XAxis
                                                dataKey="date"
                                                tickLine={false}
                                                axisLine={false}
                                                minTickGap={20}
                                                tick={{
                                                    fill: "var(--text-muted)",

                                                    fontSize: 11,
                                                }}
                                            />

                                            <YAxis
                                                allowDecimals={false}
                                                domain={[0, "auto"]}
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{
                                                    fill: "var(--text-muted)",

                                                    fontSize: 11,
                                                }}
                                            />

                                            <Tooltip
                                                contentStyle={{
                                                    background: "var(--surface-elevated)",

                                                    border: "1px solid var(--border)",

                                                    borderRadius: "8px",

                                                    boxShadow: "0 12px 30px rgb(0 0 0 / 25%)",
                                                }}
                                                labelStyle={{
                                                    color: "var(--text)",
                                                }}
                                                itemStyle={{
                                                    color: "var(--text-secondary)",
                                                }}
                                                formatter={(value) => {
                                                    const count = normalizeCount(Number(value));

                                                    return [
                                                        `${formatCount(count)} ${
                                                            count === 1
                                                                ? "contribuidor"
                                                                : "contribuidores"
                                                        }`,

                                                        "Contribuidores",
                                                    ];
                                                }}
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="totalContributors"
                                                name="Contribuidores"
                                                stroke="var(--purple)"
                                                strokeWidth={2}
                                                dot={{
                                                    r: 4,
                                                }}
                                                activeDot={{
                                                    r: 6,
                                                }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </section>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
