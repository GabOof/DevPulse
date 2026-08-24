import type { LanguageUsage } from "../types/analytics";

interface LanguageDistributionProps {
    languages: LanguageUsage[];
}

export function LanguageDistribution({ languages }: LanguageDistributionProps) {
    if (languages.length === 0) {
        return (
            <section className="analytics-panel">
                <div className="panel-header">
                    <div>
                        <span className="panel-eyebrow">Tecnologias</span>

                        <h3>Linguagens</h3>
                    </div>
                </div>

                <p className="empty-state">
                    Não foi possível identificar linguagens neste repositório.
                </p>
            </section>
        );
    }

    return (
        <section className="analytics-panel">
            <div className="panel-header">
                <div>
                    <span className="panel-eyebrow">Tecnologias</span>

                    <h3>Distribuição de linguagens</h3>
                </div>
            </div>

            <div className="languages">
                {languages.map((language) => (
                    <div className="language" key={language.name}>
                        <div className="language-header">
                            <strong>{language.name}</strong>

                            <span>{language.percentage.toFixed(1)}%</span>
                        </div>

                        <div className="language-bar">
                            <div
                                className="language-progress"
                                style={{
                                    width: `${language.percentage}%`,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
