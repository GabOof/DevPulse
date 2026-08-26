import type {
    HealthDimension,
    HealthDimensionKey,
    ProjectHealthLevel,
    ProjectHealthScore,
} from "../types/analytics";

interface ProjectHealthPanelProps {
    health: ProjectHealthScore;
}

interface HealthInsight {
    type: "strength" | "attention" | "neutral";

    title: string;

    description: string;
}

const dimensionLabels: Record<HealthDimensionKey, string> = {
    activity: "Atividade",

    consistency: "Consistência",

    commit_hygiene: "Padronização de commits",

    change_clarity: "Clareza das alterações",

    collaboration: "Colaboração",
};

const dimensionDescriptions: Record<HealthDimensionKey, string> = {
    activity: "Volume de commits em relação ao período analisado.",

    consistency: "Distribuição da atividade ao longo dos dias.",

    commit_hygiene: "Uso de mensagens no padrão Conventional Commits.",

    change_clarity: "Capacidade de classificar semanticamente as alterações.",

    collaboration: "Distribuição da atividade entre os contribuidores.",
};

const levelLabels: Record<ProjectHealthLevel, string> = {
    excellent: "Excelente",
    good: "Bom",
    attention: "Atenção",
    critical: "Crítico",
};

function getDimension(health: ProjectHealthScore, key: HealthDimensionKey): HealthDimension {
    return (
        health.dimensions.find((dimension) => dimension.key === key) ?? {
            key,
            score: 0,
            weight: 0,
            weightedScore: 0,
        }
    );
}

function generateInsights(health: ProjectHealthScore): HealthInsight[] {
    const insights: HealthInsight[] = [];

    const activity = getDimension(health, "activity").score;

    const consistency = getDimension(health, "consistency").score;

    const hygiene = getDimension(health, "commit_hygiene").score;

    const clarity = getDimension(health, "change_clarity").score;

    const collaboration = getDimension(health, "collaboration").score;

    if (activity >= 80) {
        insights.push({
            type: "strength",

            title: "Boa atividade recente",

            description:
                "O volume de commits está dentro ou acima da referência definida pelo DevPulse.",
        });
    } else if (activity < 50) {
        insights.push({
            type: "attention",

            title: "Baixa atividade recente",

            description:
                "O repositório apresenta pouco volume de commits para o período analisado.",
        });
    }

    if (consistency >= 80) {
        insights.push({
            type: "strength",

            title: "Atividade consistente",

            description:
                "Os commits estão distribuídos por uma quantidade saudável de dias no período.",
        });
    } else if (consistency < 50) {
        insights.push({
            type: "attention",

            title: "Atividade concentrada",

            description: "Os commits estão concentrados em poucos dias do período analisado.",
        });
    }

    if (hygiene >= 80) {
        insights.push({
            type: "strength",

            title: "Boa padronização de commits",

            description:
                "A maior parte das mensagens segue a estrutura reconhecida como Conventional Commits.",
        });
    } else if (hygiene < 60) {
        insights.push({
            type: "attention",

            title: "Padronização pode melhorar",

            description:
                "Uma parcela relevante das mensagens não segue o padrão Conventional Commits.",
        });
    }

    if (clarity >= 85) {
        insights.push({
            type: "strength",

            title: "Alterações bem identificadas",

            description:
                "O DevPulse conseguiu classificar semanticamente a maior parte dos commits.",
        });
    } else if (clarity < 60) {
        insights.push({
            type: "attention",

            title: "Baixa clareza semântica",

            description: "Muitos commits não puderam ser classificados com segurança.",
        });
    }

    if (collaboration >= 80) {
        insights.push({
            type: "strength",

            title: "Atividade bem distribuída",

            description:
                "Quando existem múltiplos contribuidores, a participação está relativamente distribuída.",
        });
    } else if (collaboration < 50) {
        insights.push({
            type: "attention",

            title: "Contribuições concentradas",

            description: "Grande parte da atividade está associada a um único contribuidor.",
        });
    }

    if (insights.length === 0) {
        insights.push({
            type: "neutral",

            title: "Perfil intermediário",

            description: "Nenhuma dimensão apresentou comportamento extremo no período analisado.",
        });
    }

    return insights.slice(0, 5);
}

function formatPercentage(value: number): string {
    return `${Math.round(value * 100)}%`;
}

export function ProjectHealthPanel({ health }: ProjectHealthPanelProps) {
    const insights = generateInsights(health);

    return (
        <section className="health-section">
            <header className="health-header">
                <div>
                    <span className="panel-eyebrow">Repository Health</span>

                    <h2>Project Health Score</h2>

                    <p>
                        Indicador heurístico baseado em atividade, consistência, mensagens de commit
                        e colaboração.
                    </p>
                </div>
            </header>

            <div className="health-layout">
                <section className="health-score-card">
                    <div
                        className={`health-ring health-level-${health.level}`}
                        style={
                            {
                                "--health-score": `${health.score}%`,
                            } as React.CSSProperties
                        }
                    >
                        <div className="health-ring-inner">
                            <strong>{Math.round(health.score)}</strong>

                            <span>/100</span>
                        </div>
                    </div>

                    <span className={`health-level health-level-text-${health.level}`}>
                        {levelLabels[health.level]}
                    </span>

                    <p>Pontuação calculada a partir de cinco dimensões analíticas.</p>
                </section>

                <section className="analytics-panel health-dimensions-panel">
                    <div className="panel-header">
                        <div>
                            <span className="panel-eyebrow">Decomposição</span>

                            <h3>Dimensões do score</h3>
                        </div>
                    </div>

                    <div className="health-dimensions">
                        {health.dimensions.map((dimension) => (
                            <article className="health-dimension" key={dimension.key}>
                                <div className="health-dimension-header">
                                    <div>
                                        <strong>{dimensionLabels[dimension.key]}</strong>

                                        <span>{dimensionDescriptions[dimension.key]}</span>
                                    </div>

                                    <div className="health-dimension-score">
                                        <strong>{Math.round(dimension.score)}</strong>

                                        <small>peso {formatPercentage(dimension.weight)}</small>
                                    </div>
                                </div>

                                <div className="health-progress">
                                    <div
                                        style={{
                                            width: `${Math.min(dimension.score, 100)}%`,
                                        }}
                                    />
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </div>

            <section className="analytics-panel health-insights-panel">
                <div className="panel-header">
                    <div>
                        <span className="panel-eyebrow">Explainability</span>

                        <h3>Insights da análise</h3>
                    </div>
                </div>

                <div className="health-insights">
                    {insights.map((insight, index) => (
                        <article
                            className={`health-insight insight-${insight.type}`}
                            key={`${insight.title}-${index}`}
                        >
                            <div className="insight-indicator">
                                {insight.type === "strength"
                                    ? "+"
                                    : insight.type === "attention"
                                      ? "!"
                                      : "•"}
                            </div>

                            <div>
                                <strong>{insight.title}</strong>

                                <p>{insight.description}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <details className="health-methodology">
                <summary>Como o score é calculado?</summary>

                <div>
                    <p>
                        O Project Health Score é uma heurística própria do DevPulse e não representa
                        qualidade do código, segurança ou maturidade absoluta do projeto.
                    </p>

                    <ul>
                        {health.dimensions.map((dimension) => (
                            <li key={dimension.key}>
                                <strong>{dimensionLabels[dimension.key]}</strong>
                                {" — "}
                                peso de {formatPercentage(dimension.weight)}
                            </li>
                        ))}
                    </ul>

                    <p>Metodologia: versão {health.methodology.version}</p>
                </div>
            </details>
        </section>
    );
}
