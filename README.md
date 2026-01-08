# Svg2ico

A barebones monorepo starter with NestJS, Vite, Turborepo, Tailwind v4, shadcn/ui, and Prisma.

## Using This Template

### Quick Start

1. Clone or use this template from GitHub
2. Install dependencies and initialize your project:

```bash
pnpm install
pnpm init-project
```

3. Follow the interactive prompts to:
   - Set your project name
   - Choose your package naming convention
   - Set initial version
   - Optionally reset git history

4. Start developing:

```bash
pnpm dev:full
```

### Updating From Upstream

If you forked this template and want to pull in updates:

1. Add the upstream remote (if not already added):

   ```bash
   git remote add upstream <template-repo-url>
   ```

2. Fetch and review upstream changes:

   ```bash
   git fetch upstream
   ```

3. Check the [CHANGELOG](./CHANGELOG.md) for migration notes and breaking changes

4. Merge or cherry-pick changes as needed:
   ```bash
   git merge upstream/main
   # or
   git cherry-pick <commit-hash>
   ```

![Screenshot](.documentation/images/screenshot.png)

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Backend**: NestJS with Prisma ORM
- **Frontend**: Vite + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: PostgreSQL 16

## Project Structure

```
svg2ico/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Vite + React frontend
├── packages/         # Shared packages (future)
├── docker/           # Docker Compose configuration
└── turbo.json        # Turborepo configuration
```

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker and Docker Compose

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

```bash
# Copy root environment file
cp .env.example .env

# Copy API environment file
cp apps/api/.env.example apps/api/.env
```

### 3. Start everything (Docker + Migrations + Apps)

```bash
pnpm dev:full
```

This single command will:

1. Start Docker container (PostgreSQL)
2. Wait for container to be healthy
3. Run Prisma migrations
4. Start the API and Web apps in development mode

### Alternative: Manual Setup

```bash
# Start Docker containers
pnpm docker:up

# Generate Prisma client and run migrations
pnpm db:generate
pnpm db:migrate

# Start development servers
pnpm dev
```

## Available Scripts

### Root Level

| Script                   | Description                                |
| ------------------------ | ------------------------------------------ |
| `pnpm dev`               | Start all apps in development mode         |
| `pnpm dev:full`          | Start Docker + run migrations + start apps |
| `pnpm build`             | Build all apps                             |
| `pnpm docker:up`         | Start Docker containers                    |
| `pnpm docker:down`       | Stop Docker containers                     |
| `pnpm docker:logs`       | View Docker container logs                 |
| `pnpm db:migrate`        | Run Prisma migrations                      |
| `pnpm db:studio`         | Open Prisma Studio                         |
| `pnpm db:generate`       | Generate Prisma client                     |
| `pnpm init-project`      | Initialize project with your own name      |
| `pnpm changeset`         | Create a new changeset                     |
| `pnpm changeset:version` | Apply changesets and bump versions         |

## URLs

| Service       | URL                                 |
| ------------- | ----------------------------------- |
| Frontend      | http://localhost:5173               |
| API           | http://localhost:3000/api/v1        |
| Health Check  | http://localhost:3000/api/v1/health |
| Prisma Studio | http://localhost:5555               |

## Adding shadcn/ui Components

The frontend is pre-configured for shadcn/ui. To add more components:

```bash
cd apps/web
npx shadcn@latest add [component-name]
```

## Docker Services

| Service    | Port | Description |
| ---------- | ---- | ----------- |
| PostgreSQL | 5432 | Database    |

## Logging & Observability

Both apps include a comprehensive logging and observability infrastructure:

**Backend (NestJS):**

- Structured JSON logging with OpenTelemetry integration
- Automatic trace context propagation for distributed tracing
- Custom metrics service for business KPIs and performance monitoring
- Sensitive data sanitization (passwords, tokens, API keys)
- BetterStack integration for centralized log aggregation

**Frontend (React):**

- Error boundary provider catching all unhandled React errors
- Automatic error reporting to backend via `/api/v1/client-errors`
- User-friendly error pages with error IDs for support reference
- Conditional console logging (dev-only) with module prefixes

Configure logging via environment variables:

- `LOG_LEVEL` - error, warn, log, debug, verbose
- `OTEL_ENABLED` - Enable/disable OpenTelemetry export
- `OTEL_EXPORTER_OTLP_ENDPOINT` - BetterStack OTLP endpoint

See [Logging Standards](.documentation/devdocs/Logging-Standards.md) for full documentation.

## License

MIT test
