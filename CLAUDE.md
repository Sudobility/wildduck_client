# wildduck_client - AI Development Guide

> **Git policy — never auto-commit or auto-push.** Leave your work in the working tree. Run
> `git commit`, `git push`, or `gh pr create` **only when the user explicitly asks in that turn**.
> Approval for an earlier change does not carry forward; finishing a task is not permission to
> commit it. Stay on the current branch — do not create feature branches for code changes.

## Overview

`@sudobility/wildduck_client` is a TypeScript client library for the WildDuck email API, for both
React and React Native. It provides a low-level HTTP client (`WildduckClient`), TanStack Query
React hooks, an optional WebSocket client for real-time updates, utility functions, and a
`WebSocketStatus` React component. It is transport-agnostic: callers inject a `NetworkClient`.

- **Package**: `@sudobility/wildduck_client` (v2.x — see `package.json`), license **BUSL-1.1**
- **Package manager**: **Bun** (`bun.lock`). npm scripts work too.
- **Module type**: ESM, target ES2020, TypeScript 6
- **Registry**: published to **GitHub Packages** (`npm.pkg.github.com`), NOT public npm. The repo
  `.npmrc` scopes `@sudobility` there, so installing deps needs a `read:packages` token.
- **Compatibility**: React 18+, React Native

## Commands (verified against package.json)

```bash
bun install
bun run build          # tsc -p tsconfig.build.json && node scripts/fix-esm-imports.mjs
bun run build:watch    # tsc --watch (does NOT run the ESM fix step)
bun run clean          # rm -rf dist
bun run typecheck      # tsc --noEmit
bun run lint           # eslint src --ext .ts,.tsx   (flat config; --ext is ignored)
bun run lint:fix
bun run format         # prettier --write src/**/*.ts
bun run test:unit      # vitest run, excludes *.integration.test.ts
bun run test:run       # vitest run (all tests)
bun run test:watch
bun run test:coverage  # v8 coverage
bun run test:integration   # needs a live WildDuck server
bun run check-all      # lint + typecheck + test:unit
```

> **There is no plain `test` script.** `bun run test` / `npm test` fail — use `test:unit` or
> `test:watch`. Unit tests run under Vitest + happy-dom. Integration tests are skipped unless
> `WILDDUCK_ENDPOINT` is set (see `.env.example`).

## Architecture

Single entry (`src/index.ts`) re-exports five barrels: `network`, `hooks`, `websocket`,
`components`, `utils`. Each `src/<area>/index.ts` is the barrel; hook files are flat (one hook per
file, `src/hooks/useWildduck*.ts`) — there are no per-domain subdirectories.

- **`network/`** — `WildduckClient` class (aliased `WildduckAPI`) + `createWildduckClient` factory
  (alias `createWildduckAPI`); `wildduck-api-error.ts`; id helpers (`validateUserId`,
  `isValidObjectId`, `emailToUserId`). All HTTP goes through a private `request<T>()`.
- **`hooks/`** — TanStack Query hooks. `query-keys.ts` (centralized key factory + invalidation
  helpers), `query-config.ts` (`STALE_TIMES`), `mocks.ts` (`WildduckMockData` for `devMode`).
- **`websocket/`** — `WildduckWebSocketClient` (auto-reconnect w/ exponential backoff),
  `WebSocketProvider`/`useWebSocket`, protocol builders/parsers, constants. Channels:
  `mailboxes`, `messages`, `settings`, `filters`, `autoreply`.
- **`utils/`** — thin functional wrappers over `WildduckClient` for settings/forwarding/spam/
  filters/autoreply/advanced settings.

### Hook patterns (two styles)

1. **Monolithic hooks** (recommended for new code): `useWildduckMessages`, `useWildduckMessage`,
   `useWildduckUser`, `useWildduckSearch`, `useWildduckAuth`. Bundle a resource's query +
   mutations, holding results in local state and auto-invalidating related queries on success.
2. **Read-only TanStack Query hooks** in `useWildduckQueries.ts`: `useWildduckHealth`,
   `useWildduckUsersList`, `useWildduckUserMessages`, `useWildduckUserMailboxes`, etc.
3. **Deprecated individual domain hooks** (removed in v3, each `@deprecated` in source):
   `useWildduckMailboxes`, `useWildduckSettings`, `useWildduckFilters`, `useWildduckAddresses`,
   `useWildduckAutoReply`. Prefer monolithic hooks or `WildduckClient` methods.

All hooks take `(networkClient: NetworkClient, config: WildduckConfig, ...)`. `NetworkClient`/
`Optional` come from `@sudobility/types`; `WildduckConfig`/`WildduckUserAuth` and all request/
response types come from `@sudobility/mail_box_types`. `WildduckConfig` uses **`backendUrl`**
(plus optional `cloudflareWorkerUrl`, `apiToken`) — not `endpoint`/`baseUrl`.

### Auth model

Authenticated calls take a `WildduckUserAuth` (`{ userId, username, accessToken }`) and send a
Bearer token per request. Primary flow is blockchain signature (SIWE/SIWS) via
`authenticate`/`preAuth`; password auth is a legacy fallback. `useWildduckAuth(networkClient,
config, storage, devMode?)` requires a `StorageService` (from `@sudobility/di`).

## Conventions & gotchas

- **Peer deps** (not bundled): `react`, `@tanstack/react-query`, `@sudobility/di`,
  `@sudobility/mail_box_types`, `@sudobility/types`. `axios` is a **dev-only** dep (tests), never
  required at runtime.
- **ESM post-build is mandatory**: `scripts/fix-esm-imports.mjs` rewrites relative specifiers in
  emitted `.js`/`.d.ts` to fully-qualified paths (`./core` → `./core/index.js`) so Node's native
  ESM loader can resolve them. `tsc` alone (incl. `build:watch`) produces output Node can't load.
- **ID validation**: user/mailbox IDs are validated as 24-char hex Mongo ObjectIds before calls.
  Message IDs may be numeric or ObjectId depending on server config.
- **`devMode`** on most hooks falls back to `WildduckMockData` instead of hitting the network.
- **Name overlap**: both the monolithic `useWildduckUser` and the query-only
  `useWildduckUser`/`useWildduckMessage` exist; `hooks/index.ts` re-exports deliberately — mind
  which one you import.
- **Strict TS**: `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
  `noUnusedLocals`/`noUnusedParameters`, `moduleResolution: bundler`, `jsx: react`.
- **CI/CD**: `.github/workflows/ci-cd.yml` delegates to the reusable `johnqh/workflows` workflow;
  publishing to GitHub Packages happens on push to `main`. `prepublishOnly` runs clean + build.

## Common tasks

- **New hook**: add `src/hooks/useWildduck<Feature>.ts`, take `(networkClient, config, ...)`,
  `useMemo` a `WildduckClient`, `useQuery`/`useMutation`, invalidate via `queryClient` on success,
  support `devMode`, export from `src/hooks/index.ts` (auto re-exported by `src/index.ts`).
- **New client method**: add to `WildduckClient` in `network/wildduck-client.ts` using the private
  `request<T>()`; take `wildduckUserAuth` first for authenticated endpoints; validate ids; type
  with `@sudobility/mail_box_types`.
- **New util**: add to a `src/utils/*.ts` file, take `(networkClient, config, wildduckUserAuth,
  ...)`, export from `src/utils/index.ts`.
- **WebSocket on a hook**: try/catch `useWebSocket()` (provider may be absent), get a client via
  the context, subscribe to the channel in a `useEffect`, apply `data`/`update` events to both
  local state and the TanStack Query cache, and unsubscribe/disconnect on cleanup.
