import { db } from "./db";
import { eq, and, ne, gte, sql, isNull } from "drizzle-orm";
import { 
  users, 
  players, 
  buildings,
  resourceNodes,
  drones,
  missions,
  extractionArrays,
  DRONE_UPGRADE_CONFIG,
  ARRAY_UPGRADE_CONFIG,
  ARRAY_TIERS,
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
  type InsertMission,
  type ExtractionArray,
  type InsertExtractionArray
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
  atomicNodeDecrement(nodeId: string, amount: number): Promise<number>;

  // Drone operations
  getPlayerDrones(playerId: string): Promise<Drone[]>;
  createDrone(drone: InsertDrone): Promise<Drone>;
  updateDrone(id: string, updates: Partial<Drone>): Promise<Drone>;
  getDrone(id: string): Promise<Drone | undefined>;
  upgradeDrone(droneId: string, upgradeType: "speed" | "cargo" | "harvest"): Promise<void>;
  completeDroneUpgrade(droneId: string): Promise<void>;

  // Mission operations
  getPlayerMissions(playerId: string): Promise<Mission[]>;
  getAllActiveMissions(): Promise<Mission[]>;
  createMission(mission: InsertMission): Promise<Mission>;
  updateMission(id: string, updates: Partial<Mission>): Promise<Mission>;
  getMission(id: string): Promise<Mission | undefined>;
  atomicMissionStatusUpdate(
    id: string,
    fromStatus: string,
    toStatus: string,
    additionalUpdates?: Partial<Mission>
  ): Promise<Mission | null>;
  atomicCompleteMission(
    missionId: string,
    fromStatus: string,
    playerId: string,
    nodeId: string,
    droneId: string,
    desiredIron: number
  ): Promise<{ success: boolean; ironCollected: number }>;

  // Extraction array operations
  getPlayerExtractionArrays(playerId: string): Promise<ExtractionArray[]>;
  createExtractionArray(array: InsertExtractionArray): Promise<ExtractionArray>;
  updateExtractionArray(id: string, updates: Partial<ExtractionArray>): Promise<ExtractionArray>;
  getExtractionArray(id: string): Promise<ExtractionArray | undefined>;
  upgradeArray(arrayId: string, upgradeType: "uplink" | "beam" | "telemetry"): Promise<void>;
  completeArrayUpgrade(arrayId: string): Promise<void>;
  getAllActiveRifts(): Promise<ResourceNode[]>;
  getAllDeployedArrays(): Promise<ExtractionArray[]>;
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

  async atomicNodeDecrement(nodeId: string, amount: number): Promise<number> {
    const result = await db.execute(sql`
      WITH old_value AS (
        SELECT COALESCE(remaining_iron, 0) as remaining_iron FROM resource_nodes WHERE id = ${nodeId}
      )
      UPDATE resource_nodes
      SET remaining_iron = GREATEST(0, COALESCE(remaining_iron, 0) - ${amount})
      WHERE id = ${nodeId}
      RETURNING 
        remaining_iron,
        (SELECT LEAST(remaining_iron, ${amount}) FROM old_value) as actual_decrement
    `);
    
    if (result.rows.length === 0) {
      return 0;
    }
    
    return Number(result.rows[0].actual_decrement);
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

  async upgradeDrone(droneId: string, upgradeType: "speed" | "cargo" | "harvest"): Promise<void> {
    return await db.transaction(async (tx) => {
      // Get drone with lock
      const [drone] = await tx
        .select()
        .from(drones)
        .where(eq(drones.id, droneId))
        .for('update');

      if (!drone) {
        throw new Error('Drone not found');
      }

      // Check drone is idle and not already upgrading
      if (drone.status !== 'idle') {
        throw new Error('Drone must be idle to upgrade');
      }
      if (drone.upgradingType) {
        throw new Error('Drone is already upgrading');
      }

      // Get current level for this upgrade type
      const levelField = `${upgradeType}Level` as keyof Drone;
      const currentLevel = drone[levelField] as number;

      // Check max level
      const maxLevel = DRONE_UPGRADE_CONFIG.maxLevelPerTier[drone.tier];
      if (currentLevel >= maxLevel) {
        throw new Error(`Upgrade already at max level (${maxLevel}) for this drone tier`);
      }

      // Calculate cost
      const baseCost = DRONE_UPGRADE_CONFIG.baseCosts[upgradeType];
      const multiplier = Math.pow(DRONE_UPGRADE_CONFIG.costMultiplier, currentLevel);
      const cost = {
        metal: Math.floor(baseCost.metal * multiplier),
        credits: Math.floor(baseCost.credits * multiplier),
      };

      // Get player and check resources
      const [player] = await tx
        .select()
        .from(players)
        .where(eq(players.id, drone.playerId));

      if (!player) {
        throw new Error('Player not found');
      }

      if (player.metal < cost.metal || player.credits < cost.credits) {
        throw new Error(`Insufficient resources. Need ${cost.metal} metal and ${cost.credits} credits`);
      }

      // Deduct resources
      await tx
        .update(players)
        .set({
          metal: player.metal - cost.metal,
          credits: player.credits - cost.credits,
          lastUpdatedAt: new Date(),
        })
        .where(eq(players.id, drone.playerId));

      // Set upgrading fields
      const now = new Date();
      const completesAt = new Date(now.getTime() + DRONE_UPGRADE_CONFIG.upgradeDuration * 1000);

      await tx
        .update(drones)
        .set({
          upgradingType: upgradeType,
          upgradeStartedAt: now,
          upgradeCompletesAt: completesAt,
        })
        .where(eq(drones.id, droneId));
    });
  }

  async completeDroneUpgrade(droneId: string): Promise<void> {
    const drone = await this.getDrone(droneId);
    if (!drone || !drone.upgradingType) {
      return;
    }

    // Determine which level to increment
    const upgradeType = drone.upgradingType;
    const updates: Partial<Drone> = {
      upgradingType: null,
      upgradeStartedAt: null,
      upgradeCompletesAt: null,
    };

    if (upgradeType === 'speed') {
      updates.speedLevel = drone.speedLevel + 1;
    } else if (upgradeType === 'cargo') {
      updates.cargoLevel = drone.cargoLevel + 1;
    } else if (upgradeType === 'harvest') {
      updates.harvestLevel = drone.harvestLevel + 1;
    }

    await this.updateDrone(droneId, updates);
  }

  // Mission operations
  async getPlayerMissions(playerId: string): Promise<Mission[]> {
    return await db.select().from(missions).where(eq(missions.playerId, playerId));
  }

  async getAllActiveMissions(): Promise<Mission[]> {
    return await db.select().from(missions).where(
      and(
        ne(missions.status, "completed"),
        ne(missions.status, "cancelled")
      )
    );
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

  async atomicMissionStatusUpdate(
    id: string,
    fromStatus: string,
    toStatus: string,
    additionalUpdates?: Partial<Mission>
  ): Promise<Mission | null> {
    const [mission] = await db
      .update(missions)
      .set({ 
        status: toStatus,
        ...additionalUpdates 
      })
      .where(
        and(
          eq(missions.id, id),
          eq(missions.status, fromStatus)
        )
      )
      .returning();
    
    return mission || null;
  }

  async atomicCompleteMission(
    missionId: string,
    fromStatus: string,
    playerId: string,
    nodeId: string,
    droneId: string,
    desiredIron: number
  ): Promise<{ success: boolean; ironCollected: number }> {
    return await db.transaction(async (tx) => {
      // Lock mission row early with SELECT ... FOR UPDATE
      const lockResult = await tx.execute(sql`
        SELECT * FROM missions WHERE id = ${missionId} FOR UPDATE
      `);

      if (lockResult.rows.length === 0) {
        throw new Error('Mission not found');
      }

      const mission = lockResult.rows[0] as any;

      // Check status and throw if wrong (this triggers rollback)
      if (mission.status !== fromStatus) {
        throw new Error('Mission already completed or invalid status');
      }

      // Do node decrement
      const nodeDecrement = await tx.execute(sql`
        WITH old_value AS (
          SELECT COALESCE(remaining_iron, 0) as remaining_iron FROM resource_nodes WHERE id = ${nodeId}
        )
        UPDATE resource_nodes
        SET remaining_iron = GREATEST(0, COALESCE(remaining_iron, 0) - ${desiredIron})
        WHERE id = ${nodeId}
        RETURNING 
          remaining_iron,
          (SELECT LEAST(remaining_iron, ${desiredIron}) FROM old_value) as actual_decrement
      `);

      const actualIronCollected = nodeDecrement.rows.length > 0 
        ? Number(nodeDecrement.rows[0].actual_decrement) 
        : 0;

      // Credit player
      if (actualIronCollected > 0) {
        const [player] = await tx
          .select()
          .from(players)
          .where(eq(players.id, playerId));

        if (player) {
          await tx
            .update(players)
            .set({
              metal: player.metal + actualIronCollected,
              lastUpdatedAt: new Date(),
            })
            .where(eq(players.id, playerId));
        }
      }

      // Update drone
      await tx
        .update(drones)
        .set({ status: "idle" })
        .where(eq(drones.id, droneId));

      // Guarded UPDATE with status check
      const [updatedMission] = await tx
        .update(missions)
        .set({
          status: "completed",
          cargoAmount: actualIronCollected,
          completedAt: new Date(),
        })
        .where(
          and(
            eq(missions.id, missionId),
            eq(missions.status, fromStatus)
          )
        )
        .returning();

      // If UPDATE affects 0 rows, THROW an error to trigger rollback
      if (!updatedMission) {
        throw new Error('Mission status changed during transaction');
      }

      // Only return success if UPDATE succeeded
      return { success: true, ironCollected: actualIronCollected };
    });
  }

  // Extraction array operations
  async getPlayerExtractionArrays(playerId: string): Promise<ExtractionArray[]> {
    return await db.select().from(extractionArrays).where(eq(extractionArrays.playerId, playerId));
  }

  async createExtractionArray(arrayData: InsertExtractionArray): Promise<ExtractionArray> {
    const [array] = await db.insert(extractionArrays).values(arrayData).returning();
    return array;
  }

  async updateExtractionArray(id: string, updates: Partial<ExtractionArray>): Promise<ExtractionArray> {
    const [array] = await db
      .update(extractionArrays)
      .set(updates)
      .where(eq(extractionArrays.id, id))
      .returning();
    return array;
  }

  async getExtractionArray(id: string): Promise<ExtractionArray | undefined> {
    const [array] = await db.select().from(extractionArrays).where(eq(extractionArrays.id, id));
    return array;
  }

  async upgradeArray(arrayId: string, upgradeType: "uplink" | "beam" | "telemetry"): Promise<void> {
    return await db.transaction(async (tx) => {
      // Get array with lock
      const [array] = await tx
        .select()
        .from(extractionArrays)
        .where(eq(extractionArrays.id, arrayId))
        .for('update');

      if (!array) {
        throw new Error('Array not found');
      }

      // Check array is idle and not already upgrading
      if (array.status !== 'idle') {
        throw new Error('Array must be recalled before upgrading');
      }

      if (array.upgradingType) {
        throw new Error('Array is already upgrading');
      }

      // Check upgrade level limits
      const currentLevel = 
        upgradeType === 'uplink' ? array.uplinkLevel :
        upgradeType === 'beam' ? array.beamLevel :
        array.telemetryLevel;

      const maxLevel = ARRAY_UPGRADE_CONFIG.maxLevelPerTier[array.tier as 1 | 2 | 3];
      
      if (currentLevel >= maxLevel) {
        throw new Error(`Array ${upgradeType} already at max level for tier ${array.tier}`);
      }

      // Calculate cost
      const baseCost = ARRAY_UPGRADE_CONFIG.baseCosts[upgradeType];
      const costMultiplier = Math.pow(ARRAY_UPGRADE_CONFIG.costMultiplier, currentLevel);
      const metalCost = Math.round(baseCost.metal * costMultiplier);
      const creditsCost = Math.round(baseCost.credits * costMultiplier);

      // Get player
      const [player] = await tx
        .select()
        .from(players)
        .where(eq(players.id, array.playerId));

      if (!player) {
        throw new Error('Player not found');
      }

      // Check resources
      if (player.metal < metalCost || player.credits < creditsCost) {
        throw new Error('Insufficient resources');
      }

      // Deduct resources
      await tx
        .update(players)
        .set({
          metal: player.metal - metalCost,
          credits: player.credits - creditsCost,
          lastUpdatedAt: new Date(),
        })
        .where(eq(players.id, array.playerId));

      // Set upgrade
      const upgradeCompletesAt = new Date(Date.now() + ARRAY_UPGRADE_CONFIG.upgradeDuration * 1000);

      await tx
        .update(extractionArrays)
        .set({
          upgradingType: upgradeType,
          upgradeStartedAt: new Date(),
          upgradeCompletesAt,
        })
        .where(eq(extractionArrays.id, arrayId));
    });
  }

  async completeArrayUpgrade(arrayId: string): Promise<void> {
    const [array] = await db
      .select()
      .from(extractionArrays)
      .where(eq(extractionArrays.id, arrayId));

    if (!array || !array.upgradingType) {
      return;
    }

    const updates: Partial<ExtractionArray> = {
      upgradingType: null,
      upgradeStartedAt: null,
      upgradeCompletesAt: null,
    };

    // Increment appropriate level
    if (array.upgradingType === 'uplink') {
      updates.uplinkLevel = array.uplinkLevel + 1;
    } else if (array.upgradingType === 'beam') {
      updates.beamLevel = array.beamLevel + 1;
    } else if (array.upgradingType === 'telemetry') {
      updates.telemetryLevel = array.telemetryLevel + 1;
    }

    await db
      .update(extractionArrays)
      .set(updates)
      .where(eq(extractionArrays.id, arrayId));
  }

  async getAllActiveRifts(): Promise<ResourceNode[]> {
    return await db
      .select()
      .from(resourceNodes)
      .where(
        and(
          eq(resourceNodes.nodeType, 'crystal_rift'),
          isNull(resourceNodes.collapseAt)
        )
      );
  }

  async getAllDeployedArrays(): Promise<ExtractionArray[]> {
    return await db
      .select()
      .from(extractionArrays)
      .where(eq(extractionArrays.status, 'deployed'));
  }
}

export const storage = new DatabaseStorage();
