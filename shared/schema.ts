import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, real, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// AUTH TABLES (Required for Replit Auth)
// ============================================================================

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// ============================================================================
// PLAYER & RESOURCES (Core progression)
// ============================================================================

export const players = pgTable("players", {
  id: varchar("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Base resources
  gold: integer("gold").notNull().default(1000),
  metal: integer("metal").notNull().default(100),
  crystals: integer("crystals").notNull().default(0),
  exotic: integer("exotic").notNull().default(0), // Rare items from exploration
  // Storage caps
  maxMetal: integer("max_metal").notNull().default(1000),
  maxCrystals: integer("max_crystals").notNull().default(500),
  maxExotic: integer("max_exotic").notNull().default(100),
  // Power system (Phase 5)
  powerGeneration: integer("power_generation").notNull().default(0),
  powerConsumption: integer("power_consumption").notNull().default(0),
  // Fleet limits (Phase 3-4)
  maxDrones: integer("max_drones").notNull().default(1),
  maxPlanetaryDrones: integer("max_planetary_drones").notNull().default(0),
  maxExtractionArrays: integer("max_extraction_arrays").notNull().default(0),
  // Tutorial & progression
  tutorialStep: text("tutorial_step").notNull().default("welcome"),
  hubLevel: integer("hub_level").notNull().default(1),
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUpdatedAt: timestamp("last_updated_at").notNull().defaultNow(),
});

// ============================================================================
// STATION MODULES (Replaces simple "buildings", Phase 1-6)
// ============================================================================

export const stationModules = pgTable("station_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  // Module identity
  moduleType: text("module_type").notNull(), // command_core, scanner_array, drone_hangar, power_module, research_bay, etc.
  moduleName: text("module_name").notNull(),
  level: integer("level").notNull().default(1),
  // Power system (Phase 5)
  powerTier: integer("power_tier"), // 1=Solar, 2=Fusion, 3=Antimatter, 4=Quantum, 5=Dark
  powerOutput: integer("power_output").default(0),
  powerCost: integer("power_cost").default(0),
  isPowered: boolean("is_powered").notNull().default(true), // Phase 5.4: Power enforcement
  // Position & state
  positionX: real("position_x").notNull(),
  positionY: real("position_y").notNull(),
  isBuilt: boolean("is_built").notNull().default(false),
  isUpgrading: boolean("is_upgrading").notNull().default(false),
  // Build/upgrade timing
  buildStartedAt: timestamp("build_started_at"),
  upgradeCompletesAt: timestamp("upgrade_completes_at"),
  // Resource production (for legacy compatibility with passive generation)
  currentStorage: real("current_storage").default(0),
  maxStorage: integer("max_storage"),
  productionRate: integer("production_rate"),
  resourceType: text("resource_type"), // iron, crystal
  lastCollectedAt: timestamp("last_collected_at"),
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_modules_player_id").on(table.playerId),
  index("idx_modules_type").on(table.moduleType),
]);

// Legacy buildings table for backward compatibility during migration
export const buildings = pgTable("buildings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  buildingType: text("building_type").notNull(),
  name: text("name").notNull(),
  level: integer("level").notNull().default(1),
  positionX: real("position_x").notNull(),
  positionY: real("position_y").notNull(),
  isBuilt: boolean("is_built").notNull().default(false),
  isBuilding: boolean("is_building").notNull().default(false),
  isPowered: boolean("is_powered").notNull().default(true),
  currentStorage: real("current_storage").default(0),
  maxStorage: integer("max_storage"),
  productionRate: integer("production_rate"),
  resourceType: text("resource_type"),
  buildStartedAt: timestamp("build_started_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastCollectedAt: timestamp("last_collected_at"),
});

// ============================================================================
// MINING SYSTEM (Phase 2-4)
// ============================================================================

// Drone tiers configuration
export const droneTiers = [
  { id: 1, name: "Mk1 Mining Drone", speed: 10, cargoCapacity: 50, harvestRate: 10 },
  { id: 2, name: "Mk2 Mining Drone", speed: 15, cargoCapacity: 100, harvestRate: 20 },
  { id: 3, name: "Mk3 Mining Drone", speed: 25, cargoCapacity: 200, harvestRate: 40 },
];

// Drone upgrade configuration
export const DRONE_UPGRADE_CONFIG = {
  maxLevelPerTier: {
    1: 3,  // T1 drones can upgrade to level 3
    2: 5,  // T2 drones can upgrade to level 5
    3: 7,  // T3 drones can upgrade to level 7
  } as Record<number, number>,
  bonusPerLevel: 0.10,  // +10% per level
  baseCosts: {
    speed: { metal: 50, gold: 20 },
    cargo: { metal: 30, gold: 15 },
    harvest: { metal: 40, gold: 18 },
  },
  costMultiplier: 1.5,  // Costs scale by 1.5x per level
  upgradeDuration: 30,  // 30 seconds per upgrade
};

