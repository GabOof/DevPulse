import type { CSSProperties } from "react";

import type {
    HealthDimension,
    HealthDimensionKey,
    ProjectHealthLevel,
    ProjectHealthScore,
} from "../types/analytics";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

interface ProjectHealthPanelProps {
    health: ProjectHealthScore;
}

interface HealthInsight {
    type: "strength" | "attention" | "neutral";

    title: string;

    description: string;
}

/*
 * =========================================================
 * DIMENSIONS
 * =========================================================
 */

const DIMENSION_ORDER: HealthDimensionKey[] = [
    "activity",
    "consistency",
    "commit_hygiene",
    "change_clarity",
    "collaboration",
];

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

/*
 * =========================================================
 * HEALTH LEVELS
 * =========================================================
 */

const levelLabels: Record<ProjectHealthLevel, string> = {
    excellent: "Excelente",

    good: "Bom",

    attention: "Atenção",

    critical: "Crítico",
};

/*
 * =========================================================
 * NUMBER HELPERS
 * =========================================================
 */

function normalizeScore(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.min(100, Math.max(0, value));
}

function normalizeWeight(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.min(1, Math.max(0, value));
}

function formatScore(value: number): string {
    return String(Math.round(normalizeScore(value)));
}

function formatPercentage(value: number): string {
    return `${Math.round(normalizeWeight(value) * 100)}%`;
}

/*
 * =========================================================
 * GET DIMENSION
 * =========================================================
 *
 * O backend normalmente devolve todas as
 * dimensões.
 *
 * Mesmo assim, usamos fallback para que uma
 * resposta incompleta não quebre a interface.
 */

function getDimension(
    health: ProjectHealthScore,

    key: HealthDimensionKey
): HealthDimension {
    return (
        health.dimensions.find((dimension) => dimension.key === key) ?? {
            key,

            score: 0,

            weight: 0,

            weightedScore: 0,
        }
    );
}

/*
 * =========================================================
 * NORMALIZED DIMENSIONS
 * =========================================================
 */

function getOrderedDimensions(health: ProjectHealthScore): HealthDimension[] {
    return DIMENSION_ORDER.map((key) => getDimension(health, key));
}

/*
 * =========================================================
 * INSIGHTS
 * =========================================================
 */

function generateInsights(health: ProjectHealthScore): HealthInsight[] {
    const dimensions = getOrderedDimensions(health);

    /*
     * Se todas as dimensões estão zeradas,
     * evita apresentar cinco alertas que
     * poderiam sugerir problemas diferentes.
     *
     * O estado representa simplesmente que
     * não houve sinais suficientes no período.
     */

    const noSignals = dimensions.every((dimension) => normalizeScore(dimension.score) === 0);

    if (noSignals) {
        return [
            {
                type: "neutral",

                title: "Sem atividade suficiente",

                description:
                    "O DevPulse não encontrou sinais suficientes no período para destacar pontos fortes ou padrões de desenvolvimento.",
            },
        ];
    }

    const insights: HealthInsight[] = [];

    const activity = normalizeScore(getDimension(health, "activity").score);

    const consistency = normalizeScore(getDimension(health, "consistency").score);

    const hygiene = normalizeScore(getDimension(health, "commit_hygiene").score);

    const clarity = normalizeScore(getDimension(health, "change_clarity").score);

    const collaboration = normalizeScore(getDimension(health, "collaboration").score);

    /*
     * =====================================================
     * ACTIVITY
     * =====================================================
     */

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

    /*
     * =====================================================
     * CONSISTENCY
     * =====================================================
     */

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

    /*
     * =====================================================
     * COMMIT HYGIENE
     * =====================================================
     */

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

    /*
     * =====================================================
     * CHANGE CLARITY
     * =====================================================
     */

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

    /*
     * =====================================================
     * COLLABORATION
     * =====================================================
     */

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

    /*
     * Nenhuma dimensão atingiu os limites
     * definidos para destaque.
     */

    if (insights.length === 0) {
        insights.push({
            type: "neutral",

            title: "Perfil intermediário",

            description: "Nenhuma dimensão apresentou comportamento extremo no período analisado.",
        });
    }

    /*
     * Evita excesso de informação visual.
     */

    return insights.slice(0, 5);
}

