import { useEffect, useState } from "react";

import "./App.css";

import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { RepositoryCard } from "./components/RepositoryCard";
import { SearchRepositoryForm } from "./components/SearchRepositoryForm";

import {
    getRepository,
    getRepositoryAnalytics,
    getRepositoryHistory,
    saveRepositoryAnalysis,
} from "./services/api";

import { getCurrentUser, getGitHubLoginUrl, logout } from "./services/auth";

import type { AnalysisHistoryItem, AnalyticsPeriod, RepositoryAnalytics } from "./types/analytics";

import type { Repository } from "./types/repository";

import type { AuthUser } from "./types/auth";

interface SelectedRepository {
    owner: string;
    repo: string;
}

const INITIAL_PERIOD: AnalyticsPeriod = 30;

/*
 * Permite pesquisar usando:
 *
 * GabOof/ouroguel
 *
 * ou:
 *
 * https://github.com/GabOof/ouroguel
 */
function parseRepositoryInput(input: string): SelectedRepository | null {
    const value = input.trim();

    if (!value) {
        return null;
    }

    /*
     * URL completa do GitHub.
     */
    if (value.startsWith("https://github.com/") || value.startsWith("http://github.com/")) {
        try {
            const url = new URL(value);

            const parts = url.pathname.split("/").filter(Boolean);

            if (parts.length < 2) {
                return null;
            }

            return {
                owner: parts[0],
                repo: parts[1].replace(/\.git$/, ""),
            };
        } catch {
            return null;
        }
    }

    /*
     * Formato owner/repository.
     */
    const parts = value.split("/").filter(Boolean);

    if (parts.length !== 2) {
        return null;
    }

    return {
        owner: parts[0],
        repo: parts[1].replace(/\.git$/, ""),
    };
}