// Rift configuration (Phase 4.3)
export const RIFT_CONFIG = {
  baseStability: { min: 500, max: 1000 },
  baseRichness: { min: 5, max: 15 }, // crystals per tick
  baseVolatility: { min: 0.8, max: 1.2 }, // multiplier for decay
  passiveDecayPerTick: 1, // stability lost per tick without extraction
  extractionDecayMultiplier: 0.5, // additional decay per crystal extracted
  scanCooldown: 60, // seconds between scans
  scanRadius: { 1: 50, 2: 100, 3: 150 }, // by scanner level
  maxRiftsByLevel: { 1: 2, 2: 4, 3: 6 }, // max rifts discovered by scanner level
};

// Extraction array tiers (Phase 4.2)
export const ARRAY_TIERS = [
  { id: 1, name: "T1 Array", baseExtraction: 2, buildCost: { metal: 200, gold: 100 }, buildTime: 30 },
  { id: 2, name: "T2 Array", baseExtraction: 5, buildCost: { metal: 500, gold: 250 }, buildTime: 60 },
  { id: 3, name: "T3 Array", baseExtraction: 10, buildCost: { metal: 1000, gold: 500 }, buildTime: 90 },
];

// Array upgrade configuration (Phase 4.7)
export const ARRAY_UPGRADE_CONFIG = {
  maxLevelPerTier: {
    1: 3,  // T1 arrays can upgrade to level 3
    2: 5,  // T2 arrays can upgrade to level 5
    3: 7,  // T3 arrays can upgrade to level 7
  } as Record<number, number>,
  bonusPerLevel: 0.10,  // +10% per level
  baseCosts: {
    uplink: { metal: 100, gold: 50 }, // increases extraction rate
    beam: { metal: 80, gold: 40 }, // reduces stability decay
    telemetry: { metal: 60, gold: 30 }, // improves detection (future)
  },
  costMultiplier: 1.5,  // Costs scale by 1.5x per level
  upgradeDuration: 60,  // 60 seconds per upgrade
};

// ============================================================================
// POWER SYSTEM (Phase 5)
// ============================================================================

// Power module tiers configuration
export const POWER_MODULE_TIERS = [
  {
    tier: 1,
    name: "Solar Array",
    powerOutput: 5,
    buildCost: { metal: 50, gold: 0 },
    requiredHubLevel: 2,
    buildTime: 30, // seconds
  },
  {
    tier: 2,
    name: "Fusion Reactor",
    powerOutput: 15,
    buildCost: { metal: 200, crystals: 50 },
    requiredHubLevel: 4,
    buildTime: 60,
  },
  {
    tier: 3,
    name: "Antimatter Generator",
    powerOutput: 40,
    buildCost: { metal: 500, crystals: 200 },
    requiredHubLevel: 6,
    buildTime: 90,
  },
  {
    tier: 4,
    name: "Quantum Core",
    powerOutput: 100,
    buildCost: { metal: 1500, crystals: 800 },
    requiredHubLevel: 8,
    buildTime: 120,
  },
  {
    tier: 5,
    name: "Dark Singularity",
    powerOutput: 250,
    buildCost: { metal: 5000, crystals: 3000 },
    requiredHubLevel: 10,
    buildTime: 180,
  },
] as const;

// Central Hub upgrade configuration
export const CENTRAL_HUB_CONFIG = {
  maxLevel: 10,
  upgradeCosts: [
    { level: 2, metal: 100, gold: 50 },
    { level: 3, metal: 250, gold: 100 },
    { level: 4, metal: 500, crystals: 100, gold: 150 },
    { level: 5, metal: 1000, crystals: 200, gold: 250 },
    { level: 6, metal: 2000, crystals: 500, gold: 400 },
    { level: 7, metal: 3500, crystals: 1000, gold: 600 },
    { level: 8, metal: 6000, crystals: 2000, gold: 1000 },
    { level: 9, metal: 10000, crystals: 4000, gold: 1500 },
    { level: 10, metal: 15000, crystals: 6000, gold: 2500 },
  ],
  upgradeDurations: [
    { level: 2, seconds: 60 },
    { level: 3, seconds: 90 },
    { level: 4, seconds: 120 },
    { level: 5, seconds: 180 },
    { level: 6, seconds: 240 },
    { level: 7, seconds: 300 },
    { level: 8, seconds: 420 },
    { level: 9, seconds: 600 },
    { level: 10, seconds: 900 },
  ],
} as const;

// Metal Warehouse storage upgrade configuration
export const METAL_WAREHOUSE_CONFIG = {
  maxLevel: 5,
  storageCaps: [
    { level: 1, capacity: 1000 },
    { level: 2, capacity: 5000 },
    { level: 3, capacity: 20000 },
    { level: 4, capacity: 50000 },
    { level: 5, capacity: 100000 },
  ],
  upgradeCosts: [
    { level: 1, metal: 100, gold: 100 }, // Build cost for L1
    { level: 2, metal: 300, gold: 120 }, // Upgrade cost to L2
    { level: 3, metal: 1000, crystals: 50, gold: 200 }, // Upgrade cost to L3
    { level: 4, metal: 3000, crystals: 200, gold: 400 }, // Upgrade cost to L4
    { level: 5, metal: 8000, crystals: 500, gold: 800 }, // Upgrade cost to L5
  ],
  upgradeDurations: [
    { level: 1, seconds: 15 },
    { level: 2, seconds: 45 },
    { level: 3, seconds: 120 },
    { level: 4, seconds: 300 },
    { level: 5, seconds: 600 },
  ],
} as const;

