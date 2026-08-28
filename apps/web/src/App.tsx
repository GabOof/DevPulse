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

type NoticeType = "success" | "info" | "warning";

interface UiNotice {
    type: NoticeType;

    message: string;
}

/*
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const INITIAL_PERIOD: AnalyticsPeriod = 30;

/*
 * =========================================================
 * REPOSITORY INPUT PARSER
 * =========================================================
 *
 * Formatos aceitos:
 *
 * GabOof/DevPulse
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
     * GITHUB URL
     * =====================================================
     */

    if (value.startsWith("https://github.com/") || value.startsWith("http://github.com/")) {
        try {
            const url = new URL(value);

            const parts = url.pathname.split("/").filter(Boolean);

            if (parts.length < 2) {
                return null;
            }

            const owner = parts[0];

            const repo = parts[1]?.replace(/\.git$/, "");

            if (!owner || !repo) {
                return null;
            }

            return {
                owner,
                repo,
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

    const owner = parts[0];

    const repo = parts[1]?.replace(/\.git$/, "");

    if (!owner || !repo) {
        return null;
    }

    return {
        owner,
        repo,
    };
}

/*
 * =========================================================
 * AUTH CALLBACK MESSAGE
 * =========================================================
 */

function getAuthNotice(
    status: string | null,

    authenticated: boolean
): UiNotice | null {
    switch (status) {
        case "success":
            return authenticated
                ? {
                      type: "success",

                      message: "Login com GitHub realizado com sucesso.",
                  }
                : {
                      type: "warning",

                      message:
                          "O GitHub autorizou o acesso, mas não foi possível confirmar sua sessão.",
                  };

        case "denied":
            return {
                type: "info",

                message: "Login com GitHub cancelado.",
            };

        case "expired":
            return {
                type: "warning",

                message: "A tentativa de login expirou. Tente entrar novamente.",
            };

        case "invalid":
        case "invalid_state":
            return {
                type: "warning",

                message: "Não foi possível validar a autenticação do GitHub. Tente novamente.",
            };

        case "error":
            return {
                type: "warning",

                message: "Não foi possível concluir o login com GitHub.",
            };

        default:
            return null;
    }
}

/*
 * =========================================================
 * INITIAL EMPTY STATE
 * =========================================================
 */

function InitialEmptyState() {
    return (
        <section className="empty-state" aria-label="Começar análise">
            <div className="empty-state-icon" aria-hidden="true">
                DP
            </div>

            <div className="empty-state-content">
                <span className="empty-state-eyebrow">Comece uma análise</span>

                <h2>Pesquise um repositório do GitHub</h2>

                <p>
                    Informe um repositório no formato <strong>owner/repository</strong> ou cole a
                    URL completa do GitHub.
                </p>

                <div className="empty-state-example">
                    <span>Exemplo</span>

                    <code>GabOof/DevPulse</code>
                </div>
            </div>
        </section>
    );
}

/*
 * =========================================================
 * INITIAL LOADING STATE
 * =========================================================
 */

function RepositoryLoadingState() {
    return (
        <section className="repository-loading-state" aria-live="polite" aria-busy="true">
            <div className="loading-state-header">
                <span className="loading-spinner" />

                <div>
                    <strong>Analisando repositório</strong>

                    <span>Buscando dados no GitHub e calculando métricas...</span>
                </div>
            </div>

            <div className="loading-skeleton-grid" aria-hidden="true">
                <div className="loading-skeleton-card" />

                <div className="loading-skeleton-card" />

                <div className="loading-skeleton-card" />
            </div>
        </section>
    );
}

/*
 * =========================================================
 * APP
 * =========================================================
 */

function App() {
    /*
     * =====================================================
     * AUTHENTICATION
     * =====================================================
     */

    const [user, setUser] = useState<AuthUser | null>(null);

    const [authLoading, setAuthLoading] = useState(true);

    const [logoutLoading, setLogoutLoading] = useState(false);

    /*
     * =====================================================
     * REPOSITORY
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
     */

    const [repositoryMeta, setRepositoryMeta] = useState<ApiResponseMeta | null>(null);

    const [analyticsMeta, setAnalyticsMeta] = useState<ApiResponseMeta | null>(null);

    /*
     * =====================================================
     * REFRESH
     * =====================================================
     */

    const [refreshing, setRefreshing] = useState(false);

    /*
     * =====================================================
     * HISTORY
     * =====================================================
     */

    const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);

    const [historyLoading, setHistoryLoading] = useState(false);

    const [snapshotSaving, setSnapshotSaving] = useState(false);

    const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null);

    /*
     * =====================================================
     * GENERAL UI STATE
     * =====================================================
     */

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const [notice, setNotice] = useState<UiNotice | null>(null);

    /*
     * =====================================================
     * DERIVED UI STATE
     * =====================================================
     */

    const hasRepository = repository !== null;

    const hasAnalytics = analytics !== null;

    const hasCurrentAnalysis = hasRepository && hasAnalytics;

    const showInitialLoading = loading && !hasCurrentAnalysis;

    const showEmptyState = !loading && !hasRepository;

    /*
     * =====================================================
     * RESTORE SESSION
     * =====================================================
     */

    useEffect(() => {
        async function loadSession() {
            const url = new URL(window.location.href);

            const authStatus = url.searchParams.get("auth");

            let authenticated = false;

            try {
                const auth = await getCurrentUser();

                authenticated = auth.authenticated;

                if (auth.authenticated) {
                    setUser(auth.user);
                } else {
                    setUser(null);
                }
            } catch {
                /*
                 * Uma falha na sessão não
                 * impede análises públicas.
                 */

                setUser(null);
            } finally {
                setAuthLoading(false);

                const authNotice = getAuthNotice(authStatus, authenticated);

                if (authNotice) {
                    setNotice(authNotice);
                }

                /*
                 * Remove o parâmetro OAuth
                 * da URL depois de processá-lo.
                 */

                if (authStatus) {
                    url.searchParams.delete("auth");

                    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
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
        setError(null);

        setNotice(null);

        window.location.assign(getGitHubLoginUrl());
    }

    /*
     * =====================================================
     * LOGOUT
     * =====================================================
     */

    async function handleLogout() {
        if (logoutLoading) {
            return;
        }

        try {
            setLogoutLoading(true);

            setError(null);

            setNotice(null);

            await logout();

            setUser(null);

            /*
             * Os resultados podem ter sido
             * obtidos usando acesso autenticado,
             * inclusive de repositórios privados.
             *
             * Portanto limpamos toda a análise
             * ao encerrar a sessão.
             */

            setRepository(null);

            setSelectedRepository(null);

            setAnalytics(null);

            setHistory([]);

            setRepositoryMeta(null);

            setAnalyticsMeta(null);

            setPeriod(INITIAL_PERIOD);

            setSnapshotMessage(null);

            setNotice({
                type: "success",

                message: "Sessão encerrada com sucesso.",
            });
        } catch (logoutError) {
            if (logoutError instanceof Error) {
                setError(logoutError.message);
            } else {
                setError("Não foi possível realizar logout.");
            }
        } finally {
            setLogoutLoading(false);
        }
    }

    /*
     * =====================================================
     * SEARCH REPOSITORY
     * =====================================================
     */

    async function handleSearch(repositoryInput: string) {
        const parsedRepository = parseRepositoryInput(repositoryInput);

        if (!parsedRepository) {
            setError("Informe um repositório no formato owner/repository ou uma URL do GitHub.");

            return;
        }

        const { owner, repo } = parsedRepository;

        /*
         * Se já existe uma análise na tela,
         * mantemos os dados anteriores enquanto
         * uma nova pesquisa é executada.
         *
         * Assim, uma falha na nova busca não
         * apaga uma análise válida.
         */

        const hadCurrentAnalysis = hasCurrentAnalysis;

        try {
            setLoading(true);

            if (!hadCurrentAnalysis) {
                setAnalyticsLoading(true);

                setHistoryLoading(Boolean(user));
            }

            setError(null);

            setNotice(null);

            setSnapshotMessage(null);

            const initialPeriod = INITIAL_PERIOD;

            /*
             * Histórico é privado.
             */

            const historyRequest = user
                ? getRepositoryHistory(owner, repo, initialPeriod)
                : Promise.resolve({
                      repository: `${owner}/${repo}`,

                      history: [],
                  });

            /*
             * Overview, analytics e histórico
             * são independentes.
             */

            const [repositoryResponse, analyticsResponse, historyData] = await Promise.all([
                getRepository(owner, repo),

                getRepositoryAnalytics(owner, repo, initialPeriod),

                historyRequest,
            ]);

            /*
             * Somente depois de todas as
             * requisições concluírem com
             * sucesso trocamos a análise
             * apresentada na interface.
             */

            setSelectedRepository({
                owner,
                repo,
            });

            setRepository(repositoryResponse.data);

            setRepositoryMeta(repositoryResponse.meta);

            setAnalytics(analyticsResponse.data);

            setAnalyticsMeta(analyticsResponse.meta);

            setHistory(historyData.history);

            setPeriod(initialPeriod);

            setNotice({
                type: "success",

                message: `Análise de ${owner}/${repo} concluída.`,
            });
        } catch (searchError) {
            /*
             * Não limpamos a análise anterior.
             *
             * Caso o usuário tenha pesquisado
             * um repositório inválido ou a API
             * falhe, o conteúdo válido continua
             * disponível.
             */

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
     * CHANGE PERIOD
     * =====================================================
     */

    async function handlePeriodChange(newPeriod: AnalyticsPeriod) {
        if (!selectedRepository) {
            return;
        }

        if (newPeriod === period) {
            return;
        }

        const { owner, repo } = selectedRepository;

        try {
            setAnalyticsLoading(true);

            setHistoryLoading(Boolean(user));

            setError(null);

            setNotice(null);

            setSnapshotMessage(null);

            const historyRequest = user
                ? getRepositoryHistory(owner, repo, newPeriod)
                : Promise.resolve({
                      repository: `${owner}/${repo}`,

                      history: [],
                  });

            const [analyticsResponse, historyData] = await Promise.all([
                getRepositoryAnalytics(owner, repo, newPeriod),

                historyRequest,
            ]);

            /*
             * O período só muda depois
             * que os novos dados chegam.
             */

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
     * FORCE REFRESH
     * =====================================================
     *
     * Ignora o TTL do cache DevPulse:
     *
     * ?refresh=true
     *
     * ETag / If-None-Match continuam sendo
     * utilizados pelo backend.
     */

    async function handleRefresh() {
        if (!selectedRepository) {
            return;
        }

        if (refreshing) {
            return;
        }

        const { owner, repo } = selectedRepository;

        try {
            setRefreshing(true);

            setAnalyticsLoading(true);

            setError(null);

            setNotice(null);

            setSnapshotMessage(null);

            const [repositoryResponse, analyticsResponse] = await Promise.all([
                getRepository(owner, repo, {
                    refresh: true,
                }),

                getRepositoryAnalytics(owner, repo, period, {
                    refresh: true,
                }),
            ]);

            setRepository(repositoryResponse.data);

            setAnalytics(analyticsResponse.data);

            setRepositoryMeta(repositoryResponse.meta);

            setAnalyticsMeta(analyticsResponse.meta);

            setNotice({
                type: "success",

                message: `Dados de ${owner}/${repo} atualizados.`,
            });
        } catch (refreshError) {
            /*
             * Os dados anteriores permanecem
             * visíveis em caso de falha.
             */

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
     * SAVE SNAPSHOT
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

            setNotice(null);

            /*
             * POST /analyze realiza uma
             * nova coleta antes de salvar.
             */

            await saveRepositoryAnalysis(owner, repo, period);

            /*
             * Recarrega a evolução logo
             * após salvar.
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
                    <span className="version">v1.0</span>

                    {authLoading ? (
                        <span className="auth-loading" aria-live="polite">
                            Verificando sessão...
                        </span>
                    ) : user ? (
                        <div className="auth-user">
                            {user.avatarUrl && (
                                <img src={user.avatarUrl} alt={`Avatar de ${user.login}`} />
                            )}

                            <div>
                                <strong>{user.login}</strong>

                                {user.name && <span>{user.name}</span>}
                            </div>

                            <button
                                type="button"
                                disabled={logoutLoading}
                                onClick={() => void handleLogout()}
                            >
                                {logoutLoading ? "Saindo..." : "Sair"}
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
                    HERO
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
                    UI FEEDBACK
                ====================================== */}

                <div className="app-feedback-region" aria-live="polite" aria-atomic="true">
                    {notice && (
                        <div className={`app-notice app-notice-${notice.type}`} role="status">
                            <span>{notice.message}</span>

                            <button
                                type="button"
                                className="feedback-dismiss-button"
                                aria-label="Fechar mensagem"
                                onClick={() => setNotice(null)}
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="error-message app-error-message" role="alert">
                            <div>
                                <strong>Não foi possível concluir a operação.</strong>

                                <span>{error}</span>
                            </div>

                            <button
                                type="button"
                                className="feedback-dismiss-button"
                                aria-label="Fechar erro"
                                onClick={() => setError(null)}
                            >
                                ×
                            </button>
                        </div>
                    )}
                </div>

                {/* ======================================
                    NEW SEARCH INDICATOR
                ====================================== */}

                {loading && hasCurrentAnalysis && (
                    <div className="background-loading-status" role="status">
                        <span className="loading-spinner" />

                        <span>
                            Buscando novo repositório... A análise atual continuará disponível até a
                            nova busca terminar.
                        </span>
                    </div>
                )}

                {/* ======================================
                    INITIAL LOADING
                ====================================== */}

                {showInitialLoading && <RepositoryLoadingState />}

                {/* ======================================
                    EMPTY STATE
                ====================================== */}

                {showEmptyState && <InitialEmptyState />}

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
