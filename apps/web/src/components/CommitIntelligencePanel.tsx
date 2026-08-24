import type { CommitCategory, CommitCategoryStats, CommitIntelligence } from "../types/analytics";

interface CommitIntelligencePanelProps {
    intelligence: CommitIntelligence;
}

const categoryLabels: Record<CommitCategory, string> = {
    feature: "Features",
    fix: "Correções",
    refactor: "Refatorações",
    docs: "Documentação",
    test: "Testes",
    chore: "Manutenção",
    other: "Outros",
};

const profileLabels: Record<Exclude<CommitCategory, "other">, string> = {
    feature: "Desenvolvimento de funcionalidades",

    fix: "Manutenção corretiva",

    refactor: "Melhoria estrutural",

    docs: "Foco em documentação",

    test: "Foco em qualidade",

    chore: "Manutenção técnica",
};

function getDevelopmentProfile(categories: CommitCategoryStats[]): string {
    const activeCategories = categories
        .filter((category) => category.count > 0)
        .sort((a, b) => b.percentage - a.percentage);

    if (activeCategories.length === 0) {
        return "Sem atividade recente";
    }

    const first = activeCategories[0];

    const second = activeCategories[1];

    if (first.category === "other") {
        return "Perfil não classificado";
    }

    if (second && first.percentage - second.percentage <= 5) {
        return "Perfil equilibrado";
    }

    return profileLabels[first.category];
}

function formatPercentage(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 1,
    }).format(value);
}

function formatDate(value: string): string {
    if (!value) {
        return "Data indisponível";
    }

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

export function CommitIntelligencePanel({ intelligence }: CommitIntelligencePanelProps) {
    const profile = getDevelopmentProfile(intelligence.categories);

    return (
        <section className="commit-intelligence">
            <header className="intelligence-header">
                <div>
                    <span className="panel-eyebrow">Mining Software Repositories</span>

                    <h2>Commit Intelligence</h2>

                    <p>Análise semântica das mensagens de commit do período selecionado.</p>
                </div>

                <div className="development-profile">
                    <span>Perfil predominante</span>

                    <strong>{profile}</strong>
                </div>
            </header>

            <div className="intelligence-overview">
                <article className="intelligence-card">
                    <span>Conventional Commits</span>

                    <strong>{formatPercentage(intelligence.conventionalPercentage)}%</strong>

                    <small>{intelligence.conventionalCommits} commits identificados</small>

                    <div className="conventional-progress">
                        <div
                            style={{
                                width: `${Math.min(intelligence.conventionalPercentage, 100)}%`,
                            }}
                        />
                    </div>
                </article>

                <article className="intelligence-card">
                    <span>Breaking Changes</span>

                    <strong>{intelligence.breakingChanges}</strong>

                    <small>alterações incompatíveis detectadas</small>
                </article>
            </div>

            <div className="intelligence-grid">
                <section className="analytics-panel">
                    <div className="panel-header">
                        <div>
                            <span className="panel-eyebrow">Distribuição</span>

                            <h3>Tipos de alteração</h3>
                        </div>
                    </div>

                    <div className="commit-categories">
                        {intelligence.categories.map((category) => (
                            <div className="commit-category" key={category.category}>
                                <div className="commit-category-header">
                                    <span>{categoryLabels[category.category]}</span>

                                    <div>
                                        <strong>{category.count}</strong>

                                        <small>{formatPercentage(category.percentage)}%</small>
                                    </div>
                                </div>

                                <div className="commit-category-bar">
                                    <div
                                        style={{
                                            width: `${category.percentage}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="analytics-panel recent-commits-panel">
                    <div className="panel-header">
                        <div>
                            <span className="panel-eyebrow">Histórico</span>

                            <h3>Commits recentes</h3>
                        </div>
                    </div>

                    {intelligence.recentCommits.length === 0 ? (
                        <p className="empty-state">Nenhum commit encontrado neste período.</p>
                    ) : (
                        <div className="recent-commits">
                            {intelligence.recentCommits.map((commit) => (
                                <a
                                    href={commit.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="recent-commit"
                                    key={commit.sha}
                                >
                                    <div className="commit-top">
                                        <span
                                            className={`commit-badge commit-badge-${commit.category}`}
                                        >
                                            {categoryLabels[commit.category]}
                                        </span>

                                        <code>{commit.shortSha}</code>

                                        {commit.breakingChange && (
                                            <span className="breaking-badge">BREAKING</span>
                                        )}
                                    </div>

                                    <strong className="commit-message">{commit.message}</strong>

                                    <div className="commit-meta">
                                        <span>{commit.author}</span>

                                        <span>{formatDate(commit.date)}</span>

                                        <span>
                                            {commit.conventional ? "Conventional" : "Heurística"}
                                        </span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </section>
    );
}
