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

interface ProjectEvolutionProps {
    history: AnalysisHistoryItem[];
    period: AnalyticsPeriod;
    loading: boolean;
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
    }).format(new Date(value));
}

function formatFullDate(value: string): string {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

export function ProjectEvolution({ history, period, loading }: ProjectEvolutionProps) {
    const chartData = history.map((snapshot) => ({
        ...snapshot,

        date: formatDate(snapshot.analyzedAt),

        fullDate: formatFullDate(snapshot.analyzedAt),
    }));

    const latest = history.length > 0 ? history[history.length - 1] : null;

    return (
        <section className="project-evolution">
            <header className="evolution-header">
                <div>
                    <span className="panel-eyebrow">Historical Analytics</span>

                    <h2>Project Evolution</h2>

                    <p>Evolução das métricas armazenadas para análises de {period} dias.</p>
                </div>

                <div className="snapshot-counter">
                    <span>Snapshots</span>

                    <strong>{history.length}</strong>
                </div>
            </header>

            {loading ? (
                <div className="evolution-empty">Carregando histórico...</div>
            ) : history.length === 0 ? (
                <div className="evolution-empty">
                    <strong>Nenhum snapshot armazenado</strong>

                    <p>Salve a análise atual para iniciar o histórico deste repositório.</p>
                </div>
            ) : (
                <>
                    <div className="evolution-summary">
                        <article>
                            <span>Último snapshot</span>

                            <strong>{latest ? formatFullDate(latest.analyzedAt) : "—"}</strong>
                        </article>

                        <article>
                            <span>Commits</span>

                            <strong>{latest?.totalCommits ?? 0}</strong>
                        </article>

                        <article>
                            <span>Conventional</span>

                            <strong>{latest?.conventionalPercentage ?? 0}%</strong>
                        </article>

                        <article>
                            <span>Contribuidores</span>

                            <strong>{latest?.totalContributors ?? 0}</strong>
                        </article>
                    </div>

                    {history.length === 1 && (
                        <div className="evolution-notice">
                            O primeiro snapshot foi registrado. Salve novas análises futuramente
                            para visualizar tendências temporais.
                        </div>
                    )}

                    <div className="evolution-charts">
                        <section className="analytics-panel">
                            <div className="panel-header">
                                <div>
                                    <span className="panel-eyebrow">Atividade</span>

                                    <h3>Evolução de commits</h3>
                                </div>
                            </div>

                            <div className="evolution-chart-container">
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
                                            stroke="#21262d"
                                            strokeDasharray="3 3"
                                        />

                                        <XAxis
                                            dataKey="date"
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{
                                                fill: "#8b949e",
                                                fontSize: 11,
                                            }}
                                        />

                                        <YAxis
                                            allowDecimals={false}
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{
                                                fill: "#8b949e",
                                                fontSize: 11,
                                            }}
                                        />

                                        <Tooltip
                                            contentStyle={{
                                                background: "#161b22",
                                                border: "1px solid #30363d",
                                                borderRadius: "8px",
                                            }}
                                            labelStyle={{
                                                color: "#f0f6fc",
                                            }}
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="totalCommits"
                                            name="Commits"
                                            stroke="#58a6ff"
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

                        <section className="analytics-panel">
                            <div className="panel-header">
                                <div>
                                    <span className="panel-eyebrow">Padronização</span>

                                    <h3>Conventional Commits</h3>
                                </div>
                            </div>

                            <div className="evolution-chart-container">
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
                                            stroke="#21262d"
                                            strokeDasharray="3 3"
                                        />

                                        <XAxis
                                            dataKey="date"
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{
                                                fill: "#8b949e",
                                                fontSize: 11,
                                            }}
                                        />

                                        <YAxis
                                            domain={[0, 100]}
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{
                                                fill: "#8b949e",
                                                fontSize: 11,
                                            }}
                                            unit="%"
                                        />

                                        <Tooltip
                                            contentStyle={{
                                                background: "#161b22",
                                                border: "1px solid #30363d",
                                                borderRadius: "8px",
                                            }}
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="conventionalPercentage"
                                            name="Conventional"
                                            stroke="#3fb950"
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

                        <section className="analytics-panel">
                            <div className="panel-header">
                                <div>
                                    <span className="panel-eyebrow">Colaboração</span>

                                    <h3>Evolução de contribuidores</h3>
                                </div>
                            </div>

                            <div className="evolution-chart-container">
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
                                            stroke="#21262d"
                                            strokeDasharray="3 3"
                                        />

                                        <XAxis
                                            dataKey="date"
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{
                                                fill: "#8b949e",
                                                fontSize: 11,
                                            }}
                                        />

                                        <YAxis
                                            allowDecimals={false}
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{
                                                fill: "#8b949e",
                                                fontSize: 11,
                                            }}
                                        />

                                        <Tooltip
                                            contentStyle={{
                                                background: "#161b22",
                                                border: "1px solid #30363d",
                                                borderRadius: "8px",
                                            }}
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="totalContributors"
                                            name="Contribuidores"
                                            stroke="#a371f7"
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
                </>
            )}
        </section>
    );
}
