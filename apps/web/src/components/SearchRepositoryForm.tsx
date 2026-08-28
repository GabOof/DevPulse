import { useState, type FormEvent } from "react";

interface SearchRepositoryFormProps {
    onSearch: (repository: string) => void | Promise<void>;
    loading?: boolean;
}

const MAX_REPOSITORY_INPUT_LENGTH = 300;

export function SearchRepositoryForm({ onSearch, loading = false }: SearchRepositoryFormProps) {
    const [repository, setRepository] = useState("");

    const normalizedRepository = repository.trim();
    const canSubmit = normalizedRepository.length > 0 && !loading;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        await onSearch(normalizedRepository);
    }

    return (
        <form className="repository-search" onSubmit={handleSubmit} aria-busy={loading}>
            <div className="search-input-wrapper">
                <input
                    id="repository-search-input"
                    name="repository"
                    type="text"
                    value={repository}
                    onChange={(event) => setRepository(event.target.value)}
                    placeholder="GabOof/DevPulse ou https://github.com/GabOof/DevPulse"
                    aria-label="Repositório do GitHub"
                    aria-describedby="repository-search-help"
                    disabled={loading}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="search"
                    maxLength={MAX_REPOSITORY_INPUT_LENGTH}
                />

                <button type="submit" disabled={!canSubmit} aria-busy={loading}>
                    {loading ? "Analisando..." : "Analisar"}
                </button>
            </div>

            <p id="repository-search-help" className="search-help">
                Informe owner/repository ou cole uma URL completa do GitHub.
            </p>
        </form>
    );
}
