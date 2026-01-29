# TaskFlow - Project & Task Management Web App

## Overview

TaskFlow is a full-stack project and task management application designed for teams to organize work, track time, and collaborate effectively. The application provides multiple views (Kanban board, list, calendar) for managing tasks within projects, along with time tracking, team management, and real-time collaboration features. The design follows Linear and Notion-inspired aesthetics with a focus on clarity, efficiency, and information density.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Component Library**: shadcn/ui components built on Radix UI primitives
- **Build Tool**: Vite for development and production builds
- **Drag and Drop**: @hello-pangea/dnd for Kanban board interactions

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Design**: RESTful JSON API with `/api` prefix
- **Authentication**: Replit OpenID Connect (OIDC) with Passport.js, session-based auth stored in PostgreSQL
- **File Storage**: Google Cloud Storage integration via Replit's object storage sidecar

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **Migrations**: Drizzle Kit for schema migrations (`drizzle-kit push`)
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple

### Key Design Patterns
- **Monorepo Structure**: Single repository with `client/`, `server/`, and `shared/` directories
- **Shared Types**: TypeScript types and Zod schemas defined in `shared/schema.ts` are used by both frontend and backend
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`
- **Query-based Data Fetching**: All API calls use React Query with the endpoint path as the query key
- **Form Validation**: React Hook Form with Zod resolver for client-side validation

### Application Structure
```
client/src/
├── components/     # React components including shadcn/ui
├── hooks/          # Custom React hooks (useAuth, use-toast, etc.)
├── lib/            # Utilities (queryClient, utils)
├── pages/          # Page components for each route
server/
├── index.ts        # Express server entry point
├── routes.ts       # API route definitions
├── storage.ts      # Database operations interface
├── db.ts           # Drizzle database connection
├── replitAuth.ts   # Authentication setup
shared/
├── schema.ts       # Database schema and TypeScript types
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database accessed via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### Authentication
- **Replit OIDC**: Authentication provider using OpenID Connect
- **Required Secrets**: `SESSION_SECRET`, `REPL_ID`, `ISSUER_URL`

### File Storage
- **Google Cloud Storage**: Object storage via Replit sidecar at `http://127.0.0.1:1106`
- **Environment**: `PUBLIC_OBJECT_SEARCH_PATHS` for public file access configuration

### Third-Party Libraries
- **Uppy**: File upload handling with dashboard UI
- **date-fns**: Date manipulation and formatting
- **Zod**: Runtime type validation for API requests
- **Lucide React**: Icon library

### Development Tools
- **Vite**: Development server with HMR
- **esbuild**: Production bundling for server code
- **TypeScript**: Type checking across the entire codebase

## Recent Changes

### Smart Lists Integration (January 2026)
- Smart Lists functionality is now integrated into the Tasks page rather than being a standalone page
- SmartListsPanel component (`client/src/components/SmartListsPanel.tsx`) provides a slide-out drawer with:
  - Preset filters: Today, Tomorrow, Next 7 Days, All, Important, No Due Date, Completed
  - Custom smart list creation with advanced filtering options (projects, priorities, statuses, due dates)
- URL parameter support: Navigate to `/tasks?filter=important` or `/tasks?filter=completed` to directly apply filters
- Sidebar "Smart Lists" section links to Tasks page with filter parameters
- The standalone smart-lists.tsx page has been removed

### Bible Verses Feature (January 2026)
- Added Bible verses tab to Inspiration Hub for storing and organizing scripture references
- Database table: `inspiration_verses` with fields for book, chapter, verseStart, verseEnd (for ranges), text, translation, category, notes
- Supported translations: NIV, ESV, KJV, NKJV, NLT, NASB, MSG, AMP, CSB, Other
- Verse categories: faith, hope, love, wisdom, strength, peace, guidance, encouragement, other
- API endpoints: GET/POST/PATCH/DELETE `/api/inspiration/verses`, POST `/api/inspiration/verses/:id/favorite`
- UI follows same pattern as quotes/videos/music/images in Inspiration Hub