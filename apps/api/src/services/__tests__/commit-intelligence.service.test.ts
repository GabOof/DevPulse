import { describe, expect, it } from "vitest";

import { CommitIntelligenceService } from "../commit-intelligence.service.js";

import type { GitHubCommit } from "../../types/analytics.js";

const service = new CommitIntelligenceService();

function createCommit(
    message: string,
    options?: {
        sha?: string;
        author?: string;
        username?: string | null;
        date?: string;
    }
): GitHubCommit {
    const sha = options?.sha ?? "abcdef1234567890";

    const date = options?.date ?? "2026-08-26T12:00:00Z";

    const username = options?.username === undefined ? "GabOof" : options.username;

    return {
        sha,

        html_url: `https://github.com/test/repo/commit/${sha}`,

        commit: {
            message,

            author: {
                name: options?.author ?? "Gab",

                date,
            },

            committer: {
                name: options?.author ?? "Gab",

                date,
            },
        },

        author: username
            ? {
                  login: username,

                  avatar_url: "https://github.com/avatar.png",
              }
            : null,
    };
}

describe("CommitIntelligenceService", () => {
    it("deve classificar feat como feature", () => {
        const result = service.analyze([createCommit("feat: add repository dashboard")]);

        const commit = result.recentCommits[0];

        expect(commit.category).toBe("feature");

        expect(commit.conventional).toBe(true);

        expect(commit.breakingChange).toBe(false);
    });

    it("deve classificar fix como correção", () => {
        const result = service.analyze([createCommit("fix(auth): correct session validation")]);

        const commit = result.recentCommits[0];

        expect(commit.category).toBe("fix");

        expect(commit.conventional).toBe(true);

        expect(commit.breakingChange).toBe(false);
    });

    it("deve identificar breaking change usando exclamação", () => {
        const result = service.analyze([createCommit("feat!: change authentication API")]);

        const commit = result.recentCommits[0];

        expect(commit.category).toBe("feature");

        expect(commit.conventional).toBe(true);

        expect(commit.breakingChange).toBe(true);

        expect(result.breakingChanges).toBe(1);
    });

    it("deve identificar BREAKING CHANGE no corpo da mensagem", () => {
        const result = service.analyze([
            createCommit(
                [
                    "feat(auth): update OAuth flow",
                    "",
                    "BREAKING CHANGE: old tokens are no longer accepted",
                ].join("\n")
            ),
        ]);

        const commit = result.recentCommits[0];

        expect(commit.category).toBe("feature");

        expect(commit.conventional).toBe(true);

        expect(commit.breakingChange).toBe(true);

        expect(result.breakingChanges).toBe(1);
    });

    it("deve identificar correção escrita em português", () => {
        const result = service.analyze([createCommit("corrige erro no cálculo do aluguel")]);

        const commit = result.recentCommits[0];

        expect(commit.category).toBe("fix");

        expect(commit.conventional).toBe(false);
    });

    it("deve identificar feature escrita em português", () => {
        const result = service.analyze([createCommit("adiciona dashboard de analytics")]);

        const commit = result.recentCommits[0];

        expect(commit.category).toBe("feature");

        expect(commit.conventional).toBe(false);
    });

    it("deve classificar refactor corretamente", () => {
        const result = service.analyze([
            createCommit("refactor(api): simplify repository service"),
        ]);

        const commit = result.recentCommits[0];

        expect(commit.category).toBe("refactor");

        expect(commit.conventional).toBe(true);
    });

    it("deve classificar perf como refactor", () => {
        const result = service.analyze([createCommit("perf: improve repository analytics")]);

        expect(result.recentCommits[0].category).toBe("refactor");
    });

    it("deve classificar style como refactor", () => {
        const result = service.analyze([createCommit("style: format source files")]);

        expect(result.recentCommits[0].category).toBe("refactor");
    });

    it("deve classificar documentação", () => {
        const result = service.analyze([createCommit("docs: update README")]);

        expect(result.recentCommits[0].category).toBe("docs");

        expect(result.recentCommits[0].conventional).toBe(true);
    });

    it("deve reconhecer README como documentação mesmo sem Conventional Commit", () => {
        const result = service.analyze([createCommit("update README documentation")]);

        expect(result.recentCommits[0].category).toBe("docs");

        expect(result.recentCommits[0].conventional).toBe(false);
    });

    it("deve classificar commits de teste", () => {
        const result = service.analyze([createCommit("test: add health score tests")]);

        expect(result.recentCommits[0].category).toBe("test");

        expect(result.recentCommits[0].conventional).toBe(true);
    });

    it("deve reconhecer testes por palavra-chave", () => {
        const result = service.analyze([createCommit("adiciona testes de integração")]);

        /*
         * Atenção:
         * com a ordem atual das regras,
         * "adiciona" aparece antes de
         * "testes".
         *
         * Por isso esse commit pode ser
         * classificado como feature.
         *
         * Se você quiser que "testes"
         * tenha prioridade, alteraremos
         * a ordem das regras depois.
         */
        expect(result.recentCommits[0].category).toBe("feature");
    });

    it("deve classificar chore", () => {
        const result = service.analyze([createCommit("chore: update dependencies")]);

        expect(result.recentCommits[0].category).toBe("chore");

        expect(result.recentCommits[0].conventional).toBe(true);
    });

    it("deve classificar ci como chore", () => {
        const result = service.analyze([createCommit("ci: add GitHub Actions workflow")]);

        expect(result.recentCommits[0].category).toBe("chore");
    });

    it("deve classificar build como chore", () => {
        const result = service.analyze([createCommit("build: update project configuration")]);

        expect(result.recentCommits[0].category).toBe("chore");
    });

    it("deve retornar other quando não houver classificação conhecida", () => {
        const result = service.analyze([createCommit("changes")]);

        const commit = result.recentCommits[0];

        expect(commit.category).toBe("other");

        expect(commit.conventional).toBe(false);

        expect(commit.breakingChange).toBe(false);
    });

    it("deve considerar tipo Conventional desconhecido como other", () => {
        const result = service.analyze([createCommit("banana: change something")]);

        const commit = result.recentCommits[0];

        expect(commit.category).toBe("other");

        /*
         * Apesar da categoria ser
         * desconhecida, a sintaxe
         * segue o padrão:
         *
         * tipo: mensagem
         */
        expect(commit.conventional).toBe(true);
    });

    it("deve calcular quantidade e percentual de Conventional Commits", () => {
        const result = service.analyze([
            createCommit("feat: add dashboard"),

            createCommit("fix: correct dashboard"),

            createCommit("corrige erro visual"),

            createCommit("update stuff"),
        ]);

        expect(result.conventionalCommits).toBe(2);

        expect(result.conventionalPercentage).toBe(50);
    });

    it("deve calcular distribuição das categorias", () => {
        const result = service.analyze([
            createCommit("feat: add search"),

            createCommit("feat: add dashboard"),

            createCommit("fix: correct search"),

            createCommit("docs: update README"),
        ]);

        const feature = result.categories.find((category) => category.category === "feature");

        const fix = result.categories.find((category) => category.category === "fix");

        const docs = result.categories.find((category) => category.category === "docs");

        expect(feature?.count).toBe(2);

        expect(feature?.percentage).toBe(50);

        expect(fix?.count).toBe(1);

        expect(fix?.percentage).toBe(25);

        expect(docs?.count).toBe(1);

        expect(docs?.percentage).toBe(25);
    });

    it("deve retornar todas as categorias mesmo quando não possuem commits", () => {
        const result = service.analyze([createCommit("feat: add dashboard")]);

        expect(result.categories).toHaveLength(7);

        expect(result.categories.map((category) => category.category)).toEqual([
            "feature",
            "fix",
            "refactor",
            "docs",
            "test",
            "chore",
            "other",
        ]);
    });

    it("deve retornar no máximo dez commits recentes", () => {
        const commits = Array.from(
            {
                length: 20,
            },
            (_, index) =>
                createCommit(`feat: feature ${index}`, {
                    sha: `abcdef${index.toString().padStart(10, "0")}`,
                })
        );

        const result = service.analyze(commits);

        expect(result.recentCommits).toHaveLength(10);
    });

    it("deve preservar a ordem original dos commits recentes", () => {
        const result = service.analyze([
            createCommit("feat: first", {
                sha: "111111111111111",
            }),

            createCommit("fix: second", {
                sha: "222222222222222",
            }),

            createCommit("docs: third", {
                sha: "333333333333333",
            }),
        ]);

        expect(result.recentCommits[0].message).toBe("feat: first");

        expect(result.recentCommits[1].message).toBe("fix: second");

        expect(result.recentCommits[2].message).toBe("docs: third");
    });

    it("deve gerar short SHA com sete caracteres", () => {
        const result = service.analyze([
            createCommit("feat: dashboard", {
                sha: "123456789abcdef",
            }),
        ]);

        expect(result.recentCommits[0].shortSha).toBe("1234567");
    });

    it("deve utilizar apenas a primeira linha da mensagem no commit analisado", () => {
        const result = service.analyze([
            createCommit(
                ["feat: add OAuth", "", "Additional implementation information."].join("\n")
            ),
        ]);

        expect(result.recentCommits[0].message).toBe("feat: add OAuth");
    });

    it("deve utilizar nome do autor armazenado no commit", () => {
        const result = service.analyze([
            createCommit("feat: dashboard", {
                author: "Gabrielle",
                username: "GabOof",
            }),
        ]);

        expect(result.recentCommits[0].author).toBe("Gabrielle");

        expect(result.recentCommits[0].authorUsername).toBe("GabOof");
    });

    it("deve aceitar commit sem usuário GitHub associado", () => {
        const result = service.analyze([
            createCommit("fix: correct calculation", {
                author: "Developer",
                username: null,
            }),
        ]);

        expect(result.recentCommits[0].author).toBe("Developer");

        expect(result.recentCommits[0].authorUsername).toBeNull();
    });

    it("deve contar múltiplos breaking changes", () => {
        const result = service.analyze([
            createCommit("feat!: change API"),

            createCommit(
                ["fix: change response", "", "BREAKING CHANGE: response format changed"].join("\n")
            ),

            createCommit("docs: update README"),
        ]);

        expect(result.breakingChanges).toBe(2);
    });

    it("deve tratar lista vazia de commits", () => {
        const result = service.analyze([]);

        expect(result.conventionalCommits).toBe(0);

        expect(result.conventionalPercentage).toBe(0);

        expect(result.breakingChanges).toBe(0);

        expect(result.recentCommits).toEqual([]);

        expect(result.categories).toHaveLength(7);

        for (const category of result.categories) {
            expect(category.count).toBe(0);

            expect(category.percentage).toBe(0);
        }
    });
});
