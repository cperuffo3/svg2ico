# Code Organization Guide

This document describes the organizational patterns used in this monorepo for both the frontend (web) and backend (API) applications.

## Overview

The codebase follows a **feature-based (slice) architecture** where code is organized around business domains rather than technical layers. This approach:

- Co-locates related code for better discoverability
- Reduces coupling between features
- Makes it easier to add, modify, or remove features
- Scales well as the application grows

---

## Backend (API) - NestJS

### Directory Structure

```
apps/api/src/
├── common/                    # Shared infrastructure (global modules)
│   ├── logging/               # Logging service, interceptors, filters
│   │   ├── all-exceptions.filter.ts
│   │   ├── logger.service.ts
│   │   ├── logging.interceptor.ts
│   │   ├── logging.module.ts
│   │   └── index.ts           # Barrel export
│   ├── prisma/                # Database client
│   │   ├── prisma.module.ts
│   │   ├── prisma.service.ts
│   │   └── index.ts           # Barrel export
│   └── index.ts               # Common barrel export
├── modules/                   # Feature modules (domain-specific)
│   └── health/                # Example feature module
│       ├── health.controller.ts
│       ├── health.module.ts
│       ├── prisma.health.ts
│       └── index.ts           # Barrel export
├── app.module.ts              # Root application module
└── main.ts                    # Application entry point
```

### Module Organization Pattern

Each feature module follows a consistent internal structure:

```
modules/[feature-name]/
├── [feature].module.ts        # NestJS Module definition
├── [feature].controller.ts    # HTTP endpoints/routes
├── [feature].service.ts       # Business logic
├── [feature].service.spec.ts  # Unit tests (optional)
├── dto/                       # Data Transfer Objects (optional)
│   ├── create-[feature].dto.ts
│   ├── update-[feature].dto.ts
│   └── [feature]-response.dto.ts
├── guards/                    # Route guards (optional)
├── decorators/                # Custom decorators (optional)
└── index.ts                   # Barrel export
```

### Common vs Modules

| Folder     | Purpose                                               | Examples                                        |
| ---------- | ----------------------------------------------------- | ----------------------------------------------- |
| `common/`  | Global, shared infrastructure used across all modules | Logging, Prisma, Auth guards, Exception filters |
| `modules/` | Feature-specific business domains                     | Users, Events, Health, Notifications            |

### Key Conventions

1. **Barrel Exports**: Every module has an `index.ts` that exports public APIs
2. **ESM Imports**: Use `.js` extension for relative imports (ESM requirement)
3. **Module Exports**: Export services that need to be used by other modules
4. **Global Modules**: Use `@Global()` decorator for infrastructure modules (logging, database)

### Example Module Definition

```typescript
// modules/health/health.module.ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';
import { PrismaHealthIndicator } from './prisma.health.js';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator],
  exports: [PrismaHealthIndicator], // Export if other modules need it
})
export class HealthModule {}
```

---

## Frontend (Web) - React + Vite

### Directory Structure

```
apps/web/src/
├── components/                # Shared UI components
│   ├── common/                # Application-specific reusable components
│   │   ├── ErrorPage.tsx
│   │   └── index.ts
│   ├── layout/                # Layout components (headers, sidebars, etc.)
│   └── ui/                    # shadcn/ui library components
│       ├── button.tsx
│       ├── card.tsx
│       └── index.ts           # Barrel export
├── features/                  # Feature-based modules
│   ├── dashboard/             # Dashboard feature
│   │   ├── components/        # Feature-specific components
│   │   │   ├── HealthStatusCard.tsx
│   │   │   └── index.ts
│   │   ├── hooks/             # Feature-specific hooks
│   │   │   ├── useHealth.ts
│   │   │   └── index.ts
│   │   ├── pages/             # Page components (entry points)
│   │   │   ├── DashboardPage.tsx
│   │   │   └── index.ts
│   │   └── index.ts           # Feature barrel export
│   ├── api-docs/              # API Documentation feature
│   │   ├── pages/
│   │   │   ├── ApiDocsPage.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   └── index.ts               # Features barrel export
├── hooks/                     # Shared hooks (cross-feature)
│   ├── useTheme.ts
│   └── index.ts
├── lib/                       # Utility functions and helpers
│   ├── error-reporting/
│   └── utils.ts
├── providers/                 # React context providers
│   ├── ErrorBoundaryProvider.tsx
│   └── index.ts
├── config/                    # Configuration and environment
│   └── env.ts
├── styles/                    # Global styles
│   ├── primitives.css
│   └── tokens.css
├── main.tsx                   # Application entry point
└── index.css                  # Root CSS imports
```

