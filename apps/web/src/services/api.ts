import type { Repository } from "../types/repository";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

interface ApiError {
    error: string;
    message: string;
}

export async function getRepository(owner: string, repo: string): Promise<Repository> {
    const response = await fetch(
        `${API_URL}/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
    );

    if (!response.ok) {
        const data = (await response.json()) as ApiError;

        throw new Error(data.message || "Não foi possível consultar o repositório.");
    }

    return (await response.json()) as Repository;
}
