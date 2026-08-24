import type { Repository } from "../types/repository";

import type { AnalyticsPeriod, RepositoryAnalytics } from "../types/analytics";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

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
        `${API_URL}/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
    );

    return handleResponse<Repository>(response);
}

export async function getRepositoryAnalytics(
    owner: string,
    repo: string,
    days: AnalyticsPeriod = 30
): Promise<RepositoryAnalytics> {
    const response = await fetch(
        `${API_URL}/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/analytics?days=${days}`
    );

    return handleResponse<RepositoryAnalytics>(response);
}
