import type { Repository } from "../types/repository";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

interface RepositoryCardProps {
    repository: Repository;
}

/*
 * =========================================================
 * FORMATTERS
 * =========================================================
 */

const numberFormatter = new Intl.NumberFormat("pt-BR", {
    notation: "compact",

    maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",

    month: "short",

    year: "numeric",
});

/*
 * =========================================================
 * FORMAT NUMBER
 * =========================================================
 */

function formatNumber(value: number): string {
    /*
     * Proteção contra algum valor
     * inesperado retornado pela API.
     */

    if (!Number.isFinite(value)) {
        return "0";
    }

    return numberFormatter.format(value);
}

/*
 * =========================================================
 * FORMAT DATE
 * =========================================================
 */

function formatDate(value: string): string {
    const date = new Date(value);

    /*
     * Evita exibir "Invalid Date"
     * caso algum repositório tenha
     * uma data inesperada.
     */

    if (Number.isNaN(date.getTime())) {
        return "Não informada";
    }

    return dateFormatter.format(date);
}

/*
 * =========================================================
 * REPOSITORY CARD
 * =========================================================
 */

export function RepositoryCard({ repository }: RepositoryCardProps) {
    const repositoryLabel = `${repository.owner.username}/${repository.name}`;

    const description = repository.description?.trim() || "Este repositório não possui descrição.";

    const primaryLanguage = repository.language?.trim() || "Não identificada";

    const defaultBranch = repository.defaultBranch?.trim() || "Não informada";

    const license = repository.license?.spdxId?.trim() || "Não informada";

    const topics = repository.topics ?? [];

    return (
        <section className="repository-card" aria-labelledby="repository-title">
            {/* ==========================================
                HEADER
            ========================================== */}

            <div className="repository-header">
                <div className="repository-owner">
                    <img
                        src={repository.owner.avatarUrl}
                        alt={`Avatar de ${repository.owner.username}`}
                        loading="lazy"
                        width="50"
                        height="50"
                    />

                    <div>
                        <span className="repository-owner-name">{repository.owner.username}</span>

                        <h2 id="repository-title">{repository.name}</h2>
                    </div>
                </div>

                <a
                    className="github-link"
                    href={repository.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir ${repositoryLabel} no GitHub em uma nova aba`}
                    title={`Abrir ${repositoryLabel} no GitHub`}
                >
                    Ver no GitHub
                </a>
            </div>

            {/* ==========================================
                DESCRIPTION
            ========================================== */}

            <p className="repository-description">{description}</p>

            {/* ==========================================
                MAIN METRICS
            ========================================== */}

            <div className="repository-metrics" aria-label="Métricas do repositório">
                <article className="metric">
                    <span>Stars</span>

                    <strong>{formatNumber(repository.stats.stars)}</strong>
                </article>

                <article className="metric">
                    <span>Forks</span>

                    <strong>{formatNumber(repository.stats.forks)}</strong>
                </article>

                <article className="metric">
                    <span>Issues</span>

                    <strong>{formatNumber(repository.stats.openIssues)}</strong>
                </article>

                <article className="metric">
                    <span>Watchers</span>

                    <strong>{formatNumber(repository.stats.watchers)}</strong>
                </article>
            </div>

            {/* ==========================================
                DETAILS
            ========================================== */}

            <div className="repository-details" aria-label="Detalhes do repositório">
                <div>
                    <span>Linguagem principal</span>

                    <strong>{primaryLanguage}</strong>
                </div>

                <div>
                    <span>Branch principal</span>

                    <strong>{defaultBranch}</strong>
                </div>

                <div>
                    <span>Licença</span>

                    <strong>{license}</strong>
                </div>

                <div>
                    <span>Último push</span>

                    <strong>{formatDate(repository.pushedAt)}</strong>
                </div>
            </div>

            {/* ==========================================
                TOPICS
            ========================================== */}

            {topics.length > 0 && (
                <div className="repository-topics" aria-label="Tópicos do repositório">
                    {topics.map((topic) => (
                        <span key={topic}>{topic}</span>
                    ))}
                </div>
            )}

            {/* ==========================================
                FOOTER
            ========================================== */}

            <footer className="repository-footer">
                Criado em{" "}
                <time dateTime={repository.createdAt}>{formatDate(repository.createdAt)}</time>
            </footer>
        </section>
    );
}