function App() {
    /*
     * ============================
     * AUTENTICAÇÃO
     * ============================
     */

    const [user, setUser] = useState<AuthUser | null>(null);

    const [authLoading, setAuthLoading] = useState(true);

    /*
     * ============================
     * REPOSITÓRIO
     * ============================
     */

    const [repository, setRepository] = useState<Repository | null>(null);

    const [selectedRepository, setSelectedRepository] = useState<SelectedRepository | null>(null);

    /*
     * ============================
     * ANALYTICS
     * ============================
     */

    const [analytics, setAnalytics] = useState<RepositoryAnalytics | null>(null);

    const [period, setPeriod] = useState<AnalyticsPeriod>(INITIAL_PERIOD);

    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    /*
     * ============================
     * HISTÓRICO
     * ============================
     */

    const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);

    const [historyLoading, setHistoryLoading] = useState(false);

    const [snapshotSaving, setSnapshotSaving] = useState(false);

    const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null);

    /*
     * ============================
     * ESTADO GERAL
     * ============================
     */

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);

    /*
     * ============================
     * RECUPERAR SESSÃO
     * ============================
     */

    useEffect(() => {
        async function loadSession() {
            try {
                const auth = await getCurrentUser();

                if (auth.authenticated) {
                    setUser(auth.user);
                } else {
                    setUser(null);
                }
            } catch {
                /*
                 * Falha ao verificar a sessão
                 * não deve impedir o uso
                 * público do DevPulse.
                 */
                setUser(null);
            } finally {
                setAuthLoading(false);

                /*
                 * O callback OAuth retorna:
                 *
                 * /?auth=success
                 *
                 * Depois de verificarmos a
                 * sessão, removemos o parâmetro.
                 */
                const url = new URL(window.location.href);

                if (url.searchParams.has("auth")) {
                    url.searchParams.delete("auth");

                    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
                }
            }
        }

        void loadSession();
    }, []);

    /*
     * ============================
     * LOGIN
     * ============================
     */

    function handleLogin() {
        window.location.assign(getGitHubLoginUrl());
    }

    /*
     * ============================
     * LOGOUT
     * ============================
     */

    async function handleLogout() {
        try {
            setError(null);

            await logout();

            setUser(null);

            /*
             * Histórico pertence ao usuário,
             * então limpamos ao sair.
             */
            setHistory([]);

            setSnapshotMessage(null);
        } catch (logoutError) {
            if (logoutError instanceof Error) {
                setError(logoutError.message);
            } else {
                setError("Não foi possível realizar logout.");
            }
        }
    }

    /*
     * ============================
     * BUSCAR REPOSITÓRIO
     * ============================
     */

    async function handleSearch(repositoryInput: string) {
        const parsedRepository = parseRepositoryInput(repositoryInput);

        if (!parsedRepository) {
            setError("Informe um repositório no formato owner/repository ou uma URL do GitHub.");

            return;
        }

        const { owner, repo } = parsedRepository;

        try {
            setLoading(true);

            setAnalyticsLoading(true);

            setHistoryLoading(Boolean(user));

            setError(null);

            setSnapshotMessage(null);

            setHistory([]);

            /*
             * Toda nova busca começa
             * novamente em 30 dias.
             */
            const initialPeriod = INITIAL_PERIOD;

            setPeriod(initialPeriod);

            /*
             * Usuários autenticados têm
             * histórico privado.
             *
             * Visitantes não fazem chamada
             * ao endpoint protegido.
             */
            const historyRequest = user
                ? getRepositoryHistory(owner, repo, initialPeriod)
                : Promise.resolve({
                      repository: `${owner}/${repo}`,

                      history: [],
                  });

            /*
             * Overview, analytics e
             * histórico são independentes.
             *
             * Executamos concorrentemente.
             */
            const [repositoryData, analyticsData, historyData] = await Promise.all([
                getRepository(owner, repo),

                getRepositoryAnalytics(owner, repo, initialPeriod),

                historyRequest,
            ]);

            setSelectedRepository({
                owner,
                repo,
            });

            setRepository(repositoryData);

            setAnalytics(analyticsData);

            setHistory(historyData.history);
        } catch (searchError) {
            /*
             * Limpamos dados antigos para
             * não mostrar outro repositório
             * junto com a mensagem de erro.
             */
            setRepository(null);

            setAnalytics(null);

            setHistory([]);

            setSelectedRepository(null);

            if (searchError instanceof Error) {
                setError(searchError.message);
            } else {
                setError("Não foi possível analisar o repositório.");
            }
        } finally {
            setLoading(false);

            setAnalyticsLoading(false);

            setHistoryLoading(false);
        }
    }

    /*
     * ============================
     * ALTERAR PERÍODO
     * ============================
     */

    async function handlePeriodChange(newPeriod: AnalyticsPeriod) {
        if (!selectedRepository) {
            return;
        }

        /*
         * Não precisamos refazer
         * a requisição se o usuário
         * clicar no período atual.
         */
        if (newPeriod === period) {
            return;
        }

        const { owner, repo } = selectedRepository;

        try {
            setAnalyticsLoading(true);

            setHistoryLoading(Boolean(user));

            setError(null);

            setSnapshotMessage(null);

            const historyRequest = user
                ? getRepositoryHistory(owner, repo, newPeriod)
                : Promise.resolve({
                      repository: `${owner}/${repo}`,

                      history: [],
                  });

            const [analyticsData, historyData] = await Promise.all([
                getRepositoryAnalytics(owner, repo, newPeriod),

                historyRequest,
            ]);

            setAnalytics(analyticsData);

            setHistory(historyData.history);

            setPeriod(newPeriod);
        } catch (periodError) {
            if (periodError instanceof Error) {
                setError(periodError.message);
            } else {
                setError("Não foi possível atualizar o período da análise.");
            }
        } finally {
            setAnalyticsLoading(false);

            setHistoryLoading(false);
        }
    }

    /*
     * ============================
     * SALVAR SNAPSHOT
     * ============================
     */

    async function handleSaveSnapshot() {
        if (!selectedRepository) {
            return;
        }

        if (!user) {
            setSnapshotMessage("Entre com GitHub para salvar snapshots.");

            return;
        }

        const { owner, repo } = selectedRepository;

        try {
            setSnapshotSaving(true);

            setSnapshotMessage(null);

            setError(null);

            /*
             * POST /analyze realiza uma
             * nova coleta antes de salvar.
             *
             * Portanto não persistimos
             * dados possivelmente antigos
             * existentes no navegador.
             */
            await saveRepositoryAnalysis(owner, repo, period);

            /*
             * Depois de salvar, buscamos
             * novamente o histórico para
             * atualizar Project Evolution.
             */
            const historyData = await getRepositoryHistory(owner, repo, period);

            setHistory(historyData.history);

            setSnapshotMessage("Snapshot armazenado com sucesso.");
        } catch (snapshotError) {
            if (snapshotError instanceof Error) {
                setError(snapshotError.message);
            } else {
                setError("Não foi possível salvar o snapshot.");
            }
        } finally {
            setSnapshotSaving(false);
        }
    }

    /*
     * ============================
     * INTERFACE
     * ============================
     */

    return (
        <div className="app">
            <header className="app-header">
                <div className="brand">
                    <div className="brand-mark">DP</div>

                    <div>
                        <strong>DevPulse</strong>

                        <span>Repository Intelligence</span>
                    </div>
                </div>

                <div className="header-actions">
                    <span className="version">v0.7</span>

                    {authLoading ? (
                        <span className="auth-loading">Verificando sessão...</span>
                    ) : user ? (
                        <div className="auth-user">
                            {user.avatarUrl && (
                                <img src={user.avatarUrl} alt={`Avatar de ${user.login}`} />
                            )}

                            <div>
                                <strong>{user.login}</strong>

                                {user.name && <span>{user.name}</span>}
                            </div>

                            <button type="button" onClick={() => void handleLogout()}>
                                Sair
                            </button>
                        </div>
                    ) : (
                        <button type="button" className="github-login-button" onClick={handleLogin}>
                            Entrar com GitHub
                        </button>
                    )}
                </div>
            </header>

            <main className="app-main">
                <section className="hero">
                    <span className="hero-eyebrow">GitHub Repository Analytics</span>

                    <h1>Entenda a evolução do seu projeto.</h1>

                    <p>
                        Analise atividade, commits, colaboração, tecnologias e saúde de qualquer
                        repositório do GitHub.
                    </p>

                    <SearchRepositoryForm onSearch={handleSearch} loading={loading} />
                </section>

                {error && (
                    <div className="error-message" role="alert">
                        {error}
                    </div>
                )}

                {repository && <RepositoryCard repository={repository} />}

                {analytics && (
                    <AnalyticsDashboard
                        analytics={analytics}
                        period={period}
                        loading={analyticsLoading}
                        historyLoading={historyLoading}
                        snapshotSaving={snapshotSaving}
                        history={history}
                        snapshotMessage={snapshotMessage}
                        authenticated={Boolean(user)}
                        onPeriodChange={handlePeriodChange}
                        onSaveSnapshot={handleSaveSnapshot}
                    />
                )}
            </main>

            <footer className="app-footer">
                <span>DevPulse</span>

                <span>GitHub Repository Intelligence Platform</span>
            </footer>
        </div>
    );
}

export default App;
