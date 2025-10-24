import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { 
  users, 
  players, 
  buildings,
  resourceNodes,
  drones,
  missions,
  type User, 
  type UpsertUser,
  type Player,
  type InsertPlayer,
  type Building,
  type InsertBuilding,
  type ResourceNode,
  type InsertResourceNode,
  type Drone,
  type InsertDrone,
  type Mission,
  type InsertMission
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

  // Resource node operations
  getPlayerResourceNodes(playerId: string): Promise<ResourceNode[]>;
  createResourceNode(node: InsertResourceNode): Promise<ResourceNode>;
  updateResourceNode(id: string, updates: Partial<ResourceNode>): Promise<ResourceNode>;
  getResourceNode(id: string): Promise<ResourceNode | undefined>;

  // Drone operations
  getPlayerDrones(playerId: string): Promise<Drone[]>;
  createDrone(drone: InsertDrone): Promise<Drone>;
  updateDrone(id: string, updates: Partial<Drone>): Promise<Drone>;
  getDrone(id: string): Promise<Drone | undefined>;

  // Mission operations
  getPlayerMissions(playerId: string): Promise<Mission[]>;
  createMission(mission: InsertMission): Promise<Mission>;
  updateMission(id: string, updates: Partial<Mission>): Promise<Mission>;
  getMission(id: string): Promise<Mission | undefined>;
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

  // Resource node operations
  async getPlayerResourceNodes(playerId: string): Promise<ResourceNode[]> {
    return await db.select().from(resourceNodes).where(eq(resourceNodes.playerId, playerId));
  }

  async createResourceNode(nodeData: InsertResourceNode): Promise<ResourceNode> {
    const [node] = await db.insert(resourceNodes).values(nodeData).returning();
    return node;
  }

  async updateResourceNode(id: string, updates: Partial<ResourceNode>): Promise<ResourceNode> {
    const [node] = await db
      .update(resourceNodes)
      .set(updates)
      .where(eq(resourceNodes.id, id))
      .returning();
    return node;
  }

  async getResourceNode(id: string): Promise<ResourceNode | undefined> {
    const [node] = await db.select().from(resourceNodes).where(eq(resourceNodes.id, id));
    return node;
  }

  // Drone operations
  async getPlayerDrones(playerId: string): Promise<Drone[]> {
    return await db.select().from(drones).where(eq(drones.playerId, playerId));
  }

  async createDrone(droneData: InsertDrone): Promise<Drone> {
    const [drone] = await db.insert(drones).values(droneData).returning();
    return drone;
  }

  async updateDrone(id: string, updates: Partial<Drone>): Promise<Drone> {
    const [drone] = await db
      .update(drones)
      .set(updates)
      .where(eq(drones.id, id))
      .returning();
    return drone;
  }

  async getDrone(id: string): Promise<Drone | undefined> {
    const [drone] = await db.select().from(drones).where(eq(drones.id, id));
    return drone;
  }

  // Mission operations
  async getPlayerMissions(playerId: string): Promise<Mission[]> {
    return await db.select().from(missions).where(eq(missions.playerId, playerId));
  }

  async createMission(missionData: InsertMission): Promise<Mission> {
    const [mission] = await db.insert(missions).values(missionData).returning();
    return mission;
  }

  async updateMission(id: string, updates: Partial<Mission>): Promise<Mission> {
    const [mission] = await db
      .update(missions)
      .set(updates)
      .where(eq(missions.id, id))
      .returning();
    return mission;
  }

  async getMission(id: string): Promise<Mission | undefined> {
    const [mission] = await db.select().from(missions).where(eq(missions.id, id));
    return mission;
  }
}

export const storage = new DatabaseStorage();