/*
 * =========================================================
 * PROJECT HEALTH PANEL
 * =========================================================
 */

export function ProjectHealthPanel({ health }: ProjectHealthPanelProps) {
    const score = normalizeScore(health.score);

    const roundedScore = Math.round(score);

    const dimensions = getOrderedDimensions(health);

    const insights = generateInsights(health);

    const healthLevel = levelLabels[health.level];

    const ringStyle = {
        "--health-score": `${score}%`,
    } as CSSProperties;

    return (
        <section className="health-section" aria-labelledby="project-health-title">
            {/* ==========================================
                HEADER
            ========================================== */}

            <header className="health-header">
                <div>
                    <span className="panel-eyebrow">Repository Health</span>

                    <h2 id="project-health-title">Project Health Score</h2>

                    <p>
                        Indicador heurístico baseado em atividade, consistência, mensagens de commit
                        e colaboração.
                    </p>
                </div>
            </header>

            {/* ==========================================
                SCORE + DIMENSIONS
            ========================================== */}

            <div className="health-layout">
                {/* ======================================
                    SCORE
                ====================================== */}

                <section
                    className="health-score-card"
                    aria-label={`Project Health Score: ${roundedScore} de 100. Classificação: ${healthLevel}.`}
                >
                    <div
                        className={`health-ring health-level-${health.level}`}
                        style={ringStyle}
                        role="img"
                        aria-label={`${roundedScore} de 100`}
                    >
                        <div className="health-ring-inner" aria-hidden="true">
                            <strong>{roundedScore}</strong>

                            <span>/100</span>
                        </div>
                    </div>

                    <span className={`health-level health-level-text-${health.level}`}>
                        {healthLevel}
                    </span>

                    <p>Pontuação calculada a partir de cinco dimensões analíticas.</p>
                </section>

                {/* ======================================
                    DIMENSIONS
                ====================================== */}

                <section
                    className="analytics-panel health-dimensions-panel"
                    aria-labelledby="health-dimensions-title"
                >
                    <div className="panel-header">
                        <div>
                            <span className="panel-eyebrow">Decomposição</span>

                            <h3 id="health-dimensions-title">Dimensões do score</h3>
                        </div>
                    </div>

                    <div className="health-dimensions">
                        {dimensions.map((dimension) => {
                            const dimensionScore = normalizeScore(dimension.score);

                            return (
                                <article className="health-dimension" key={dimension.key}>
                                    <div className="health-dimension-header">
                                        <div>
                                            <strong>{dimensionLabels[dimension.key]}</strong>

                                            <span>{dimensionDescriptions[dimension.key]}</span>
                                        </div>

                                        <div className="health-dimension-score">
                                            <strong>{formatScore(dimensionScore)}</strong>

                                            <small>peso {formatPercentage(dimension.weight)}</small>
                                        </div>
                                    </div>

                                    <div
                                        className="health-progress"
                                        role="progressbar"
                                        aria-label={`${dimensionLabels[dimension.key]}: ${formatScore(
                                            dimensionScore
                                        )} de 100`}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={dimensionScore}
                                    >
                                        <div
                                            aria-hidden="true"
                                            style={{
                                                width: `${dimensionScore}%`,
                                            }}
                                        />
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            </div>

            {/* ==========================================
                INSIGHTS
            ========================================== */}

            <section
                className="analytics-panel health-insights-panel"
                aria-labelledby="health-insights-title"
            >
                <div className="panel-header">
                    <div>
                        <span className="panel-eyebrow">Explainability</span>

                        <h3 id="health-insights-title">Insights da análise</h3>
                    </div>
                </div>

                <div className="health-insights">
                    {insights.map((insight, index) => (
                        <article
                            className={`health-insight insight-${insight.type}`}
                            key={`${insight.title}-${index}`}
                        >
                            <div className="insight-indicator" aria-hidden="true">
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

            {/* ==========================================
                METHODOLOGY
            ========================================== */}

            <details className="health-methodology">
                <summary>Como o score é calculado?</summary>

                <div>
                    <p>
                        O Project Health Score é uma heurística própria do DevPulse e não representa
                        qualidade do código, segurança ou maturidade absoluta do projeto.
                    </p>

                    <ul>
                        {dimensions.map((dimension) => (
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
