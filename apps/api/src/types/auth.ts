export interface GitHubTokenResponse {
    access_token: string;

    token_type: string;

    expires_in?: number;

    refresh_token?: string;

    refresh_token_expires_in?: number;

    scope?: string;

    error?: string;

    error_description?: string;
}

export interface GitHubOAuthUser {
    id: number;

    login: string;

    name: string | null;

    avatar_url: string;

    html_url: string;
}

export interface OAuthTransaction {
    state: string;

    codeVerifier: string;

    expiresAt: number;
}