// Crystal Silo storage upgrade configuration
export const CRYSTAL_SILO_CONFIG = {
  maxLevel: 5,
  storageCaps: [
    { level: 1, capacity: 500 },
    { level: 2, capacity: 3000 },
    { level: 3, capacity: 10000 },
    { level: 4, capacity: 30000 },
    { level: 5, capacity: 75000 },
  ],
  upgradeCosts: [
    { level: 1, metal: 200, gold: 100 }, // Build cost for L1
    { level: 2, metal: 500, crystals: 200, gold: 200 }, // Upgrade cost to L2
    { level: 3, metal: 1500, crystals: 500, gold: 400 }, // Upgrade cost to L3
    { level: 4, metal: 4000, crystals: 1200, gold: 800 }, // Upgrade cost to L4
    { level: 5, metal: 10000, crystals: 3000, gold: 1500 }, // Upgrade cost to L5
  ],
  upgradeDurations: [
    { level: 1, seconds: 30 },
    { level: 2, seconds: 120 },
    { level: 3, seconds: 300 },
    { level: 4, seconds: 600 },
    { level: 5, seconds: 900 },
  ],
} as const;

// Building power consumption by type
export const BUILDING_POWER_COSTS = {
  command_core: 0, // Central Hub doesn't consume power
  scanner_array: 2,
  drone_hangar: 3,
  rift_scanner: 5,
  array_bay: 4,
  research_bay: 15, // Phase 6: Moderate power consumption for research facility
  shipyard: 20, // Phase 7: Higher power for ship construction facility
  power_module: 0, // Power modules don't consume power
  metal_warehouse: 1, // Minimal power for storage management
  crystal_silo: 1, // Minimal power for crystal containment
} as const;

// Module unlock requirements by hub level
export const MODULE_UNLOCK_REQUIREMENTS: Record<string, { hubLevel: number; description: string }> = {
  "drone_hangar": { hubLevel: 1, description: "Available from start" },
  "array_bay": { hubLevel: 1, description: "Available from start" },
  "metal_warehouse": { hubLevel: 1, description: "Available from start" },
  "crystal_silo": { hubLevel: 2, description: "Unlocked at Central Hub Level 2" },
  "research_bay": { hubLevel: 3, description: "Unlocked at Central Hub Level 3" },
  "shipyard": { hubLevel: 5, description: "Unlocked at Central Hub Level 5" },
  // Power modules have tier gating via POWER_MODULE_TIERS
};

// ============================================================================
// RESEARCH TECH TREE (Phase 6.1)
// ============================================================================

export interface ResearchTech {
  id: string;
  name: string;
  category: "mining" | "ship" | "science_lab";
  description: string;
  cost: {
    metal?: number;
    crystals?: number;
    gold?: number;
  };
  duration: number; // seconds
  prerequisites: string[]; // Array of research IDs
  bonuses: {
    miningEfficiency?: number;
    cargoCapacity?: number;
    droneSpeed?: number;
    shieldCapacity?: number;
    weaponDamage?: number;
    hullStrength?: number;
    researchSpeed?: number;
    researchCost?: number;
  };
}

export const RESEARCH_TREE: ResearchTech[] = [
  // ============================================================================
  // MINING CATEGORY (MD-xxx)
  // ============================================================================
  {
    id: "MD-001",
    name: "Mining Efficiency I",
    category: "mining",
    description: "+10% drone harvest rate",
    cost: { metal: 100, gold: 50 },
    duration: 60,
    prerequisites: [],
    bonuses: { miningEfficiency: 0.10 },
  },
  {
    id: "MD-002",
    name: "Mining Efficiency II",
    category: "mining",
    description: "+10% drone harvest rate",
    cost: { metal: 250, gold: 100 },
    duration: 120,
    prerequisites: ["MD-001"],
    bonuses: { miningEfficiency: 0.10 },
  },
  {
    id: "MD-003",
    name: "Cargo Expansion I",
    category: "mining",
    description: "+10% drone cargo capacity",
    cost: { metal: 150, crystals: 30, gold: 75 },
    duration: 90,
    prerequisites: [],
    bonuses: { cargoCapacity: 0.10 },
  },
  {
    id: "MD-004",
    name: "Cargo Expansion II",
    category: "mining",
    description: "+10% drone cargo capacity",
    cost: { metal: 300, crystals: 80, gold: 150 },
    duration: 150,
    prerequisites: ["MD-003"],
    bonuses: { cargoCapacity: 0.10 },
  },
  {
    id: "MD-005",
    name: "Drone Speed I",
    category: "mining",
    description: "+10% drone travel speed",
    cost: { metal: 120, gold: 60 },
    duration: 75,
    prerequisites: [],
    bonuses: { droneSpeed: 0.10 },
  },

  // ============================================================================
  // SHIP CATEGORY (SR-xxx) - for Phase 7
  // ============================================================================
  {
    id: "SR-001",
    name: "Shield Technology I",
    category: "ship",
    description: "+10% ship shield capacity",
    cost: { metal: 200, crystals: 100, gold: 100 },
    duration: 120,
    prerequisites: [],
    bonuses: { shieldCapacity: 0.10 },
  },
  {
    id: "SR-002",
    name: "Weapon Systems I",
    category: "ship",
    description: "+10% weapon damage",
    cost: { metal: 250, crystals: 150, gold: 125 },
    duration: 150,
    prerequisites: [],
    bonuses: { weaponDamage: 0.10 },
  },
  {
    id: "SR-003",
    name: "Hull Reinforcement I",
    category: "ship",
    description: "+10% hull strength",
    cost: { metal: 300, crystals: 100, gold: 150 },
    duration: 180,
    prerequisites: [],
    bonuses: { hullStrength: 0.10 },
  },

  // ============================================================================
  // SCIENCE LAB CATEGORY (SL-xxx)
  // ============================================================================
  {
    id: "SL-001",
    name: "Research Speed I",
    category: "science_lab",
    description: "-10% research time",
    cost: { metal: 150, crystals: 50, gold: 100 },
    duration: 90,
    prerequisites: [],
    bonuses: { researchSpeed: 0.10 },
  },
  {
    id: "SL-002",
    name: "Resource Efficiency I",
    category: "science_lab",
    description: "-10% research costs",
    cost: { metal: 200, crystals: 80, gold: 150 },
    duration: 120,
    prerequisites: [],
    bonuses: { researchCost: 0.10 },
  },
];

