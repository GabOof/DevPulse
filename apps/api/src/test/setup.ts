import { beforeEach } from "vitest";

import { cacheService } from "../services/cache.service.js";

import { githubRateLimitService } from "../services/github-rate-limit.service.js";

/*
 * =========================================================
 * GLOBAL TEST SETUP
 * =========================================================
 *
 * Cada teste começa com cache vazio.
 *
 * Isso impede que:
 *
 * teste A
 *   ↓
 * popula cache
 *   ↓
 * teste B recebe HIT inesperadamente
 */

beforeEach(() => {
    cacheService.clear();

    githubRateLimitService.clear();
});
