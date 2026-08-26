import { useState, type FormEvent } from "react";

interface SearchRepositoryFormProps {
    onSearch: (repository: string) => void | Promise<void>;

    loading?: boolean;
}

export function SearchRepositoryForm({ onSearch, loading = false }: SearchRepositoryFormProps) {
    const [repository, setRepository] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const value = repository.trim();

        if (!value) {
            return;
        }

        await onSearch(value);
    }

    return (
        <form className="repository-search" onSubmit={handleSubmit}>
            <div className="search-input-wrapper">
                <input
                    type="text"
                    value={repository}
                    onChange={(event) => setRepository(event.target.value)}
                    placeholder="GabOof/DevPulse ou https://github.com/GabOof/DevPulse"
                    aria-label="Repositório do GitHub"
                    disabled={loading}
                    autoComplete="off"
                />

                <button type="submit" disabled={loading || !repository.trim()}>
                    {loading ? "Analisando..." : "Analisar"}
                </button>
            </div>

            <p className="search-help">
                Informe owner/repository ou cole uma URL completa do GitHub.
            </p>
        </form>
    );
}