// ============================================================================
// SHIP CHASSIS SYSTEM (Phase 7.1)
// ============================================================================

export interface ShipChassis {
  id: string;
  name: string;
  description: string;
  baseStats: {
    maxHull: number;
    maxShields: number;
    weaponDamage: number;
    speed: number;
  };
  cost: {
    metal: number;
    crystals: number;
    gold: number;
  };
  buildTime: number;
}

export const SHIP_CHASSIS: ShipChassis[] = [
  {
    id: "fighter",
    name: "Fighter",
    description: "Fast, agile ship with light armament",
    baseStats: { maxHull: 100, maxShields: 50, weaponDamage: 15, speed: 100 },
    cost: { metal: 150, crystals: 50, gold: 100 },
    buildTime: 60,
  },
  {
    id: "interceptor",
    name: "Interceptor",
    description: "Ultra-fast scout with minimal defenses",
    baseStats: { maxHull: 80, maxShields: 30, weaponDamage: 10, speed: 150 },
    cost: { metal: 100, crystals: 30, gold: 75 },
    buildTime: 45,
  },
  {
    id: "bomber",
    name: "Bomber",
    description: "Heavy weapons platform with weak defenses",
    baseStats: { maxHull: 120, maxShields: 40, weaponDamage: 40, speed: 60 },
    cost: { metal: 250, crystals: 100, gold: 150 },
    buildTime: 90,
  },
  {
    id: "corvette",
    name: "Corvette",
    description: "Balanced light warship",
    baseStats: { maxHull: 200, maxShields: 100, weaponDamage: 20, speed: 80 },
    cost: { metal: 300, crystals: 150, gold: 200 },
    buildTime: 120,
  },
  {
    id: "frigate",
    name: "Frigate",
    description: "Medium warship with strong firepower",
    baseStats: { maxHull: 350, maxShields: 150, weaponDamage: 35, speed: 70 },
    cost: { metal: 500, crystals: 250, gold: 350 },
    buildTime: 180,
  },
  {
    id: "destroyer",
    name: "Destroyer",
    description: "Heavy warship with powerful weapons",
    baseStats: { maxHull: 500, maxShields: 250, weaponDamage: 50, speed: 50 },
    cost: { metal: 800, crystals: 400, gold: 600 },
    buildTime: 240,
  },
  {
    id: "cruiser",
    name: "Cruiser",
    description: "Capital ship with massive firepower",
    baseStats: { maxHull: 800, maxShields: 400, weaponDamage: 70, speed: 40 },
    cost: { metal: 1200, crystals: 600, gold: 900 },
    buildTime: 360,
  },
  {
    id: "battleship",
    name: "Battleship",
    description: "Massive dreadnought with devastating weapons",
    baseStats: { maxHull: 1500, maxShields: 800, weaponDamage: 100, speed: 30 },
    cost: { metal: 2000, crystals: 1000, gold: 1500 },
    buildTime: 600,
  },
  {
    id: "support",
    name: "Support Ship",
    description: "Defensive vessel with strong shields",
    baseStats: { maxHull: 300, maxShields: 300, weaponDamage: 15, speed: 60 },
    cost: { metal: 400, crystals: 200, gold: 300 },
    buildTime: 150,
  },
];

