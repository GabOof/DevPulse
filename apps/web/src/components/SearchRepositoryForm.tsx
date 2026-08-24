import { useState, type FormEvent } from "react";

interface SearchRepositoryFormProps {
    onSearch: (owner: string, repo: string) => Promise<void>;

    loading: boolean;
}

export function SearchRepositoryForm({ onSearch, loading }: SearchRepositoryFormProps) {
    const [repository, setRepository] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const value = repository.trim();

        if (!value) {
            return;
        }

        const parts = value
            .replace("https://github.com/", "")
            .replace(/\/$/, "")
            .split("/")
            .filter(Boolean);

        if (parts.length !== 2) {
            return;
        }

        const [owner, repo] = parts;

        await onSearch(owner, repo);
    }

    return (
        <form className="repository-search" onSubmit={handleSubmit}>
            <label htmlFor="repository" className="search-label">
                Repositório GitHub
            </label>

            <div className="search-container">
                <input
                    id="repository"
                    type="text"
                    value={repository}
                    onChange={(event) => setRepository(event.target.value)}
                    placeholder="ex: facebook/react"
                    autoComplete="off"
                    disabled={loading}
                />

                <button type="submit" disabled={loading}>
                    {loading ? "Analisando..." : "Analisar projeto"}
                </button>
            </div>

            <span className="search-help">Informe owner/repository ou cole uma URL do GitHub.</span>
        </form>
    );
}
