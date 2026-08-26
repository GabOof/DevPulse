import type { Repository } from "../types/repository";

import type {
    AnalyticsPeriod,
    RepositoryAnalytics,
    RepositoryHistory,
    SavedAnalysisResponse,
} from "../types/analytics";

import { API_URL } from "../config/api";

interface ApiError {
    error: string;
    message: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        let message = "Não foi possível concluir a solicitação.";

        try {
            const data = (await response.json()) as ApiError;

            message = data.message || message;
        } catch {
            // Mantemos mensagem padrão.
        }

        throw new Error(message);
    }

    return (await response.json()) as T;
}

export async function getRepository(owner: string, repo: string): Promise<Repository> {
    const response = await fetch(
        `${API_URL}/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
        { credentials: "include" }
    );

    return handleResponse<Repository>(response);
}

export async function getRepositoryAnalytics(
    owner: string,
    repo: string,
    days: AnalyticsPeriod = 30
): Promise<RepositoryAnalytics> {
    const response = await fetch(
        `${API_URL}/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/analytics?days=${days}`,
        { credentials: "include" }
    );

    return handleResponse<RepositoryAnalytics>(response);
}

export async function saveRepositoryAnalysis(
    owner: string,
    repo: string,
    days: AnalyticsPeriod
): Promise<SavedAnalysisResponse> {
    const response = await fetch(
        `${API_URL}/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/analyze?days=${days}`,
        {
            method: "POST",
            credentials: "include",
        }
    );

    return handleResponse<SavedAnalysisResponse>(response);
}

export async function getRepositoryHistory(
    owner: string,
    repo: string,
    days: AnalyticsPeriod
): Promise<RepositoryHistory> {
    const response = await fetch(
        `${API_URL}/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/history?days=${days}`,
        { credentials: "include" }
    );

    return handleResponse<RepositoryHistory>(response);
}
