import type {
    CollaborationAnalytics,
    CollaborationRisk,
    ContributorActivity,
} from "../types/analytics";

interface CollaborationPanelProps {
    collaboration: CollaborationAnalytics;
}

const riskLabels: Record<CollaborationRisk, string> = {
    low: "Baixo",
    medium: "Moderado",
    high: "Alto",
    very_high: "Muito alto",
};

const riskDescriptions: Record<CollaborationRisk, string> = {
    low: "A atividade recente está relativamente distribuída entre os contribuidores.",

    medium: "Existe uma concentração moderada da atividade em um contribuidor.",

    high: "Grande parte da atividade recente está concentrada em um único contribuidor.",

    very_high: "A atividade recente está fortemente concentrada em um único contribuidor.",
};

function formatPercentage(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 1,
    }).format(value);
}

function ContributorAvatar({ contributor }: { contributor: ContributorActivity }) {
    if (contributor.avatarUrl) {
        return (
            <img
                className="contributor-avatar"
                src={contributor.avatarUrl}
                alt={`Avatar de ${contributor.username ?? contributor.name}`}
            />
        );
    }

    const initials = contributor.name
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();

    return <div className="contributor-avatar contributor-avatar-fallback">{initials || "?"}</div>;
}

export function CollaborationPanel({ collaboration }: CollaborationPanelProps) {
    const {
        totalContributors,
        topContributor,
        concentrationPercentage,
        concentrationRisk,
        contributors,
    } = collaboration;

    return (
        <section className="collaboration-section">
            <header className="collaboration-header">
                <div>
                    <span className="panel-eyebrow">Collaboration Analytics</span>

                    <h2>Contributors & Collaboration</h2>

                    <p>Distribuição da atividade entre os contribuidores no período selecionado.</p>
                </div>
            </header>

            <div className="collaboration-summary">
                <article className="collaboration-metric">
                    <span>Contribuidores</span>

                    <strong>{totalContributors}</strong>

                    <small>autores identificados</small>
                </article>

                <article className="collaboration-metric">
                    <span>Principal contribuidor</span>

                    <strong className="top-contributor-name">
                        {topContributor?.username ?? topContributor?.name ?? "—"}
                    </strong>

                    <small>
                        {topContributor ? `${topContributor.commits} commits` : "sem atividade"}
                    </small>
                </article>

                <article className="collaboration-metric">
                    <span>Concentração principal</span>

                    <strong>{formatPercentage(concentrationPercentage)}%</strong>

                    <small>da atividade analisada</small>
                </article>
            </div>

            <div className="collaboration-grid">
                <section className="analytics-panel">
                    <div className="panel-header">
                        <div>
                            <span className="panel-eyebrow">Participação</span>

                            <h3>Ranking de contribuidores</h3>
                        </div>
                    </div>

                    {contributors.length === 0 ? (
                        <p className="empty-state">
                            Nenhum contribuidor identificado neste período.
                        </p>
                    ) : (
                        <div className="contributors-list">
                            {contributors.map((contributor, index) => (
                                <article className="contributor-item" key={contributor.id}>
                                    <span className="contributor-position">{index + 1}</span>

                                    {contributor.profileUrl ? (
                                        <a
                                            href={contributor.profileUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="contributor-avatar-link"
                                        >
                                            <ContributorAvatar contributor={contributor} />
                                        </a>
                                    ) : (
                                        <ContributorAvatar contributor={contributor} />
                                    )}

                                    <div className="contributor-data">
                                        <div className="contributor-header">
                                            <div>
                                                <strong>
                                                    {contributor.username ?? contributor.name}
                                                </strong>

                                                {contributor.username &&
                                                    contributor.name !== contributor.username && (
                                                        <small>{contributor.name}</small>
                                                    )}
                                            </div>

                                            <div className="contributor-numbers">
                                                <strong>{contributor.commits}</strong>

                                                <small>commits</small>
                                            </div>
                                        </div>

                                        <div className="contributor-progress-container">
                                            <div className="contributor-progress">
                                                <div
                                                    style={{
                                                        width: `${Math.min(
                                                            contributor.percentage,
                                                            100
                                                        )}%`,
                                                    }}
                                                />
                                            </div>

                                            <span>{formatPercentage(contributor.percentage)}%</span>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="analytics-panel concentration-panel">
                    <div className="panel-header">
                        <div>
                            <span className="panel-eyebrow">Concentração</span>

                            <h3>Risco de dependência</h3>
                        </div>
                    </div>

                    <div className={`risk-indicator risk-${concentrationRisk}`}>
                        <span>Risco de concentração</span>

                        <strong>{riskLabels[concentrationRisk]}</strong>
                    </div>

                    <p className="risk-description">{riskDescriptions[concentrationRisk]}</p>

                    <div className="concentration-visual">
                        <div className="concentration-bar">
                            <div
                                style={{
                                    width: `${Math.min(concentrationPercentage, 100)}%`,
                                }}
                            />
                        </div>

                        <div className="concentration-scale">
                            <span>Distribuído</span>

                            <span>Concentrado</span>
                        </div>
                    </div>

                    <div className="methodology-note">
                        <strong>Como interpretar?</strong>

                        <p>
                            O indicador considera apenas a distribuição dos commits coletados no
                            período. Ele não mede diretamente conhecimento técnico, autoria de
                            código ou bus factor.
                        </p>
                    </div>
                </section>
            </div>
        </section>
    );
}
