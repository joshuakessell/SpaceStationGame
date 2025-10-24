import { db } from "./db";
import { eq } from "drizzle-orm";
import { 
  users, 
  players, 
  buildings,
  type User, 
  type UpsertUser,
  type Player,
  type InsertPlayer,
  type Building,
  type InsertBuilding
} from "@shared/schema";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Player operations
  getPlayer(id: string): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: string, updates: Partial<Player>): Promise<Player>;
  
  // Building operations
  getPlayerBuildings(playerId: string): Promise<Building[]>;
  createBuilding(building: InsertBuilding): Promise<Building>;
  updateBuilding(id: string, updates: Partial<Building>): Promise<Building>;
  deleteBuilding(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Player operations
  async getPlayer(id: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async createPlayer(playerData: InsertPlayer): Promise<Player> {
    const [player] = await db.insert(players).values(playerData).returning();
    return player;
  }

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player> {
    const [player] = await db
      .update(players)
      .set({ ...updates, lastUpdatedAt: new Date() })
      .where(eq(players.id, id))
      .returning();
    return player;
  }

  // Building operations
  async getPlayerBuildings(playerId: string): Promise<Building[]> {
    return await db.select().from(buildings).where(eq(buildings.playerId, playerId));
  }

  async createBuilding(buildingData: InsertBuilding): Promise<Building> {
    const [building] = await db.insert(buildings).values(buildingData).returning();
    return building;
  }

  async updateBuilding(id: string, updates: Partial<Building>): Promise<Building> {
    const [building] = await db
      .update(buildings)
      .set(updates)
      .where(eq(buildings.id, id))
      .returning();
    return building;
  }

  async deleteBuilding(id: string): Promise<void> {
    await db.delete(buildings).where(eq(buildings.id, id));
  }
}

export const storage = new DatabaseStorage();
