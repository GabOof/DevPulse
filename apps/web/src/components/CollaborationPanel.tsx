import type {
    CollaborationAnalytics,
    CollaborationRisk,
    ContributorActivity,
} from "../types/analytics";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

interface CollaborationPanelProps {
    collaboration: CollaborationAnalytics;
}

interface ContributorAvatarProps {
    contributor: ContributorActivity;
}

/*
 * =========================================================
 * LABELS
 * =========================================================
 */

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

/*
 * =========================================================
 * FORMATTERS
 * =========================================================
 */

const percentageFormatter = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("pt-BR");

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
 * CONTRIBUTORS LABEL
 * =========================================================
 */

function getContributorsLabel(count: number): string {
    return normalizeCount(count) === 1 ? "autor identificado" : "autores identificados";
}

/*
 * =========================================================
 * COMMITS LABEL
 * =========================================================
 */

function getCommitsLabel(count: number): string {
    return normalizeCount(count) === 1 ? "commit" : "commits";
}

/*
 * =========================================================
 * CONTRIBUTOR DISPLAY NAME
 * =========================================================
 */

function getContributorDisplayName(contributor: ContributorActivity): string {
    const username = contributor.username?.trim();

    const name = contributor.name?.trim();

    return username || name || "Contribuidor não identificado";
}

/*
 * =========================================================
 * CONTRIBUTOR INITIALS
 * =========================================================
 */

function getContributorInitials(contributor: ContributorActivity): string {
    const source = contributor.name?.trim() || contributor.username?.trim() || "";

    if (!source) {
        return "?";
    }

    const initials = source
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");

    return initials || "?";
}

/*
 * =========================================================
 * CONTRIBUTOR AVATAR
 * =========================================================
 */

function ContributorAvatar({ contributor }: ContributorAvatarProps) {
    const displayName = getContributorDisplayName(contributor);

    /*
     * =====================================================
     * IMAGE
     * =====================================================
     */

    if (contributor.avatarUrl) {
        return (
            <img
                className="contributor-avatar"
                src={contributor.avatarUrl}
                alt={`Avatar de ${displayName}`}
                loading="lazy"
                width="40"
                height="40"
            />
        );
    }

    /*
     * =====================================================
     * FALLBACK
     * =====================================================
     */

    return (
        <div
            className="contributor-avatar contributor-avatar-fallback"
            aria-label={`Avatar de ${displayName}`}
            role="img"
        >
            {getContributorInitials(contributor)}
        </div>
    );
}

/*
 * =========================================================
 * COLLABORATION PANEL
 * =========================================================
 */

