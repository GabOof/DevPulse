import type { Repository } from "../types/repository";

interface RepositoryCardProps {
    repository: Repository;
}

function formatNumber(value: number) {
    return new Intl.NumberFormat("pt-BR", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value);
}

function formatDate(date: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(date));
}

export function RepositoryCard({ repository }: RepositoryCardProps) {
    return (
        <section className="repository-card">
            <div className="repository-header">
                <div className="repository-owner">
                    <img
                        src={repository.owner.avatarUrl}
                        alt={`Avatar de ${repository.owner.username}`}
                    />

                    <div>
                        <span className="repository-owner-name">{repository.owner.username}</span>

                        <h2>{repository.name}</h2>
                    </div>
                </div>

                <a
                    className="github-link"
                    href={repository.repositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                >
                    Ver no GitHub
                </a>
            </div>

            <p className="repository-description">
                {repository.description || "Este repositório não possui descrição."}
            </p>

            <div className="repository-metrics">
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

            <div className="repository-details">
                <div>
                    <span>Linguagem principal</span>
                    <strong>{repository.language || "Não identificada"}</strong>
                </div>

                <div>
                    <span>Branch principal</span>
                    <strong>{repository.defaultBranch}</strong>
                </div>

                <div>
                    <span>Licença</span>
                    <strong>{repository.license?.spdxId || "Não informada"}</strong>
                </div>

                <div>
                    <span>Último push</span>
                    <strong>{formatDate(repository.pushedAt)}</strong>
                </div>
            </div>

            {repository.topics.length > 0 && (
                <div className="repository-topics">
                    {repository.topics.map((topic) => (
                        <span key={topic}>{topic}</span>
                    ))}
                </div>
            )}

            <footer className="repository-footer">
                Criado em {formatDate(repository.createdAt)}
            </footer>
        </section>
    );
}
