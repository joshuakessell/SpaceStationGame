# Space Base Showdown

## Overview

Space Base Showdown is a browser-based space strategy and idle game where players build and manage their space station, gather resources, train units, and engage in tactical battles. The game features a playful sci-fi aesthetic with base building mechanics inspired by games like Clash of Clans, combined with resource management and turn-based combat systems.

The application is built as a full-stack web game with:
- Real-time resource accumulation and collection
- Tutorial-guided onboarding for new players
- Space station visualization with interactive building placement
- Unit training and deployment system
- Battle grid for tactical combat

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component System**: 
- shadcn/ui component library with Radix UI primitives for accessible, composable components
- Tailwind CSS for styling with custom design tokens matching the space game aesthetic
- Custom fonts: Orbitron (headers/UI labels) and Inter (body text) loaded from Google Fonts

**State Management**:
- TanStack Query (React Query) for server state management and data fetching
- Local React state for UI interactions and game view state
- Session-based authentication state via custom useAuth hook

**Routing**: Wouter for lightweight client-side routing

**Key Design Patterns**:
- Component-driven architecture with reusable game UI components (BuildingCard, UnitCard, BattleGrid, etc.)
- Separation of example/showcase components from production components
- Custom hooks for shared logic (useAuth, useToast, useIsMobile)

### Backend Architecture

**Runtime**: Node.js with Express server

**API Design**: RESTful API endpoints with JSON responses
- `/api/auth/*` - Authentication endpoints via Replit Auth
- `/api/player` - Player data management
- `/api/buildings` - Building CRUD operations

**Authentication & Sessions**:
- OpenID Connect integration via Replit Auth (passport-based strategy)
- Session storage in PostgreSQL using connect-pg-simple
- Cookie-based session management with 1-week TTL
- Middleware-based route protection (isAuthenticated)

**Data Layer**:
- Storage abstraction pattern (IStorage interface) for database operations
- DatabaseStorage implementation handles all DB queries
- Resource accumulation calculated server-side based on time elapsed since last collection

**Development Tools**:
- Vite middleware mode for HMR during development
- Custom logging with formatted timestamps
- Error overlay for runtime errors in development

### Data Storage

**Database**: PostgreSQL via Neon serverless (WebSocket-based connection)

**ORM**: Drizzle ORM with Drizzle Kit for migrations

**Schema Design**:
- `users` - Authentication user data (managed by Replit Auth)
- `sessions` - Session storage for authentication
- `players` - Game-specific player data (references users, cascade delete)
  - Resources: credits, metal, crystals
  - Tutorial progress tracking
  - Timestamps for state management
- `buildings` - Player-owned buildings
  - Type, level, position data
  - Production rates and storage capacities
  - Built/upgrading states with timestamps
  - Resource accumulation tracking (lastCollectedAt, currentStorage)

**Data Relationships**:
- One-to-one: User → Player
- One-to-many: Player → Buildings
- Cascade deletion ensures data integrity when users are removed

**Type Safety**: 
- Zod schemas generated from Drizzle schema for validation
- Shared types between client and server via `@shared/schema`

### Game Mechanics Architecture

**Resource System**:
- Time-based passive resource generation for buildings
- Server-side calculation prevents client manipulation
- Storage caps enforced per building
- Three resource types: Credits, Metal, Crystals

**Tutorial System**:
- Step-based progression (welcome → name_input → intro → building tutorials → complete)
- Tutorial state persisted in player record
- Dialog-based interactions with typewriter effect

**Building System**:
- Hierarchical building requirements
- Position-based placement on space station canvas
- Upgrade system with level progression
- Construction time tracking with build states

**Battle System** (UI prepared):
- Grid-based tactical combat (4 rows × 6 columns)
- Unit deployment mechanics
- Player/enemy side separation
- Health and damage attributes per unit

## External Dependencies

**Authentication**: 
- Replit Auth via OpenID Connect for user authentication
- Requires `REPLIT_DOMAINS`, `ISSUER_URL`, `REPL_ID`, and `SESSION_SECRET` environment variables

**Database**:
- Neon PostgreSQL serverless database
- Requires `DATABASE_URL` environment variable
- WebSocket connection via `@neondatabase/serverless` with `ws` library

**UI Libraries**:
- Radix UI primitives for 20+ component types (dialogs, dropdowns, tooltips, etc.)
- Tailwind CSS with PostCSS and Autoprefixer
- Lucide React for iconography

**Development Dependencies**:
- Replit-specific Vite plugins: runtime error modal, cartographer, dev banner
- TypeScript for type safety across the stack
- ESBuild for server bundle in production

**Asset Management**:
- Static assets served from `attached_assets` directory
- Vite alias configuration for asset imports
- Favicon and fonts loaded from public directory

**Key Configuration Files**:
- `vite.config.ts` - Build configuration with alias mappings
- `tailwind.config.ts` - Custom design system with space-themed color tokens
- `tsconfig.json` - TypeScript paths for `@/`, `@shared/`, `@assets/` imports
- `drizzle.config.ts` - Database migration and schema configuration