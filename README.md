# WildDuck Client Library

TypeScript client library for the WildDuck email API with React and React Native support.

[![CI/CD](https://github.com/johnqh/wildduck_client/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/johnqh/wildduck_client/actions/workflows/ci-cd.yml)

> Published to [GitHub Packages](https://github.com/Sudobility/wildduck_client/packages) under the `@sudobility` scope (not the public npm registry).

## Features

- ✅ **Complete Type Safety** - Full TypeScript support with comprehensive type definitions
- ✅ **React Integration** - Built-in hooks using @tanstack/react-query for optimal data fetching
- ✅ **Real-time WebSocket Support** - Optional WebSocket connections for instant updates (v2.3.0+)
- ✅ **Crypto Authentication** - SIWE (Sign-in with Ethereum) and traditional password authentication
- ✅ **Comprehensive API** - User, mailbox, message, address, filter, and autoreply management
- ✅ **React Native Compatible** - Works seamlessly in both React JS and React Native (0.64+)
- ✅ **Development Mode** - Mock data for testing without a live server
- ✅ **Integration Tests** - Full test coverage with real WildDuck server testing
- ✅ **Cloudflare Worker Support** - Optional worker URL configuration for proxying requests

## Installation

This package is published under the `@sudobility` scope on **GitHub Packages**, not the public
npm registry. Consumers must point the `@sudobility` scope at GitHub Packages (e.g. in a project
`.npmrc`) and authenticate with a token that has `read:packages`:

```
@sudobility:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```bash
npm install @sudobility/wildduck_client
```

### Peer Dependencies

This library declares the following peer dependencies (you must install them yourself):

```bash
npm install react @tanstack/react-query \
  @sudobility/di @sudobility/mail_box_types @sudobility/types
```

> `axios` is a dev-only dependency used in tests; it is **not** bundled or required at runtime.
> The HTTP transport is injected by the consumer via the `NetworkClient` interface from
> `@sudobility/types`.

> All hooks and the `WildduckClient` are **transport-agnostic**: they take a `NetworkClient`
> (from `@sudobility/types`, provided by your app's DI layer) and a `WildduckConfig`
> (`{ backendUrl, ... }`, from `@sudobility/mail_box_types`). `networkClient` below is whatever
> your app supplies — it is not exported by this library. Authenticated calls take a
> `WildduckUserAuth` object (`{ userId, username, accessToken }`).

### 1. Authentication

`useWildduckAuth(networkClient, config, storage, devMode?)` returns `authenticate`, `preAuth`,
`logout`, `getAuthStatus`, and status flags.

```tsx
import { useWildduckAuth } from '@sudobility/wildduck_client';

function LoginComponent({ networkClient, config, storage }) {
  const { authenticate, isAuthenticating } = useWildduckAuth(
    networkClient,
    config,
    storage
  );

  // Blockchain signature auth (SIWE/SIWS) is the primary flow
  const handleCryptoLogin = () =>
    authenticate({
      username: 'user@example.com',
      signature: '0x...',
      message: 'Sign-in with Ethereum message',
      nonce: 'random-nonce',
      signer: '0xWalletAddress',
    });

  return <button onClick={handleCryptoLogin} disabled={isAuthenticating}>Login</button>;
}
```

### 2. Fetching Messages

`useWildduckMessages(networkClient, config, devMode?, pageSize?, options?)` manages a message
list with pagination and mutations. The hook holds `messages` in state; call `getMessages` to load.

```tsx
import { useEffect } from 'react';
import { useWildduckMessages } from '@sudobility/wildduck_client';

function MessageList({ networkClient, config, userAuth, mailboxId }) {
  const { messages, getMessages, isLoading } = useWildduckMessages(networkClient, config);

  useEffect(() => {
    getMessages(userAuth, mailboxId, { limit: 50, unseen: true, order: 'desc' });
  }, [mailboxId]);

  if (isLoading) return <p>Loading…</p>;
  return (
    <ul>
      {messages.map((msg) => (
        <li key={msg.id}>{msg.subject}</li>
      ))}
    </ul>
  );
}
```

### 3. Sending Messages

`sendMessage` is returned by the same `useWildduckMessages` hook.

```tsx
import { useWildduckMessages } from '@sudobility/wildduck_client';

function ComposeEmail({ networkClient, config, userAuth }) {
  const { sendMessage, isSending } = useWildduckMessages(networkClient, config);

  const handleSend = () =>
    sendMessage(userAuth, {
      to: [{ name: 'John Doe', address: 'john@example.com' }],
      subject: 'Hello from WildDuck Client',
      text: 'This is a test message',
      html: '<p>This is a <strong>test</strong> message</p>',
    });

  return <button onClick={handleSend} disabled={isSending}>Send Email</button>;
}
```

### Low-level client

When you don't need React, use the client directly:

```typescript
import { createWildduckClient } from '@sudobility/wildduck_client';

const client = createWildduckClient(networkClient, config);
const mailboxes = await client.getMailboxes(userAuth);
```

## API Coverage

Currently implements ~15% of the WildDuck API endpoints (see [docs/GAP_ANALYSIS.md](./docs/GAP_ANALYSIS.md) for details):

### Implemented Endpoints

| Category       | Status             | Coverage |
| -------------- | ------------------ | -------- |
| Authentication | ✅ Complete        | 100%     |
| Users          | ⚠️ Partial         | ~12%     |
| Mailboxes      | ✅ Mostly Complete | 80%      |
| Messages       | ⚠️ Partial         | ~31%     |
| Addresses      | ✅ Mostly Complete | 64%      |
| Filters        | ✅ Complete        | 100%     |
| Autoreply      | ⚠️ Partial         | ~67%     |
| Health         | ✅ Complete        | 100%     |
| Settings       | ✅ Mostly Complete | 67%      |

### Priority Features to Implement

See [docs/GAP_ANALYSIS.md](./docs/GAP_ANALYSIS.md) for a comprehensive breakdown of missing endpoints and implementation priorities.

## Available Hooks

Hooks come in two styles. **Monolithic hooks** bundle a resource's query + mutations with
auto-invalidation and are the recommended pattern for new code. **TanStack Query hooks** are thin
`useQuery` wrappers for read-only data. A set of **individual domain hooks** remains for backward
compatibility but is `@deprecated` and slated for removal in v3 — prefer the monolithic hooks or
`WildduckClient` methods instead.

### Monolithic hooks (recommended)

- `useWildduckMessages` - Message list with pagination; `getMessages`, `sendMessage`, `uploadMessage`, `updateMessage`, `deleteMessage`, `moveMessage`; optional WebSocket
- `useWildduckMessage` - Single-message operations: get, update, delete, forward, submit draft
- `useWildduckUser` - Single user: profile, quota, limits, spam, forwarding, encryption, 2FA
- `useWildduckSearch` - Search messages with accumulated pagination
- `useWildduckAuth` - `authenticate`, `preAuth`, `logout`, `getAuthStatus`

### TanStack Query hooks (read-only)

- `useWildduckHealth`, `useWildduckUsersList`, `useWildduckUser`, `useWildduckUserAddresses`,
  `useWildduckUserMessages`, `useWildduckMessage`, `useWildduckUserFilters`,
  `useWildduckUserSettings`, `useWildduckUserMailboxes`, `useWildduckAuthStatus`,
  `useWildduckSearchMessages`

### Deprecated individual domain hooks

- `useWildduckMailboxes`, `useWildduckSettings`, `useWildduckFilters`, `useWildduckAddresses`,
  `useWildduckAutoReply` (each supports optional WebSocket)

> Operations without a dedicated hook (forwarding, send, upload, mailbox/filter/address/autoreply
> CRUD) are available as methods on `WildduckClient` and as helper functions in
> [`src/utils`](./src/utils).

For detailed documentation on all hooks, see [docs/HOOKS_DOCUMENTATION.md](./docs/HOOKS_DOCUMENTATION.md).

## WebSocket Real-time Support

Since v2.3.0, all hooks support optional WebSocket connections for real-time updates.

### Quick Start

```tsx
import { WebSocketProvider } from '@sudobility/wildduck_client';

function App() {
  return (
    <WebSocketProvider
      enabled={true}
      config={{ url: 'ws://your-server.com/ws' }}
    >
      <YourApp />
    </WebSocketProvider>
  );
}

// Enable WebSocket in any hook
const { mailboxes } = useWildduckMailboxes(
  networkClient,
  config,
  wildduckUserAuth,
  false,
  { enableWebSocket: true } // ← Enable real-time updates
);
```

### Features

- **Automatic reconnection** with exponential backoff
- **Per-user connections** - one WebSocket per authenticated user
- **Seamless fallback** to REST API if WebSocket unavailable
- **React Query integration** - automatic cache updates
- **Event-driven updates** - mailboxes, messages, filters, settings, autoreply

### Documentation

- **[Complete WebSocket Guide](./docs/WEBSOCKET.md)** - Setup, configuration, API reference
- **[Usage Examples](./docs/examples/WEBSOCKET_EXAMPLES.md)** - Real-world code examples
- **[React Native Compatibility](./docs/REACT_NATIVE_COMPATIBILITY.md)** - Mobile support guide

## Development

This repo uses **Bun** as its package manager (`bun.lock`). Dev dependencies resolve
`@sudobility/*` from GitHub Packages via the repo `.npmrc`, so a `read:packages` token must be
available (e.g. `GITHUB_TOKEN`). The commands below show `bun`; `npm run <script>` works too.

```bash
# Install dependencies
bun install

# Type-check, lint, unit-test, then build
bun run typecheck
bun run lint
bun run test:unit
bun run build
```

### Development Scripts

> Note: there is **no** plain `test` script. Use `test:unit` (excludes integration tests),
> `test:run` (runs everything once), or `test:watch`.

```bash
bun run build              # Build: tsc (tsconfig.build.json) + scripts/fix-esm-imports.mjs
bun run build:watch        # Compile in watch mode (tsc --watch; skips the ESM fix step)
bun run clean              # Remove dist/
bun run test:unit          # Run unit tests once (excludes *.integration.test.ts)
bun run test:run           # Run all tests once
bun run test:watch         # Run tests in watch mode
bun run test:coverage      # Run tests with v8 coverage
bun run test:integration   # Run integration tests (requires a WildDuck server)
bun run lint               # Run ESLint over src/
bun run lint:fix           # Auto-fix ESLint issues
bun run format             # Format src with Prettier
bun run format:check       # Check formatting
bun run typecheck          # Type-check without emitting (tsc --noEmit)
bun run check-all          # lint + typecheck + test:unit
```

> The `build` script runs `scripts/fix-esm-imports.mjs` after `tsc` to rewrite relative imports
> in the emitted output to fully-qualified ESM specifiers (e.g. `./core` → `./core/index.js`) so
> Node's native ESM loader can resolve them. `build:watch` does not run this step.

## Testing

### Unit Tests

Unit tests run under Vitest with the `happy-dom` environment.

```bash
bun run test:unit    # excludes integration tests
```

### Integration Tests

Integration tests require a live WildDuck server. They are **skipped** unless `WILDDUCK_ENDPOINT`
is set (see `.env.example`):

```bash
# Set environment variables (or copy .env.example to .env)
export WILDDUCK_ENDPOINT=http://localhost:8080
export WILDDUCK_EMAIL_DOMAIN=example.com  # Optional
export WILDDUCK_API_TOKEN=                 # Optional, for admin operations

# Run integration tests
bun run test:integration
```

For more details, see [docs/INTEGRATION_TESTS.md](./docs/INTEGRATION_TESTS.md).

## Documentation

- **[docs/HOOKS_DOCUMENTATION.md](./docs/HOOKS_DOCUMENTATION.md)** - Comprehensive hook documentation with examples
- **[docs/WILDDUCK_API_ENDPOINTS.md](./docs/WILDDUCK_API_ENDPOINTS.md)** - Complete API endpoint reference
- **[docs/GAP_ANALYSIS.md](./docs/GAP_ANALYSIS.md)** - Analysis of implemented vs. missing endpoints
- **[docs/INTEGRATION_TESTS.md](./docs/INTEGRATION_TESTS.md)** - Integration testing guide
- **[docs/CI_CD_SETUP.md](./docs/CI_CD_SETUP.md)** - CI/CD workflow documentation
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Deployment guide

## Architecture

```
wildduck_client/
├── src/
│   ├── index.ts          # Entry point - re-exports every module
│   ├── network/          # WildduckClient class, factory, error types
│   ├── hooks/            # React hooks (flat files, one per hook)
│   ├── websocket/        # WebSocket client, provider, protocol
│   ├── components/       # React components (WebSocketStatus)
│   ├── types/            # Search query/response types
│   ├── utils/            # Settings/forwarding/spam/filter helpers
│   └── __tests__/
│       └── integration/  # Integration tests
├── scripts/              # Build helpers (fix-esm-imports.mjs)
├── dist/                 # Compiled output (generated)
└── docs/                 # Documentation files
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and add tests
4. Run checks: `npm run check-all`
5. Commit your changes: `git commit -m "Add my feature"`
6. Push to the branch: `git push origin feature/my-feature`
7. Open a pull request

### Code Quality

This project maintains high code quality standards:

- TypeScript with strict mode enabled
- ESLint for code linting
- Prettier for code formatting
- Comprehensive unit and integration tests
- CI/CD pipeline that runs on every push

## Deployment

### Publishing

The package is published to **GitHub Packages** (`npm.pkg.github.com`) via the CI/CD workflow
(`.github/workflows/ci-cd.yml`, which calls the shared `johnqh/workflows` reusable workflow) on
pushes to `main`:

1. Update version: `npm version patch|minor|major`
2. Push to main: `git push origin main --tags`
3. CI/CD runs checks and publishes automatically

`prepublishOnly` runs `clean` + `build` before any publish. For more details, see
[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) and [docs/CI_CD_SETUP.md](./docs/CI_CD_SETUP.md).

## License

Business Source License 1.1 (BUSL-1.1). See `package.json` for the declared license.

## Related Projects

- [WildDuck](https://github.com/nodemailer/wildduck) - The WildDuck email server
- [@sudobility/types](https://www.npmjs.com/package/@sudobility/types) - Shared type definitions

## Support

- [GitHub Issues](https://github.com/johnqh/wildduck_client/issues)
- [API Documentation](https://docs.wildduck.email/api/)

## Changelog

See [GitHub Releases](https://github.com/johnqh/wildduck_client/releases) for version history and release notes.
