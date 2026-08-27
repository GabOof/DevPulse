import { useEffect, useState } from "react";

import "./App.css";

import { AnalyticsDashboard } from "./components/AnalyticsDashboard";

import { ApiStatusPanel } from "./components/ApiStatusPanel";

import { RepositoryCard } from "./components/RepositoryCard";

import { SearchRepositoryForm } from "./components/SearchRepositoryForm";

import {
    getRepository,
    getRepositoryAnalytics,
    getRepositoryHistory,
    saveRepositoryAnalysis,
    type ApiResponseMeta,
} from "./services/api";

import { getCurrentUser, getGitHubLoginUrl, logout } from "./services/auth";

import type { AnalysisHistoryItem, AnalyticsPeriod, RepositoryAnalytics } from "./types/analytics";

import type { Repository } from "./types/repository";

import type { AuthUser } from "./types/auth";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

interface SelectedRepository {
    owner: string;

    repo: string;
}

const INITIAL_PERIOD: AnalyticsPeriod = 30;

/*
 * =========================================================
 * REPOSITORY INPUT PARSER
 * =========================================================
 *
 * Permite pesquisar usando:
 *
 * GabOof/DevPulse
 *
 * ou:
 *
 * https://github.com/GabOof/DevPulse
 */

function parseRepositoryInput(input: string): SelectedRepository | null {
    const value = input.trim();

    if (!value) {
        return null;
    }

    /*
     * =====================================================
     * URL COMPLETA DO GITHUB
     * =====================================================
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
     * =====================================================
     * OWNER/REPOSITORY
     * =====================================================
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

/*
 * =========================================================
 * APP
 * =========================================================
 */

function App() {
    /*
     * =====================================================
     * AUTENTICAÇÃO
     * =====================================================
     */

    const [user, setUser] = useState<AuthUser | null>(null);

    const [authLoading, setAuthLoading] = useState(true);

    /*
     * =====================================================
     * REPOSITÓRIO
     * =====================================================
     */

    const [repository, setRepository] = useState<Repository | null>(null);

    const [selectedRepository, setSelectedRepository] = useState<SelectedRepository | null>(null);

    /*
     * =====================================================
     * ANALYTICS
     * =====================================================
     */

    const [analytics, setAnalytics] = useState<RepositoryAnalytics | null>(null);

    const [period, setPeriod] = useState<AnalyticsPeriod>(INITIAL_PERIOD);

    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    /*
     * =====================================================
     * API / CACHE METADATA
     * =====================================================
     *
     * repositoryMeta:
     *
     * - HIT
     * - MISS
     * - COALESCED
     * - GitHub Rate Limit
     *
     * analyticsMeta:
     *
     * - HIT
     * - MISS
     * - COALESCED
     * - GitHub Rate Limit
     */

    const [repositoryMeta, setRepositoryMeta] = useState<ApiResponseMeta | null>(null);

    const [analyticsMeta, setAnalyticsMeta] = useState<ApiResponseMeta | null>(null);

    /*
     * Indica que o usuário clicou
     * explicitamente em:
     *
     * Atualizar agora
     */

    const [refreshing, setRefreshing] = useState(false);

    /*
     * =====================================================
     * HISTÓRICO
     * =====================================================
     */

    const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);

    const [historyLoading, setHistoryLoading] = useState(false);

    const [snapshotSaving, setSnapshotSaving] = useState(false);

    const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null);

    /*
     * =====================================================
     * ESTADO GERAL
     * =====================================================
     */

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);

    /*
     * =====================================================
     * RECUPERAR SESSÃO
     * =====================================================
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
                 * Falha ao verificar
                 * a sessão não deve
                 * impedir o uso público
                 * do DevPulse.
                 */

                setUser(null);
            } finally {
                setAuthLoading(false);

                /*
                 * O callback OAuth
                 * retorna:
                 *
                 * /?auth=success
                 *
                 * Depois de verificarmos
                 * a sessão, removemos o
                 * parâmetro.
                 */

                const url = new URL(window.location.href);

                if (url.searchParams.has("auth")) {
                    url.searchParams.delete("auth");

                    window.history.replaceState(
                        {},

                        "",

                        `${url.pathname}${url.search}${url.hash}`
                    );
                }
            }
        }

        void loadSession();
    }, []);

    /*
     * =====================================================
     * LOGIN
     * =====================================================
     */

    function handleLogin() {
        window.location.assign(getGitHubLoginUrl());
    }

    /*
     * =====================================================
     * LOGOUT
     * =====================================================
     */

    async function handleLogout() {
        try {
            setError(null);

            await logout();

            setUser(null);

            /*
             * Histórico pertence ao
             * usuário autenticado.
             */

            setHistory([]);

            setSnapshotMessage(null);

            /*
             * Limpamos metadados porque
             * caches públicos e autenticados
             * possuem scopes diferentes.
             */

            setRepositoryMeta(null);

            setAnalyticsMeta(null);
        } catch (logoutError) {
            if (logoutError instanceof Error) {
                setError(logoutError.message);
            } else {
                setError("Não foi possível realizar logout.");
            }
        }
    }

    /*
     * =====================================================
     * BUSCAR REPOSITÓRIO
     * =====================================================
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

            /*
             * Limpamos dados da pesquisa
             * anterior.
             */

            setHistory([]);

            setRepositoryMeta(null);

            setAnalyticsMeta(null);

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
             * Repository Overview,
             * Analytics e History são
             * independentes.
             *
             * Executamos em paralelo.
             */

            const [repositoryResponse, analyticsResponse, historyData] = await Promise.all([
                getRepository(owner, repo),

                getRepositoryAnalytics(owner, repo, initialPeriod),

                historyRequest,
            ]);

            /*
             * Salva o repositório atual
             * para trocas de período,
             * snapshots e refresh.
             */

            setSelectedRepository({
                owner,
                repo,
            });

            /*
             * =================================================
             * REPOSITORY
             * =================================================
             */

            setRepository(repositoryResponse.data);

            setRepositoryMeta(repositoryResponse.meta);

            /*
             * =================================================
             * ANALYTICS
             * =================================================
             */

            setAnalytics(analyticsResponse.data);

            setAnalyticsMeta(analyticsResponse.meta);

            /*
             * =================================================
             * HISTORY
             * =================================================
             */

            setHistory(historyData.history);
        } catch (searchError) {
            /*
             * Limpamos dados antigos
             * para não mostrar outro
             * repositório junto com a
             * mensagem de erro.
             */

            setRepository(null);

            setAnalytics(null);

            setHistory([]);

            setSelectedRepository(null);

            setRepositoryMeta(null);

            setAnalyticsMeta(null);

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
     * =====================================================
     * ALTERAR PERÍODO
     * =====================================================
     */

    async function handlePeriodChange(newPeriod: AnalyticsPeriod) {
        if (!selectedRepository) {
            return;
        }

        /*
         * Não precisamos refazer a
         * requisição se o usuário clicar
         * no período atual.
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

            /*
             * Histórico é privado.
             */

            const historyRequest = user
                ? getRepositoryHistory(owner, repo, newPeriod)
                : Promise.resolve({
                      repository: `${owner}/${repo}`,

                      history: [],
                  });

            /*
             * Analytics e histórico podem
             * ser atualizados em paralelo.
             */

            const [analyticsResponse, historyData] = await Promise.all([
                getRepositoryAnalytics(owner, repo, newPeriod),

                historyRequest,
            ]);

            setAnalytics(analyticsResponse.data);

            setAnalyticsMeta(analyticsResponse.meta);

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
     * =====================================================
     * ATUALIZAÇÃO FORÇADA
     * =====================================================
     *
     * Ignora o TTL do DevPulse:
     *
     * ?refresh=true
     *
     * Porém o GitHubService continua
     * utilizando:
     *
     * ETag
     * If-None-Match
     *
     * Portanto o GitHub ainda pode
     * responder 304 Not Modified.
     */

    async function handleRefresh() {
        if (!selectedRepository) {
            return;
        }

        const { owner, repo } = selectedRepository;

        try {
            setRefreshing(true);

            setAnalyticsLoading(true);

            setError(null);

            setSnapshotMessage(null);

            /*
             * Repository e Analytics podem
             * ser revalidados em paralelo.
             */

            const [repositoryResponse, analyticsResponse] = await Promise.all([
                getRepository(owner, repo, {
                    refresh: true,
                }),

                getRepositoryAnalytics(owner, repo, period, {
                    refresh: true,
                }),
            ]);

            /*
             * Atualiza os dados apresentados.
             */

            setRepository(repositoryResponse.data);

            setAnalytics(analyticsResponse.data);

            /*
             * Atualiza status do cache
             * e rate limit.
             */

            setRepositoryMeta(repositoryResponse.meta);

            setAnalyticsMeta(analyticsResponse.meta);
        } catch (refreshError) {
            if (refreshError instanceof Error) {
                setError(refreshError.message);
            } else {
                setError("Não foi possível atualizar os dados.");
            }
        } finally {
            setRefreshing(false);

            setAnalyticsLoading(false);
        }
    }

    /*
     * =====================================================
     * SALVAR SNAPSHOT
     * =====================================================
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
     * =====================================================
     * INTERFACE
     * =====================================================
     */

    return (
        <div className="app">
            {/* ==========================================
                HEADER
            ========================================== */}

            <header className="app-header">
                <div className="brand">
                    <div className="brand-mark">DP</div>

                    <div>
                        <strong>DevPulse</strong>

                        <span>Repository Intelligence</span>
                    </div>
                </div>

                <div className="header-actions">
                    <span className="version">v0.9</span>

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

            {/* ==========================================
                MAIN
            ========================================== */}

            <main className="app-main">
                {/* ======================================
                    HERO / SEARCH
                ====================================== */}

                <section className="hero">
                    <span className="hero-eyebrow">GitHub Repository Analytics</span>

                    <h1>Entenda a evolução do seu projeto.</h1>

                    <p>
                        Analise atividade, commits, colaboração, tecnologias e saúde de qualquer
                        repositório do GitHub.
                    </p>

                    <SearchRepositoryForm onSearch={handleSearch} loading={loading} />
                </section>

                {/* ======================================
                    ERROR
                ====================================== */}

                {error && (
                    <div className="error-message" role="alert">
                        {error}
                    </div>
                )}

                {/* ======================================
                    REPOSITORY OVERVIEW
                ====================================== */}

                {repository && <RepositoryCard repository={repository} />}

                {/* ======================================
                    CACHE / GITHUB API STATUS
                ====================================== */}

                {repository && analytics && (
                    <ApiStatusPanel
                        repositoryMeta={repositoryMeta}
                        analyticsMeta={analyticsMeta}
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                    />
                )}

                {/* ======================================
                    ANALYTICS
                ====================================== */}

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

            {/* ==========================================
                FOOTER
            ========================================== */}

            <footer className="app-footer">
                <span>DevPulse</span>

                <span>GitHub Repository Intelligence Platform</span>
            </footer>
        </div>
    );
}

export default App;
