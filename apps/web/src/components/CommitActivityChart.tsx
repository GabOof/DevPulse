import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { DailyActivity } from "../types/analytics";

interface CommitActivityChartProps {
    activity: DailyActivity[];
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
    }).format(new Date(`${value}T12:00:00`));
}

export function CommitActivityChart({ activity }: CommitActivityChartProps) {
    const formattedActivity = activity.map((day) => ({
        ...day,
        formattedDate: formatDate(day.date),
    }));

    return (
        <section className="analytics-panel">
            <div className="panel-header">
                <div>
                    <span className="panel-eyebrow">Desenvolvimento</span>

                    <h3>Atividade de commits</h3>
                </div>
            </div>

            <div className="chart-container">
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
                        <CartesianGrid vertical={false} stroke="#21262d" strokeDasharray="3 3" />

                        <XAxis
                            dataKey="formattedDate"
                            stroke="#484f58"
                            tick={{
                                fill: "#8b949e",
                                fontSize: 11,
                            }}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={25}
                        />

                        <YAxis
                            allowDecimals={false}
                            stroke="#484f58"
                            tick={{
                                fill: "#8b949e",
                                fontSize: 11,
                            }}
                            tickLine={false}
                            axisLine={false}
                        />

                        <Tooltip
                            cursor={{
                                fill: "rgba(88, 166, 255, 0.06)",
                            }}
                            contentStyle={{
                                background: "#161b22",
                                border: "1px solid #30363d",
                                borderRadius: "8px",
                            }}
                            labelStyle={{
                                color: "#f0f6fc",
                            }}
                            itemStyle={{
                                color: "#8b949e",
                            }}
                            formatter={(value) => [`${value} commits`, "Atividade"]}
                        />

                        <Bar
                            dataKey="commits"
                            fill="#58a6ff"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={32}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}
