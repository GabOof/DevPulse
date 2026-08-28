import type { LanguageUsage } from "../types/analytics";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

interface LanguageDistributionProps {
    languages: LanguageUsage[];
}

/*
 * =========================================================
 * FORMATTERS
 * =========================================================
 */

const percentageFormatter = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,

    maximumFractionDigits: 1,
});

/*
 * =========================================================
 * NORMALIZE PERCENTAGE
 * =========================================================
 */

function normalizePercentage(value: number): number {
    /*
     * Protege a interface contra valores
     * inválidos retornados pela API.
     */

    if (!Number.isFinite(value)) {
        return 0;
    }

    /*
     * Uma barra visual nunca deve ultrapassar
     * os limites de 0% a 100%.
     */

    return Math.min(100, Math.max(0, value));
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
 * LANGUAGE DISTRIBUTION
 * =========================================================
 */

export function LanguageDistribution({ languages }: LanguageDistributionProps) {
    /*
     * =====================================================
     * EMPTY STATE
     * =====================================================
     */

    if (languages.length === 0) {
        return (
            <section className="analytics-panel" aria-labelledby="languages-title">
                <div className="panel-header">
                    <div>
                        <span className="panel-eyebrow">Tecnologias</span>

                        <h3 id="languages-title">Linguagens</h3>
                    </div>
                </div>

                <p className="empty-state" role="status">
                    Não foi possível identificar linguagens neste repositório.
                </p>
            </section>
        );
    }

    /*
     * =====================================================
     * DISTRIBUTION
     * =====================================================
     */

    return (
        <section className="analytics-panel" aria-labelledby="languages-title">
            <div className="panel-header">
                <div>
                    <span className="panel-eyebrow">Tecnologias</span>

                    <h3 id="languages-title">Distribuição de linguagens</h3>
                </div>
            </div>

            <div className="languages" aria-label="Participação das linguagens no repositório">
                {languages.map((language) => {
                    const percentage = normalizePercentage(language.percentage);

                    return (
                        <div className="language" key={language.name}>
                            {/* ======================
                                    HEADER
                                ====================== */}

                            <div className="language-header">
                                <strong>{language.name}</strong>

                                <span>{formatPercentage(percentage)}</span>
                            </div>

                            {/* ======================
                                    PROGRESS
                                ====================== */}

                            <div
                                className="language-bar"
                                role="progressbar"
                                aria-label={`${language.name}: ${formatPercentage(percentage)}`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={percentage}
                            >
                                <div
                                    className="language-progress"
                                    aria-hidden="true"
                                    style={{
                                        width: `${percentage}%`,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
