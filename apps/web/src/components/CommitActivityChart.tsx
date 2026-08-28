import { useMemo } from "react";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { DailyActivity } from "../types/analytics";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

interface CommitActivityChartProps {
    activity: DailyActivity[];
}

/*
 * =========================================================
 * FORMATTERS
 * =========================================================
 */

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",

    month: "2-digit",
});

const numberFormatter = new Intl.NumberFormat("pt-BR");

/*
 * =========================================================
 * FORMAT DATE
 * =========================================================
 */

function formatDate(value: string): string {
    /*
     * Os dias chegam normalmente como:
     *
     * YYYY-MM-DD
     *
     * O horário às 12h evita mudança de data
     * por diferenças de timezone.
     */

    const date = new Date(`${value}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return dateFormatter.format(date);
}

/*
 * =========================================================
 * FORMAT COMMITS
 * =========================================================
 */

function formatCommitCount(value: number): string {
    const safeValue = Number.isFinite(value) ? value : 0;

    const formatted = numberFormatter.format(safeValue);

    return safeValue === 1 ? `${formatted} commit` : `${formatted} commits`;
}

/*
 * =========================================================
 * COMMIT ACTIVITY CHART
 * =========================================================
 */

export function CommitActivityChart({ activity }: CommitActivityChartProps) {
    /*
     * =====================================================
     * NORMALIZED DATA
     * =====================================================
     */

    const formattedActivity = useMemo(
        () =>
            activity.map((day) => ({
                ...day,

                commits: Number.isFinite(day.commits) ? day.commits : 0,

                formattedDate: formatDate(day.date),
            })),
        [activity]
    );

    /*
     * =====================================================
     * SUMMARY
     * =====================================================
     */

    const totalCommits = formattedActivity.reduce((total, day) => total + day.commits, 0);

    const activeDays = formattedActivity.filter((day) => day.commits > 0).length;

    const busiestDay = formattedActivity.reduce<(typeof formattedActivity)[number] | null>(
        (current, day) => {
            if (!current || day.commits > current.commits) {
                return day;
            }

            return current;
        },
        null
    );

    const hasActivity = totalCommits > 0;

    /*
     * Texto alternativo resumido para
     * tecnologias assistivas.
     */

    const chartDescription = hasActivity
        ? `${formatCommitCount(totalCommits)} distribuídos em ${activeDays} ${
              activeDays === 1 ? "dia ativo" : "dias ativos"
          }. ${
              busiestDay
                  ? `Maior atividade em ${busiestDay.formattedDate}, com ${formatCommitCount(
                        busiestDay.commits
                    )}.`
                  : ""
          }`
        : "Nenhum commit foi identificado no período analisado.";

    return (
        <section className="analytics-panel" aria-labelledby="commit-activity-title">
            {/* ==========================================
                HEADER
            ========================================== */}

            <div className="panel-header">
                <div>
                    <span className="panel-eyebrow">Desenvolvimento</span>

                    <h3 id="commit-activity-title">Atividade de commits</h3>
                </div>
            </div>

            {/* ==========================================
                EMPTY STATE
            ========================================== */}

            {!hasActivity ? (
                <div className="evolution-empty" role="status">
                    <strong>Nenhuma atividade encontrada</strong>

                    <p>Não foram identificados commits no período selecionado.</p>
                </div>
            ) : (
                /* ======================================
                    CHART
                ====================================== */

                <div className="chart-container" role="img" aria-label={chartDescription}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={formattedActivity}
                            margin={{
                                top: 10,

                                right: 5,

                                bottom: 0,

                                left: -20,
                            }}
                        >
                            {/* ==========================
                                GRID
                            ========================== */}

                            <CartesianGrid
                                vertical={false}
                                stroke="var(--border-soft)"
                                strokeDasharray="3 3"
                            />

                            {/* ==========================
                                X AXIS
                            ========================== */}

                            <XAxis
                                dataKey="formattedDate"
                                tick={{
                                    fill: "var(--text-muted)",

                                    fontSize: 11,
                                }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={25}
                            />

                            {/* ==========================
                                Y AXIS
                            ========================== */}

                            <YAxis
                                allowDecimals={false}
                                domain={[0, "auto"]}
                                tick={{
                                    fill: "var(--text-muted)",

                                    fontSize: 11,
                                }}
                                tickLine={false}
                                axisLine={false}
                            />

                            {/* ==========================
                                TOOLTIP
                            ========================== */}

                            <Tooltip
                                cursor={{
                                    fill: "rgb(91 140 255 / 6%)",
                                }}
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
                                    const commits = Number(value);

                                    return [formatCommitCount(commits), "Atividade"];
                                }}
                            />

                            {/* ==========================
                                COMMITS
                            ========================== */}

                            <Bar
                                dataKey="commits"
                                name="Commits"
                                fill="var(--accent)"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={32}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </section>
    );
}