export function CollaborationPanel({ collaboration }: CollaborationPanelProps) {
    const {
        totalContributors,
        topContributor,
        concentrationPercentage,
        concentrationRisk,
        contributors,
    } = collaboration;

    /*
     * =====================================================
     * NORMALIZED VALUES
     * =====================================================
     */

    const normalizedTotalContributors = normalizeCount(totalContributors);

    const normalizedConcentration = normalizePercentage(concentrationPercentage);

    const topContributorCommits = topContributor ? normalizeCount(topContributor.commits) : 0;

    const hasContributors = contributors.length > 0 && normalizedTotalContributors > 0;

    const topContributorName = topContributor ? getContributorDisplayName(topContributor) : "—";

    /*
     * =====================================================
     * INTERFACE
     * =====================================================
     */

    return (
        <section className="collaboration-section" aria-labelledby="collaboration-title">
            {/* ==========================================
                HEADER
            ========================================== */}

            <header className="collaboration-header">
                <div>
                    <span className="panel-eyebrow">Collaboration Analytics</span>

                    <h2 id="collaboration-title">Contributors & Collaboration</h2>

                    <p>Distribuição da atividade entre os contribuidores no período selecionado.</p>
                </div>
            </header>

            {/* ==========================================
                SUMMARY
            ========================================== */}

            <div className="collaboration-summary" aria-label="Resumo da colaboração">
                {/* ======================================
                    CONTRIBUTORS
                ====================================== */}

                <article className="collaboration-metric">
                    <span>Contribuidores</span>

                    <strong>{formatCount(normalizedTotalContributors)}</strong>

                    <small>{getContributorsLabel(normalizedTotalContributors)}</small>
                </article>

                {/* ======================================
                    TOP CONTRIBUTOR
                ====================================== */}

                <article className="collaboration-metric">
                    <span>Principal contribuidor</span>

                    <strong className="top-contributor-name">{topContributorName}</strong>

                    <small>
                        {topContributor
                            ? `${formatCount(topContributorCommits)} ${getCommitsLabel(
                                  topContributorCommits
                              )}`
                            : "sem atividade"}
                    </small>
                </article>

                {/* ======================================
                    CONCENTRATION
                ====================================== */}

                <article className="collaboration-metric">
                    <span>Concentração principal</span>

                    <strong>{formatPercentage(normalizedConcentration)}%</strong>

                    <small>da atividade analisada</small>
                </article>
            </div>

            {/* ==========================================
                DETAILS
            ========================================== */}

            <div className="collaboration-grid">
                {/* ======================================
                    CONTRIBUTORS RANKING
                ====================================== */}

                <section className="analytics-panel" aria-labelledby="contributors-ranking-title">
                    <div className="panel-header">
                        <div>
                            <span className="panel-eyebrow">Participação</span>

                            <h3 id="contributors-ranking-title">Ranking de contribuidores</h3>
                        </div>
                    </div>

                    {contributors.length === 0 ? (
                        <p className="empty-state" role="status">
                            Nenhum contribuidor identificado neste período.
                        </p>
                    ) : (
                        <div
                            className="contributors-list"
                            aria-label="Ranking de contribuidores por número de commits"
                        >
                            {contributors.map((contributor, index) => {
                                const contributorName = getContributorDisplayName(contributor);

                                const contributorPercentage = normalizePercentage(
                                    contributor.percentage
                                );

                                const contributorCommits = normalizeCount(contributor.commits);

                                const secondaryName =
                                    contributor.username &&
                                    contributor.name &&
                                    contributor.name !== contributor.username
                                        ? contributor.name
                                        : null;

                                return (
                                    <article className="contributor-item" key={contributor.id}>
                                        {/* ==================
                                                POSITION
                                            ================== */}

                                        <span
                                            className="contributor-position"
                                            aria-label={`${index + 1}º lugar`}
                                        >
                                            {index + 1}
                                        </span>

                                        {/* ==================
                                                AVATAR
                                            ================== */}

                                        {contributor.profileUrl ? (
                                            <a
                                                href={contributor.profileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="contributor-avatar-link"
                                                aria-label={`Abrir perfil de ${contributorName} no GitHub em uma nova aba`}
                                                title={`Abrir perfil de ${contributorName}`}
                                            >
                                                <ContributorAvatar contributor={contributor} />
                                            </a>
                                        ) : (
                                            <ContributorAvatar contributor={contributor} />
                                        )}

                                        {/* ==================
                                                DATA
                                            ================== */}

                                        <div className="contributor-data">
                                            <div className="contributor-header">
                                                <div>
                                                    <strong>{contributorName}</strong>

                                                    {secondaryName && (
                                                        <small>{secondaryName}</small>
                                                    )}
                                                </div>

                                                <div className="contributor-numbers">
                                                    <strong>
                                                        {formatCount(contributorCommits)}
                                                    </strong>

                                                    <small>
                                                        {getCommitsLabel(contributorCommits)}
                                                    </small>
                                                </div>
                                            </div>

                                            {/* ==================
                                                    PARTICIPATION
                                                ================== */}

                                            <div className="contributor-progress-container">
                                                <div
                                                    className="contributor-progress"
                                                    role="progressbar"
                                                    aria-label={`${contributorName}: ${formatPercentage(
                                                        contributorPercentage
                                                    )}% da atividade`}
                                                    aria-valuemin={0}
                                                    aria-valuemax={100}
                                                    aria-valuenow={contributorPercentage}
                                                >
                                                    <div
                                                        aria-hidden="true"
                                                        style={{
                                                            width: `${contributorPercentage}%`,
                                                        }}
                                                    />
                                                </div>

                                                <span>
                                                    {formatPercentage(contributorPercentage)}%
                                                </span>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* ======================================
                    CONCENTRATION
                ====================================== */}

                <section
                    className="analytics-panel concentration-panel"
                    aria-labelledby="concentration-risk-title"
                >
                    <div className="panel-header">
                        <div>
                            <span className="panel-eyebrow">Concentração</span>

                            <h3 id="concentration-risk-title">Risco de dependência</h3>
                        </div>
                    </div>

                    {!hasContributors ? (
                        /*
                         * Sem commits/contribuidores não faz
                         * sentido transformar a ausência de
                         * dados em um nível de risco.
                         */

                        <div className="evolution-empty" role="status">
                            <strong>Dados insuficientes</strong>

                            <p>
                                Não há atividade suficiente neste período para avaliar a
                                concentração entre contribuidores.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* ==========================
                                RISK
                            ========================== */}

                            <div
                                className={`risk-indicator risk-${concentrationRisk}`}
                                aria-label={`Risco de concentração: ${riskLabels[concentrationRisk]}`}
                            >
                                <span>Risco de concentração</span>

                                <strong>{riskLabels[concentrationRisk]}</strong>
                            </div>

                            <p className="risk-description">
                                {riskDescriptions[concentrationRisk]}
                            </p>

                            {/* ==========================
                                CONCENTRATION BAR
                            ========================== */}

                            <div className="concentration-visual">
                                <div
                                    className="concentration-bar"
                                    role="progressbar"
                                    aria-label={`Concentração principal: ${formatPercentage(
                                        normalizedConcentration
                                    )}%`}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={normalizedConcentration}
                                >
                                    <div
                                        aria-hidden="true"
                                        style={{
                                            width: `${normalizedConcentration}%`,
                                        }}
                                    />
                                </div>

                                <div className="concentration-scale" aria-hidden="true">
                                    <span>Distribuído</span>

                                    <span>Concentrado</span>
                                </div>
                            </div>

                            {/* ==========================
                                METHODOLOGY
                            ========================== */}

                            <div className="methodology-note">
                                <strong>Como interpretar?</strong>

                                <p>
                                    O indicador considera apenas a distribuição dos commits
                                    coletados no período. Ele não mede diretamente conhecimento
                                    técnico, autoria de código ou bus factor.
                                </p>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </section>
    );
}
