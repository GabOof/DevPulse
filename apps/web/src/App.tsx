import { useState } from "react";

import "./App.css";

import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { RepositoryCard } from "./components/RepositoryCard";
import { SearchRepositoryForm } from "./components/SearchRepositoryForm";

import { getRepository, getRepositoryAnalytics } from "./services/api";

import type { AnalyticsPeriod, RepositoryAnalytics } from "./types/analytics";

import type { Repository } from "./types/repository";

interface SelectedRepository {
    owner: string;
    repo: string;
}

function App() {
    const [repository, setRepository] = useState<Repository | null>(null);

    const [analytics, setAnalytics] = useState<RepositoryAnalytics | null>(null);

    const [selectedRepository, setSelectedRepository] = useState<SelectedRepository | null>(null);

    const [period, setPeriod] = useState<AnalyticsPeriod>(30);

    const [loading, setLoading] = useState(false);

    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);

    async function handleSearch(owner: string, repo: string) {
        try {
            setLoading(true);

            setError(null);
            setRepository(null);
            setAnalytics(null);

            const initialPeriod: AnalyticsPeriod = 30;

            const [repositoryData, analyticsData] = await Promise.all([
                getRepository(owner, repo),

                getRepositoryAnalytics(owner, repo, initialPeriod),
            ]);

            setRepository(repositoryData);
            setAnalytics(analyticsData);

            setSelectedRepository({
                owner,
                repo,
            });

            setPeriod(initialPeriod);
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError("Ocorreu um erro inesperado.");
            }
        } finally {
            setLoading(false);
        }
    }

    async function handlePeriodChange(newPeriod: AnalyticsPeriod) {
        if (!selectedRepository || newPeriod === period) {
            return;
        }

        try {
            setAnalyticsLoading(true);
            setError(null);

            const analyticsData = await getRepositoryAnalytics(
                selectedRepository.owner,
                selectedRepository.repo,
                newPeriod
            );

            setAnalytics(analyticsData);
            setPeriod(newPeriod);
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError("Não foi possível atualizar as métricas.");
            }
        } finally {
            setAnalyticsLoading(false);
        }
    }

    return (
        <div className="app">
            <header className="app-header">
                <a className="brand" href="/">
                    <span className="brand-mark">DP</span>

                    <span>DevPulse</span>
                </a>

                <span className="version">v0.4</span>
            </header>

            <main>
                <section className="hero">
                    <span className="eyebrow">GitHub Repository Analytics</span>

                    <h1>Entenda a saúde dos seus projetos.</h1>

                    <p>
                        Transforme dados de desenvolvimento do GitHub em métricas úteis sobre
                        atividade, tecnologias e evolução do projeto.
                    </p>

                    <SearchRepositoryForm onSearch={handleSearch} loading={loading} />
                </section>

                {error && (
                    <div className="error-message" role="alert">
                        <strong>Não foi possível concluir a análise</strong>

                        <span>{error}</span>
                    </div>
                )}

                {loading && (
                    <section className="loading-card">
                        <div className="loading-bar" />

                        <span>Coletando e analisando dados do GitHub...</span>
                    </section>
                )}

                {repository && <RepositoryCard repository={repository} />}

                {repository && analytics && (
                    <AnalyticsDashboard
                        analytics={analytics}
                        period={period}
                        loading={analyticsLoading}
                        onPeriodChange={handlePeriodChange}
                    />
                )}
            </main>

            <footer className="app-footer">DevPulse · GitHub Project Analytics</footer>
        </div>
    );
}

export default App;
