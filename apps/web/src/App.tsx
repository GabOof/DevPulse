import { useState } from "react";

import "./App.css";

import { RepositoryCard } from "./components/RepositoryCard";
import { SearchRepositoryForm } from "./components/SearchRepositoryForm";

import { getRepository } from "./services/api";

import type { Repository } from "./types/repository";

function App() {
    const [repository, setRepository] = useState<Repository | null>(null);

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);

    async function handleSearch(owner: string, repo: string) {
        try {
            setLoading(true);
            setError(null);
            setRepository(null);

            const data = await getRepository(owner, repo);

            setRepository(data);
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
                return;
            }

            setError("Ocorreu um erro inesperado.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="app">
            <header className="app-header">
                <a className="brand" href="/">
                    <span className="brand-mark">DP</span>

                    <span>DevPulse</span>
                </a>

                <span className="version">v0.1</span>
            </header>

            <main>
                <section className="hero">
                    <span className="eyebrow">GitHub Repository Analytics</span>

                    <h1>Entenda a saúde dos seus projetos.</h1>

                    <p>
                        Consulte repositórios GitHub e transforme dados de engenharia de software em
                        informações úteis.
                    </p>

                    <SearchRepositoryForm onSearch={handleSearch} loading={loading} />
                </section>

                {error && (
                    <div className="error-message" role="alert">
                        <strong>Não foi possível analisar</strong>

                        <span>{error}</span>
                    </div>
                )}

                {loading && (
                    <section className="loading-card">
                        <div className="loading-bar" />

                        <span>Consultando dados do GitHub...</span>
                    </section>
                )}

                {repository && <RepositoryCard repository={repository} />}
            </main>

            <footer className="app-footer">DevPulse · GitHub Project Analytics</footer>
        </div>
    );
}

export default App;