// Resource nodes: asteroid clusters and crystal rifts
export const resourceNodes = pgTable("resource_nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  nodeType: text("node_type").notNull(), // asteroid_cluster, crystal_rift
  nodeName: text("node_name").notNull(),
  // Discovery
  distanceClass: text("distance_class").notNull(), // short, mid, deep
  isDiscovered: boolean("is_discovered").notNull().default(false),
  discoveredAt: timestamp("discovered_at"),
  // Asteroid cluster properties
  totalIron: integer("total_iron"), // Finite pool for asteroids
  remainingIron: integer("remaining_iron"),
  // Crystal rift properties
  stability: real("stability"), // Current stability for rifts
  energyOutput: integer("energy_output"), // Crystal per minute
  maxStability: real("max_stability").default(100),
  richnessCrystalPerTick: integer("richness_crystal_per_tick"), // Crystals extracted per tick
  volatilityModifier: real("volatility_modifier"), // Decay rate multiplier (0.8-1.2)
  collapseAt: timestamp("collapse_at"), // Set when stability reaches 0
  // Depletion
  isDepleted: boolean("is_depleted").notNull().default(false),
  depletedAt: timestamp("depleted_at"),
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_nodes_player_id").on(table.playerId),
  index("idx_nodes_type").on(table.nodeType),
  index("idx_nodes_discovered").on(table.isDiscovered),
]);

// Mining drones and planetary drones
export const drones = pgTable("drones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  droneType: text("drone_type").notNull(), // mining_drone, planetary_drone
  droneName: text("drone_name").notNull(),
  tier: integer("tier").notNull().default(1), // Mk1, Mk2, etc.
  // Stats
  travelSpeed: real("travel_speed").notNull(),
  cargoCapacity: integer("cargo_capacity").notNull(),
  harvestRate: integer("harvest_rate").notNull(), // Resources per minute
  durability: integer("durability").notNull().default(100),
  // Upgrade levels (Phase 3.7)
  speedLevel: integer("speed_level").notNull().default(0),
  cargoLevel: integer("cargo_level").notNull().default(0),
  harvestLevel: integer("harvest_level").notNull().default(0),
  // Ongoing upgrade tracking (Phase 3.7)
  upgradingType: varchar("upgrading_type"), // "speed" | "cargo" | "harvest" | null
  upgradeStartedAt: timestamp("upgrade_started_at"),
  upgradeCompletesAt: timestamp("upgrade_completes_at"),
  // Current state
  status: text("status").notNull().default("idle"), // idle, traveling, mining, returning
  currentMissionId: varchar("current_mission_id"), // No FK to avoid circular reference; managed by application
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_drones_player_id").on(table.playerId),
  index("idx_drones_status").on(table.status),
]);

// Extraction arrays for crystal rifts
export const extractionArrays = pgTable("extraction_arrays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  arrayName: text("array_name").notNull(),
  tier: integer("tier").notNull().default(1),
  // Base stats
  baseExtractionRate: integer("base_extraction_rate").notNull(), // Crystals per tick
  // Upgrade levels (Phase 4.7)
  uplinkLevel: integer("uplink_level").notNull().default(0),
  beamLevel: integer("beam_level").notNull().default(0),
  telemetryLevel: integer("telemetry_level").notNull().default(0),
  // Ongoing upgrade tracking
  upgradingType: varchar("upgrading_type"), // "uplink" | "beam" | "telemetry" | null
  upgradeStartedAt: timestamp("upgrade_started_at"),
  upgradeCompletesAt: timestamp("upgrade_completes_at"),
  // Current state
  status: text("status").notNull().default("idle"), // idle, deployed, decommissioned
  targetRiftId: varchar("target_rift_id").references(() => resourceNodes.id, { onDelete: "set null" }),
  deployedAt: timestamp("deployed_at"),
  totalCrystalsExtracted: integer("total_crystals_extracted").notNull().default(0),
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_arrays_player_id").on(table.playerId),
  index("idx_arrays_status").on(table.status),
]);

// Missions: drone trips and array deployments
export const missions = pgTable("missions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  missionType: text("mission_type").notNull(), // mining_trip, rift_extraction, planetary_scan
  status: text("status").notNull(), // traveling_out, working, traveling_back, completed, failed
  // Associated entities with FK constraints
  droneId: varchar("drone_id").references(() => drones.id, { onDelete: "cascade" }),
  arrayId: varchar("array_id").references(() => extractionArrays.id, { onDelete: "cascade" }),
  targetNodeId: varchar("target_node_id").references(() => resourceNodes.id, { onDelete: "set null" }),
  // Resources
  cargoAmount: integer("cargo_amount").default(0),
  cargoType: text("cargo_type"), // iron, crystal, exotic
  // Timing
  startedAt: timestamp("started_at").notNull().defaultNow(),
  arrivalAt: timestamp("arrival_at"),
  completesAt: timestamp("completes_at"),
  returnAt: timestamp("return_at"),
  completedAt: timestamp("completed_at"),
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_missions_player_id").on(table.playerId),
  index("idx_missions_status").on(table.status),
  index("idx_missions_drone_id").on(table.droneId),
  index("idx_missions_array_id").on(table.arrayId),
]);

// ============================================================================
// RESEARCH SYSTEM (Phase 6)
// ============================================================================

// Research projects being conducted
export const researchProjects = pgTable("research_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  researchId: text("research_id").notNull(), // MD-001, SR-001, SL-001 from data tables
  researchName: text("research_name").notNull(),
  category: text("category").notNull(), // mining, ship, science_lab
  // Progress
  status: text("status").notNull().default("in_progress"), // in_progress, completed, cancelled
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completesAt: timestamp("completes_at").notNull(),
  completedAt: timestamp("completed_at"),
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_research_player_id").on(table.playerId),
  index("idx_research_status").on(table.status),
]);