### Feature Organization Pattern

Each feature follows a consistent internal structure:

```
features/[feature-name]/
├── components/                # UI components
│   ├── desktop/               # Desktop-specific (optional, for responsive)
│   ├── mobile/                # Mobile-specific (optional, for responsive)
│   ├── shared/                # Shared between desktop/mobile
│   ├── [Component].tsx
│   └── index.ts               # Barrel export
├── hooks/                     # Feature-specific React hooks
│   ├── use[FeatureName].ts
│   └── index.ts
├── pages/                     # Page/route components
│   ├── [Feature]Page.tsx
│   └── index.ts
├── types.ts                   # TypeScript type definitions (optional)
├── schemas/                   # Validation schemas - Zod (optional)
├── stores/                    # State management - Zustand (optional)
└── index.ts                   # Feature barrel export
```

### Components Hierarchy

| Folder                   | Scope                             | Examples                      |
| ------------------------ | --------------------------------- | ----------------------------- |
| `components/ui/`         | Generic UI primitives (shadcn/ui) | Button, Card, Dialog          |
| `components/common/`     | Application-specific reusables    | ErrorPage, PageHeader, Avatar |
| `components/layout/`     | Page structure components         | Sidebar, Header, Footer       |
| `features/*/components/` | Feature-specific components       | HealthStatusCard, UserProfile |

### Key Conventions

1. **Barrel Exports**: Every folder has an `index.ts` for clean imports
2. **Page Components**: Handle data fetching and orchestrate child components
3. **Feature Isolation**: Features should be self-contained with minimal cross-feature dependencies
4. **Shared Hooks**: Cross-feature hooks go in `src/hooks/`
5. **Path Aliases**: Use `@/` for `src/`, `@components`, `@features`, etc.

### Example Feature Structure

```typescript
// features/dashboard/index.ts
export * from './components';
export * from './hooks';
export * from './pages';

// Usage in main.tsx
import { DashboardPage, ApiDocsPage } from './features';
```

---

## Barrel Export Pattern

Both apps use barrel exports (`index.ts` files) to:

1. **Simplify imports**: `import { Button } from '@/components/ui'` instead of `'@/components/ui/button'`
2. **Control public API**: Only export what should be used externally
3. **Enable refactoring**: Internal file structure can change without breaking imports

### Example Barrel Export

```typescript
// features/dashboard/components/index.ts
export { HealthStatusCard } from './HealthStatusCard';

// features/dashboard/hooks/index.ts
export { useHealth } from './useHealth';
export type { HealthStatus } from './useHealth';

// features/dashboard/index.ts
export * from './components';
export * from './hooks';
export * from './pages';
```

---

## Adding New Features

### Backend (API)

1. Create a new folder under `apps/api/src/modules/[feature-name]/`
2. Create the module, controller, service files
3. Add an `index.ts` barrel export
4. Import the module in `app.module.ts`

### Frontend (Web)

1. Create a new folder under `apps/web/src/features/[feature-name]/`
2. Add `components/`, `hooks/`, `pages/` subfolders as needed
3. Create barrel exports at each level
4. Export from `features/index.ts`
5. Add route in `main.tsx`

---

## Responsive Design (Optional Pattern)

For features requiring different desktop/mobile layouts:

```
features/[feature]/components/
├── desktop/
│   ├── [Feature]Desktop.tsx
│   └── index.ts
├── mobile/
│   ├── [Feature]Mobile.tsx
│   └── index.ts
├── shared/
│   ├── [SharedComponent].tsx
│   └── index.ts
└── index.ts
```

The page component handles viewport detection and renders the appropriate implementation:

```typescript
// pages/[Feature]Page.tsx
export function FeaturePage() {
  const isMobile = useIsMobile();
  const { data } = useFeatureData();

  if (isMobile) {
    return <FeatureMobile data={data} />;
  }
  return <FeatureDesktop data={data} />;
}
```

---

## Summary

| Aspect         | Backend (API)         | Frontend (Web)                  |
| -------------- | --------------------- | ------------------------------- |
| Architecture   | Module-based (NestJS) | Feature-based (React)           |
| Shared code    | `common/` folder      | `components/`, `hooks/`, `lib/` |
| Feature code   | `modules/` folder     | `features/` folder              |
| Entry point    | `app.module.ts`       | `main.tsx`                      |
| Barrel exports | Yes (`.js` extension) | Yes                             |
