# Space Base Showdown

## Recent Changes

### ALL 9 PHASES COMPLETE (October 24, 2025)

**Phase 2-7 (43 sub-phases)**: Star Map, Mining Drones, Crystal Rifts, Power System, Research Bay, Combat System - ALL COMPLETE ✅

**Phase 8: Ship Loadouts & Modifiers (8 sub-phases)** ✅
- Equipment system with 4 equipment types (plasma cannon, laser array, shield amplifier, reinforced plating)
- Equipment crafting with resource costs (metal, crystals, credits)
- Ship equipment slots (weapon, defense, utility)
- Equipment equipping UI with dropdown selects per slot
- Equipment bonuses applied in combat (hull/shields/damage modifiers)
- Equipment inventory display showing owned items and equipped status

**Phase 9: Endgame Content (8 sub-phases)** ✅
- Boss encounter system with 2 bosses (Pirate Lord, Alien Armada)
- Combat missions integrated into Battle UI
- Boss fleet configurations with powerful stats
- Victory rewards (metal, crystals, credits)
- Mission completion tracking
- End-to-end combat flow: craft → equip → battle → rewards

**Key Technical Achievements**:
- equipment, shipEquipment, combatMissions tables with full CRUD
- calculateShipStatsWithEquipment applies equipment bonuses to combat
- 6 API endpoints for equipment/missions (craft, equip, get, start mission)
- Minimal but functional UI reusing Shipyard/Battle components
- JSONB deserialization fix (removed redundant JSON.parse in battle log)
- Complete integration with existing phases (power, research, resources)

**Total Implementation**: 59 sub-phases across 8 game phases (Phases 2-9) ✅

### Phase 1: Database Foundation (Completed)
**Date**: October 24, 2025

Comprehensive database schema implemented for all 9 game phases:
- **Core Systems**: Enhanced players table with exotic/energyCells resources, power tracking, fleet limits
- **Mining Systems**: resourceNodes (asteroids/rifts), drones, extractionArrays, missions tables
- **Research System**: researchProjects, playerTechUnlocks tables supporting MD/SR/SL tech trees
- **Combat Systems**: ships, shipLoadouts, fleets, battles tables with full combat stats
- **Equipment Systems**: equipment, shipEquipment, combatMissions tables
- **Multiplayer Prep**: guildMembers table for future features

**Key Architectural Decisions**:
- Kept legacy `buildings` table for backward compatibility
- Added comprehensive FK constraints for referential integrity
- Created performance indexes on playerId, status, and type columns
- Avoided circular reference (drones↔missions) by managing currentMissionId in application logic
- Support for all research IDs from game design (MD-001 through SL-012)
- Equipment bonuses stack with research bonuses in combat calculations

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
  - Resources: credits, metal, crystals, exotic, energyCells
  - Storage caps and power tracking (generation/consumption)
  - Fleet limits (maxDrones, maxPlanetaryDrones, maxExtractionArrays)
  - Tutorial progress and hub level tracking
  - Timestamps for state management
- `buildings` - Legacy player-owned buildings (kept for backward compatibility)
  - Type, level, position data
  - Production rates and storage capacities
  - Built/upgrading states with timestamps
  - Resource accumulation tracking (lastCollectedAt, currentStorage)
- `station_modules` - New modular building system (Phase 5+)
  - Module identity (type, name, level)
  - Power system (tier, output, cost)
  - Position, build/upgrade state and timing
- `resource_nodes` - Asteroid clusters and crystal rifts
  - Discovery system (distance class, discovered status)
  - Finite resource pools (totalIron, remainingIron)
  - Rift stability and energy output
  - Depletion tracking
- `drones` - Mining and planetary drones
  - Tier-based stats (speed, cargo, harvest rate)
  - Status tracking (idle, traveling, mining, returning)
  - Current mission linkage
- `extraction_arrays` - Crystal rift extraction platforms
  - Tier-based stats (uplink, beam stability, range)
  - Target rift deployment
  - Status tracking
- `missions` - Drone trips and array deployments
  - Mission type and status
  - Entity relationships (drone, array, target node)
  - Cargo and timing information
- `research_projects` - Active research in progress
  - Research ID from tech trees (MD-001 to MD-020, SR-001 to SR-009, SL-001 to SL-012)
  - Category, status, timing
- `player_tech_unlocks` - Permanent research progress
  - Unlocked research IDs
  - Timestamp tracking
- `ships` - Player's built combat ships
  - Ship type and stats (HP, shield, hull, initiative, movement, attack, energy)
  - Fleet assignment
- `ship_loadouts` - Equipped weapons and mods
  - Primary/secondary weapons
  - Mod slots (up to 2)
- `fleets` - Battle formations
  - Ship positions on 6x4 grid (JSON)
  - Active status
- `battles` - Combat history
  - Battle type (AI, PvP, tutorial)
  - Fleet assignments and outcome
  - Rewards (credits, metal, crystals, exotic)
  - Battle log (turn-by-turn events)
- `guild_members` - Future multiplayer infrastructure

**Data Relationships**:
- One-to-one: User → Player
- One-to-many: Player → Buildings, StationModules, ResourceNodes, Drones, ExtractionArrays, Missions, Ships, Fleets
- Foreign key constraints with cascade/set null policies ensure data integrity
- Indexes on playerId, status, and type columns for query performance

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