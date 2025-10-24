import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, real, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
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

// Game-specific player data (references auth users)
export const players = pgTable("players", {
  id: varchar("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  credits: integer("credits").notNull().default(100),
  metal: integer("metal").notNull().default(50),
  crystals: integer("crystals").notNull().default(0),
  tutorialStep: text("tutorial_step").notNull().default("welcome"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUpdatedAt: timestamp("last_updated_at").notNull().defaultNow(),
});

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
  currentStorage: real("current_storage").default(0),
  maxStorage: integer("max_storage"),
  productionRate: integer("production_rate"),
  resourceType: text("resource_type"),
  buildStartedAt: timestamp("build_started_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastCollectedAt: timestamp("last_collected_at"),
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  createdAt: true,
  lastUpdatedAt: true,
});

export const insertBuildingSchema = createInsertSchema(buildings).omit({
  id: true,
  createdAt: true,
});

export const updatePlayerSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  credits: z.number().optional(),
  metal: z.number().optional(),
  crystals: z.number().optional(),
  tutorialStep: z.string().optional(),
  lastUpdatedAt: z.date().optional(),
});

export const updateBuildingSchema = z.object({
  id: z.string(),
  currentStorage: z.number().optional(),
  isBuilt: z.boolean().optional(),
  isBuilding: z.boolean().optional(),
  level: z.number().optional(),
  lastCollectedAt: z.date().optional(),
});

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;
export type InsertBuilding = z.infer<typeof insertBuildingSchema>;
export type Building = typeof buildings.$inferSelect;
