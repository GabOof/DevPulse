export interface AuthUser {
    id: string;

    githubId: string;

    login: string;

    name: string | null;

    avatarUrl: string | null;

    profileUrl: string | null;
}

export type AuthResponse =
    | {
          authenticated: true;

          user: AuthUser;
      }
    | {
          authenticated: false;
      };
