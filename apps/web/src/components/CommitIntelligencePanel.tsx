import type { CommitCategory, CommitCategoryStats, CommitIntelligence } from "../types/analytics";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

interface CommitIntelligencePanelProps {
    intelligence: CommitIntelligence;
}

/*
 * =========================================================
 * LABELS
 * =========================================================
 */

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

/*
 * =========================================================
 * FORMATTERS
 * =========================================================
 */

const percentageFormatter = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("pt-BR");

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",

    month: "short",

    year: "numeric",
});

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
 * FORMAT PERCENTAGE
 * =========================================================
 */

function formatPercentage(value: number): string {
    return percentageFormatter.format(normalizePercentage(value));
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
 * FORMAT DATE
 * =========================================================
 */

function formatDate(value: string): string {
    if (!value) {
        return "Data indisponível";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Data indisponível";
    }

    return dateFormatter.format(date);
}

/*
 * =========================================================
 * COMMIT LABEL
 * =========================================================
 */

function getCommitLabel(count: number): string {
    const normalized = normalizeCount(count);

    return normalized === 1 ? "commit identificado" : "commits identificados";
}

/*
 * =========================================================
 * BREAKING CHANGES LABEL
 * =========================================================
 */

function getBreakingChangesLabel(count: number): string {
    const normalized = normalizeCount(count);

    return normalized === 1
        ? "alteração incompatível detectada"
        : "alterações incompatíveis detectadas";
}

/*
 * =========================================================
 * DEVELOPMENT PROFILE
 * =========================================================
 */

function getDevelopmentProfile(categories: CommitCategoryStats[]): string {
    /*
     * Criamos um novo array antes de ordenar.
     *
     * Assim nunca alteramos o array recebido
     * através das props.
     */

    const activeCategories = categories
        .filter((category) => normalizeCount(category.count) > 0)
        .map((category) => ({
            ...category,

            percentage: normalizePercentage(category.percentage),
        }))
        .sort((first, second) => second.percentage - first.percentage);

    /*
     * Nenhum commit classificado.
     */

    if (activeCategories.length === 0) {
        return "Sem atividade recente";
    }

    const first = activeCategories[0];

    const second = activeCategories[1];

    if (!first) {
        return "Sem atividade recente";
    }

    /*
     * Caso "other" seja predominante,
     * não inferimos um perfil específico.
     */

    if (first.category === "other") {
        return "Perfil não classificado";
    }

    /*
     * Diferença de até cinco pontos
     * percentuais entre as duas categorias
     * mais frequentes.
     */

    if (second && first.percentage - second.percentage <= 5) {
        return "Perfil equilibrado";
    }

    return profileLabels[first.category];
}

/*
 * =========================================================
 * COMMIT INTELLIGENCE PANEL
 * =========================================================
 */

export function CommitIntelligencePanel({ intelligence }: CommitIntelligencePanelProps) {
    const profile = getDevelopmentProfile(intelligence.categories);

    const conventionalPercentage = normalizePercentage(intelligence.conventionalPercentage);

    const conventionalCommits = normalizeCount(intelligence.conventionalCommits);

    const breakingChanges = normalizeCount(intelligence.breakingChanges);

    const hasCategories = intelligence.categories.some(
        (category) => normalizeCount(category.count) > 0
    );

    return (
        <section className="commit-intelligence" aria-labelledby="commit-intelligence-title">
            {/* ==========================================
                HEADER
            ========================================== */}

            <header className="intelligence-header">
                <div>
                    <span className="panel-eyebrow">Mining Software Repositories</span>

                    <h2 id="commit-intelligence-title">Commit Intelligence</h2>

                    <p>Análise semântica das mensagens de commit do período selecionado.</p>
                </div>

                <div className="development-profile" aria-label={`Perfil predominante: ${profile}`}>
                    <span>Perfil predominante</span>

                    <strong>{profile}</strong>
                </div>
            </header>

            {/* ==========================================
                OVERVIEW
            ========================================== */}

            <div className="intelligence-overview" aria-label="Resumo da inteligência de commits">
                {/* ======================================
                    CONVENTIONAL COMMITS
                ====================================== */}

                <article className="intelligence-card">
                    <span>Conventional Commits</span>

                    <strong>{formatPercentage(conventionalPercentage)}%</strong>

                    <small>
                        {formatCount(conventionalCommits)} {getCommitLabel(conventionalCommits)}
                    </small>

                    <div
                        className="conventional-progress"
                        role="progressbar"
                        aria-label={`Conventional Commits: ${formatPercentage(
                            conventionalPercentage
                        )}%`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={conventionalPercentage}
                    >
                        <div
                            aria-hidden="true"
                            style={{
                                width: `${conventionalPercentage}%`,
                            }}
                        />
                    </div>
                </article>

                {/* ======================================
                    BREAKING CHANGES
                ====================================== */}

                <article className="intelligence-card">
                    <span>Breaking Changes</span>

                    <strong>{formatCount(breakingChanges)}</strong>

                    <small>{getBreakingChangesLabel(breakingChanges)}</small>
                </article>
            </div>

            {/* ==========================================
                DETAILS
            ========================================== */}

            <div className="intelligence-grid">
                {/* ======================================
                    CATEGORIES
                ====================================== */}

                <section className="analytics-panel" aria-labelledby="commit-categories-title">
                    <div className="panel-header">
                        <div>
                            <span className="panel-eyebrow">Distribuição</span>

                            <h3 id="commit-categories-title">Tipos de alteração</h3>
                        </div>
                    </div>

                    {!hasCategories ? (
                        <p className="empty-state" role="status">
                            Não houve commits suficientes para identificar tipos de alteração neste
                            período.
                        </p>
                    ) : (
                        <div
                            className="commit-categories"
                            aria-label="Distribuição dos tipos de commit"
                        >
                            {intelligence.categories.map((category) => {
                                const percentage = normalizePercentage(category.percentage);

                                const count = normalizeCount(category.count);

                                const label = categoryLabels[category.category];

                                return (
                                    <div className="commit-category" key={category.category}>
                                        <div className="commit-category-header">
                                            <span>{label}</span>

                                            <div>
                                                <strong>{formatCount(count)}</strong>

                                                <small>{formatPercentage(percentage)}%</small>
                                            </div>
                                        </div>

                                        <div
                                            className="commit-category-bar"
                                            role="progressbar"
                                            aria-label={`${label}: ${formatPercentage(
                                                percentage
                                            )}%`}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-valuenow={percentage}
                                        >
                                            <div
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
                    )}
                </section>

                {/* ======================================
                    RECENT COMMITS
                ====================================== */}

                <section
                    className="analytics-panel recent-commits-panel"
                    aria-labelledby="recent-commits-title"
                >
                    <div className="panel-header">
                        <div>
                            <span className="panel-eyebrow">Histórico</span>

                            <h3 id="recent-commits-title">Commits recentes</h3>
                        </div>
                    </div>

                    {intelligence.recentCommits.length === 0 ? (
                        <p className="empty-state" role="status">
                            Nenhum commit encontrado neste período.
                        </p>
                    ) : (
                        <div className="recent-commits">
                            {intelligence.recentCommits.map((commit) => (
                                <a
                                    href={commit.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="recent-commit"
                                    key={commit.sha}
                                    aria-label={`Commit ${commit.shortSha}: ${commit.message}. Abrir no GitHub em uma nova aba.`}
                                >
                                    {/* ==================
                                            COMMIT HEADER
                                        ================== */}

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

                                    {/* ==================
                                            MESSAGE
                                        ================== */}

                                    <strong className="commit-message">{commit.message}</strong>

                                    {/* ==================
                                            METADATA
                                        ================== */}

                                    <div className="commit-meta">
                                        <span>{commit.author || "Autor não identificado"}</span>

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