// Unlocked research (permanent player progress)
export const playerTechUnlocks = pgTable("player_tech_unlocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  researchId: text("research_id").notNull(), // MD-001, SR-001, SL-001
  unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
}, (table) => [
  index("idx_tech_unlocks_player_id").on(table.playerId),
  index("idx_tech_unlocks_research_id").on(table.researchId),
]);

// ============================================================================
// COMBAT SYSTEM (Phase 7-8)
// ============================================================================

// Player's built ships (Phase 7.1: Simplified schema for chassis system)
export const ships = pgTable("ships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  chassisId: varchar("chassis_id").notNull(), // References SHIP_CHASSIS.id
  name: varchar("name"), // Optional custom name
  currentHull: integer("current_hull").notNull(),
  currentShields: integer("current_shields").notNull(),
  fleetRole: varchar("fleet_role"), // "offense", "defense", "reserve"
  isDestroyed: boolean("is_destroyed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ships_player_id").on(table.playerId),
]);

// Ship loadouts: weapons and mods equipped
export const shipLoadouts = pgTable("ship_loadouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shipId: varchar("ship_id").notNull().references(() => ships.id, { onDelete: "cascade" }),
  // Weapons (up to 2: primary + secondary)
  primaryWeapon: text("primary_weapon"), // kinetic, phaser, plasma, torpedo, emp
  secondaryWeapon: text("secondary_weapon"),
  // Mods (up to 2)
  mod1: text("mod_1"), // emp_hardening, plasma_overcharge, etc.
  mod2: text("mod_2"),
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Fleets: ship formations for battle
export const fleets = pgTable("fleets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  fleetName: text("fleet_name").notNull(),
  // Ship positions on 6x4 grid (stored as JSON)
  formation: jsonb("formation").notNull(), // {shipId: {x, y}}
  isActive: boolean("is_active").notNull().default(true),
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_fleets_player_id").on(table.playerId),
]);

// Battle records (Phase 7.5: Simplified battle session data model)
export const battles = pgTable("battles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  status: varchar("status").notNull(), // "in_progress", "victory", "defeat"
  playerFleet: jsonb("player_fleet").notNull(), // Array of ship IDs
  enemyFleet: jsonb("enemy_fleet").notNull(), // Array of enemy ship configs
  battleLog: jsonb("battle_log"), // Array of turn events
  rewards: jsonb("rewards"), // { metal, crystals, gold }
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_battles_player_id").on(table.playerId),
  index("idx_battles_status").on(table.status),
]);

// ============================================================================
// EQUIPMENT SYSTEM (Phase 8)
// ============================================================================

// Equipment catalog items
export const equipment = pgTable("equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  catalogId: varchar("catalog_id").notNull(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(),
  bonusHull: integer("bonus_hull").default(0),
  bonusShields: integer("bonus_shields").default(0),
  bonusDamage: integer("bonus_damage").default(0),
  isEquipped: boolean("is_equipped").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_equipment_player_id").on(table.playerId),
  index("idx_equipment_catalog_id").on(table.catalogId),
]);

// Ship equipment assignments
export const shipEquipment = pgTable("ship_equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shipId: varchar("ship_id").notNull().references(() => ships.id, { onDelete: "cascade" }),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  slot: varchar("slot").notNull(),
  equippedAt: timestamp("equipped_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ship_equipment_ship_id").on(table.shipId),
  index("idx_ship_equipment_equipment_id").on(table.equipmentId),
]);

// Combat missions (boss battles, story missions) - separate from mining missions
export const combatMissions = pgTable("combat_missions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  missionId: varchar("mission_id").notNull(),
  missionType: varchar("mission_type").notNull(),
  difficulty: varchar("difficulty").notNull(),
  status: varchar("status").notNull(),
  rewards: jsonb("rewards"),
  battleId: varchar("battle_id").references(() => battles.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_combat_missions_player_id").on(table.playerId),
  index("idx_combat_missions_status").on(table.status),
]);

// Equipment catalog configuration
export interface EquipmentCatalogItem {
  id: string;
  name: string;
  type: "weapon" | "shield_booster" | "hull_plating";
  bonusHull?: number;
  bonusShields?: number;
  bonusDamage?: number;
  cost: { metal: number; crystals: number; gold: number };
}

export const EQUIPMENT_CATALOG: EquipmentCatalogItem[] = [
  {
    id: "plasma_cannon",
    name: "Plasma Cannon",
    type: "weapon",
    bonusDamage: 20,
    cost: { metal: 300, crystals: 150, gold: 200 },
  },
  {
    id: "laser_array",
    name: "Laser Array",
    type: "weapon",
    bonusDamage: 35,
    cost: { metal: 600, crystals: 300, gold: 400 },
  },
  {
    id: "shield_amplifier",
    name: "Shield Amplifier",
    type: "shield_booster",
    bonusShields: 100,
    cost: { metal: 400, crystals: 200, gold: 300 },
  },
  {
    id: "reinforced_plating",
    name: "Reinforced Hull Plating",
    type: "hull_plating",
    bonusHull: 150,
    cost: { metal: 500, crystals: 100, gold: 250 },
  },
];

