# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies
pnpm install

# Start everything (Docker + migrations + dev servers)
pnpm dev:full

# Start development servers only (assumes Docker is running)
pnpm dev

# Build all apps
pnpm build

# Type checking
pnpm type-check

# Linting
pnpm lint
```

### Docker & Database

```bash
pnpm docker:up       # Start PostgreSQL container
pnpm docker:down     # Stop containers
pnpm db:generate     # Generate Prisma client
pnpm db:migrate      # Run Prisma migrations
pnpm db:studio       # Open Prisma Studio (http://localhost:5555)
```

### Per-App Commands

```bash
# API (NestJS) - from apps/api
pnpm --filter @svg2ico/api dev
pnpm --filter @svg2ico/api build
pnpm --filter @svg2ico/api type-check

# Web (Vite/React) - from apps/web
pnpm --filter @svg2ico/web dev
pnpm --filter @svg2ico/web build
```

### Adding shadcn/ui Components

```bash
cd apps/web
npx shadcn@latest add [component-name]
```

## Architecture

This is a **pnpm workspaces + Turborepo** monorepo with two apps:

### apps/api (NestJS Backend)

- **Package name**: `@svg2ico/api`
- **Entry**: `src/main.ts` - Sets global prefix `/api/v1`, enables CORS
- **Module pattern**: NestJS modules in `src/` (e.g., `health/`, `prisma/`)
- **Database**: Prisma with PostgreSQL adapter (`@prisma/adapter-pg`)
  - Schema: `prisma/schema.prisma`
  - Generated client: `prisma/generated/prisma/` (not `node_modules`)
  - PrismaService wraps PrismaClient with pg Pool connection
- **Health endpoint**: `/api/v1/health` using `@nestjs/terminus`
- Uses ES modules (`"type": "module"` in package.json)

### apps/web (Vite + React Frontend)

- **Package name**: `@svg2ico/web`
- **Tech**: React 19, TypeScript, Tailwind CSS v4, TanStack Query
- **UI**: shadcn/ui components in `src/components/ui/`
- **Path aliases**: `@` = `src/`, `@components`, `@lib`
- **API proxy**: Vite dev server proxies `/api` to `localhost:3000`
- **State**: TanStack Query for server state (see `src/api/` for API calls)

### Workspace Structure

```
apps/
├── api/           # NestJS backend (@svg2ico/api)
│   ├── src/       # NestJS modules
│   └── prisma/    # Schema + generated client
└── web/           # Vite + React frontend (@svg2ico/web)
    └── src/
        ├── api/        # API fetch functions
        └── components/ # React components + shadcn/ui
packages/          # Shared packages (empty, for future use)
docker/            # docker-compose.yml for PostgreSQL
```

## Key Conventions

- **Imports in API**: Use `.js` extension for relative imports (ESM requirement)
- **Prisma client import**: `from '../../prisma/generated/prisma/client.js'`
- **Environment files**: `.env` at root and `apps/api/.env` (see `.env.example`)
- **Database URL**: Set via `DATABASE_URL` in `apps/api/.env`

## Running Services

| Service    | URL                          |
| ---------- | ---------------------------- |
| Frontend   | http://localhost:5173        |
| API        | http://localhost:3000/api/v1 |
| PostgreSQL | localhost:5432               |

## Project Initialization

This is a starter template. To customize it for your project:

```bash
pnpm init-project
```

The script will prompt you to:

- Set your project name (e.g., `my-awesome-app`)
- Choose package naming convention (`@myapp/api` vs `myapp-api` vs `api`)
- Set initial version (0.1.0 or 1.0.0)
- Optionally reset git history

This updates all package names, Docker configs, environment files, and documentation.

## Version Management (Changesets)

This project uses [Changesets](https://github.com/changesets/changesets) for version management.

### For Template Maintainers

When making changes to the template:

```bash
pnpm changeset          # Create a changeset describing your changes
pnpm changeset:version  # Apply changesets and update CHANGELOG
```

The CHANGELOG serves as a migration guide for users updating their forks.

### For Project Users

After running `pnpm init-project`, the changelog is reset for your project's use. Use the same commands to track your own changes.
