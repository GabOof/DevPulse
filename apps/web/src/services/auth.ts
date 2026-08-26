import { API_URL } from "../config/api";

import type { AuthResponse } from "../types/auth";

export function getGitHubLoginUrl() {
    return `${API_URL}/api/auth/github`;
}

export async function getCurrentUser(): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
    });

    if (response.status === 401) {
        return {
            authenticated: false,
        };
    }

    if (!response.ok) {
        throw new Error("Não foi possível verificar a sessão.");
    }

    return (await response.json()) as AuthResponse;
}

export async function logout() {
    const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",

        credentials: "include",
    });

    if (!response.ok) {
        throw new Error("Não foi possível realizar logout.");
    }
}