// Boss encounter configuration
export interface BossEncounter {
  id: string;
  name: string;
  description: string;
  difficulty: "boss";
  fleet: Array<{
    chassisId: string;
    maxHull: number;
    maxShields: number;
    weaponDamage: number;
  }>;
  rewards: { metal: number; crystals: number; gold: number };
}

export const BOSS_ENCOUNTERS: BossEncounter[] = [
  {
    id: "pirate_lord",
    name: "Pirate Lord Invasion",
    description: "Defeat the notorious Pirate Lord and his fleet",
    difficulty: "boss",
    fleet: [
      { chassisId: "battleship", maxHull: 2000, maxShields: 1000, weaponDamage: 120 },
      { chassisId: "cruiser", maxHull: 1200, maxShields: 600, weaponDamage: 90 },
      { chassisId: "destroyer", maxHull: 800, maxShields: 400, weaponDamage: 70 },
    ],
    rewards: { metal: 2000, crystals: 1000, gold: 1500 },
  },
  {
    id: "alien_armada",
    name: "Alien Armada",
    description: "Survive the alien invasion force",
    difficulty: "boss",
    fleet: [
      { chassisId: "battleship", maxHull: 3000, maxShields: 1500, weaponDamage: 150 },
      { chassisId: "battleship", maxHull: 3000, maxShields: 1500, weaponDamage: 150 },
      { chassisId: "cruiser", maxHull: 1500, maxShields: 750, weaponDamage: 100 },
    ],
    rewards: { metal: 5000, crystals: 2500, gold: 3000 },
  },
];

// ============================================================================
// ENDGAME SYSTEMS (Phase 9)
// ============================================================================

// Guild memberships (future multiplayer)
export const guildMembers = pgTable("guild_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  guildName: text("guild_name").notNull(),
  guildRole: text("guild_role").notNull().default("member"), // member, officer, leader
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const insertPlayerSchema = createInsertSchema(players).omit({
  createdAt: true,
  lastUpdatedAt: true,
});

export const insertBuildingSchema = createInsertSchema(buildings).omit({
  id: true,
  createdAt: true,
}).extend({
  buildStartedAt: z.union([z.date(), z.string()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ).optional(),
  lastCollectedAt: z.union([z.date(), z.string()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ).optional(),
});

export const updatePlayerSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  gold: z.number().optional(),
  metal: z.number().optional(),
  crystals: z.number().optional(),
  exotic: z.number().optional(),
  maxMetal: z.number().optional(),
  maxCrystals: z.number().optional(),
  maxExotic: z.number().optional(),
  powerGeneration: z.number().optional(),
  powerConsumption: z.number().optional(),
  maxDrones: z.number().optional(),
  maxPlanetaryDrones: z.number().optional(),
  maxExtractionArrays: z.number().optional(),
  tutorialStep: z.string().optional(),
  hubLevel: z.number().optional(),
  lastUpdatedAt: z.date().optional(),
});

export const updateBuildingSchema = z.object({
  id: z.string(),
  currentStorage: z.number().optional(),
  isBuilt: z.boolean().optional(),
  isBuilding: z.boolean().optional(),
  level: z.number().optional(),
  lastCollectedAt: z.union([z.date(), z.string()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ).optional(),
});

export const insertStationModuleSchema = createInsertSchema(stationModules).omit({
  id: true,
  createdAt: true,
});

export const insertResourceNodeSchema = createInsertSchema(resourceNodes).omit({
  id: true,
  createdAt: true,
});

export const insertDroneSchema = createInsertSchema(drones).omit({
  id: true,
  createdAt: true,
});

export const insertMissionSchema = createInsertSchema(missions).omit({
  id: true,
  createdAt: true,
});

export const insertExtractionArraySchema = createInsertSchema(extractionArrays).omit({
  id: true,
  createdAt: true,
});

export const insertResearchProjectSchema = createInsertSchema(researchProjects).omit({
  id: true,
  createdAt: true,
});

export const shipSchema = createSelectSchema(ships);
export const insertShipSchema = createInsertSchema(ships).omit({
  id: true,
  createdAt: true,
});

export const battleSchema = createSelectSchema(battles);
export const insertBattleSchema = createInsertSchema(battles).omit({
  id: true,
  startedAt: true,
});

export const equipmentSchema = createSelectSchema(equipment);
export const insertEquipmentSchema = createInsertSchema(equipment).omit({
  id: true,
  createdAt: true,
});

export const shipEquipmentSchema = createSelectSchema(shipEquipment);
export const insertShipEquipmentSchema = createInsertSchema(shipEquipment).omit({
  id: true,
  equippedAt: true,
});

export const combatMissionSchema = createSelectSchema(combatMissions);
export const insertCombatMissionSchema = createInsertSchema(combatMissions).omit({
  id: true,
  startedAt: true,
});

// Research tech validation schema
export const researchTechSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["mining", "ship", "science_lab"]),
  description: z.string(),
  cost: z.object({
    metal: z.number().min(0).optional(),
    crystals: z.number().min(0).optional(),
    gold: z.number().min(0).optional(),
  }),
  duration: z.number().min(1),
  prerequisites: z.array(z.string()),
  bonuses: z.object({
    miningEfficiency: z.number().min(0).max(1).optional(),
    cargoCapacity: z.number().min(0).max(1).optional(),
    droneSpeed: z.number().min(0).max(1).optional(),
    shieldCapacity: z.number().min(0).max(1).optional(),
    weaponDamage: z.number().min(0).max(1).optional(),
    hullStrength: z.number().min(0).max(1).optional(),
    researchSpeed: z.number().min(0).max(1).optional(),
    researchCost: z.number().min(0).max(1).optional(),
  }),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;
export type InsertBuilding = z.infer<typeof insertBuildingSchema>;
export type Building = typeof buildings.$inferSelect;
export type StationModule = typeof stationModules.$inferSelect;
export type InsertStationModule = z.infer<typeof insertStationModuleSchema>;
export type ResourceNode = typeof resourceNodes.$inferSelect;
export type InsertResourceNode = z.infer<typeof insertResourceNodeSchema>;
export type Drone = typeof drones.$inferSelect;
export type InsertDrone = z.infer<typeof insertDroneSchema>;
export type ExtractionArray = typeof extractionArrays.$inferSelect;
export type InsertExtractionArray = z.infer<typeof insertExtractionArraySchema>;
export type Mission = typeof missions.$inferSelect;
export type InsertMission = z.infer<typeof insertMissionSchema>;
export type ResearchProject = typeof researchProjects.$inferSelect;
export type InsertResearchProject = z.infer<typeof insertResearchProjectSchema>;
export type PlayerTechUnlock = typeof playerTechUnlocks.$inferSelect;
export type Ship = typeof ships.$inferSelect;
export type InsertShip = z.infer<typeof insertShipSchema>;
export type ShipLoadout = typeof shipLoadouts.$inferSelect;
export type Fleet = typeof fleets.$inferSelect;
export type Battle = typeof battles.$inferSelect;
export type InsertBattle = z.infer<typeof insertBattleSchema>;
export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type ShipEquipment = typeof shipEquipment.$inferSelect;
export type InsertShipEquipment = z.infer<typeof insertShipEquipmentSchema>;
export type CombatMission = typeof combatMissions.$inferSelect;
export type InsertCombatMission = z.infer<typeof insertCombatMissionSchema>;
export type GuildMember = typeof guildMembers.$inferSelect;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Ship stats interface for calculated ship statistics
export interface ShipStats {
  maxHull: number;
  maxShields: number;
  weaponDamage: number;
  speed: number;
}

// Helper to calculate effective ship stats with research bonuses applied
export function calculateShipStats(
  chassisId: string,
  bonuses: {
    hullStrength: number;
    shieldCapacity: number;
    weaponDamage: number;
  }
): ShipStats {
  const chassis = SHIP_CHASSIS.find(c => c.id === chassisId);
  if (!chassis) throw new Error(`Invalid chassis: ${chassisId}`);
  
  return {
    maxHull: Math.floor(chassis.baseStats.maxHull * bonuses.hullStrength),
    maxShields: Math.floor(chassis.baseStats.maxShields * bonuses.shieldCapacity),
    weaponDamage: Math.floor(chassis.baseStats.weaponDamage * bonuses.weaponDamage),
    speed: chassis.baseStats.speed, // Speed not affected by bonuses (for now)
  };
}

// Helper to calculate effective drone stats with upgrades applied
export function getEffectiveDroneStats(drone: Drone) {
  const baseTier = droneTiers.find(t => t.id === drone.tier);
  if (!baseTier) {
    return {
      speed: drone.travelSpeed,
      cargoCapacity: drone.cargoCapacity,
      harvestRate: drone.harvestRate,
    };
  }
  
  return {
    speed: baseTier.speed * (1 + drone.speedLevel * DRONE_UPGRADE_CONFIG.bonusPerLevel),
    cargoCapacity: baseTier.cargoCapacity * (1 + drone.cargoLevel * DRONE_UPGRADE_CONFIG.bonusPerLevel),
    harvestRate: baseTier.harvestRate * (1 + drone.harvestLevel * DRONE_UPGRADE_CONFIG.bonusPerLevel),
  };
}

// Helper to calculate effective extraction array stats with upgrades applied
export function getEffectiveArrayStats(array: ExtractionArray) {
  const baseTier = ARRAY_TIERS.find(t => t.id === array.tier);
  if (!baseTier) {
    return {
      extractionRate: array.baseExtractionRate,
      stabilityReduction: 1.0, // no reduction
    };
  }
  
  // Uplink increases extraction rate
  const extractionRate = baseTier.baseExtraction * (1 + array.uplinkLevel * ARRAY_UPGRADE_CONFIG.bonusPerLevel);
  
  // Beam reduces stability decay (higher level = less decay)
  const stabilityReduction = 1.0 - (array.beamLevel * ARRAY_UPGRADE_CONFIG.bonusPerLevel * 0.5);
  
  return {
    extractionRate: Math.round(extractionRate),
    stabilityReduction: Math.max(0.5, stabilityReduction), // Min 50% reduction
  };
}
