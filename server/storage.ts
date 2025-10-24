import { db } from "./db";
import { eq, and, ne, gte, sql, isNull } from "drizzle-orm";
import { 
  users, 
  players, 
  buildings,
  stationModules,
  resourceNodes,
  drones,
  missions,
  extractionArrays,
  researchProjects,
  playerTechUnlocks,
  ships,
  battles,
  equipment,
  shipEquipment,
  combatMissions,
  DRONE_UPGRADE_CONFIG,
  ARRAY_UPGRADE_CONFIG,
  ARRAY_TIERS,
  POWER_MODULE_TIERS,
  CENTRAL_HUB_CONFIG,
  BUILDING_POWER_COSTS,
  MODULE_UNLOCK_REQUIREMENTS,
  RESEARCH_TREE,
  SHIP_CHASSIS,
  EQUIPMENT_CATALOG,
  BOSS_ENCOUNTERS,
  calculateShipStats,
  type User, 
  type UpsertUser,
  type Player,
  type InsertPlayer,
  type Building,
  type InsertBuilding,
  type StationModule,
  type InsertStationModule,
  type ResourceNode,
  type InsertResourceNode,
  type Drone,
  type InsertDrone,
  type Mission,
  type InsertMission,
  type ExtractionArray,
  type InsertExtractionArray,
  type ResearchProject,
  type InsertResearchProject,
  type PlayerTechUnlock,
  type Ship,
  type Battle,
  type InsertBattle,
  type Equipment,
  type InsertEquipment,
  type ShipEquipment,
  type CombatMission
} from "@shared/schema";
import { calculateResearchBonuses, type ResearchBonuses } from "./bonus-system";
import { simulateBattle, generateAIFleet, type AIFleetConfig } from "./combat-engine";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Player operations
  getPlayer(id: string): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: string, updates: Partial<Player>): Promise<Player>;
  deletePlayer(id: string): Promise<void>;
  
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

  // Power system operations (Phase 5)
  upgradeCentralHub(playerId: string, targetLevel: number): Promise<void>;
  calculatePowerBudget(playerId: string): Promise<{ generation: number; consumption: number; available: number }>;
  enforcePowerLimits(playerId: string): Promise<void>;

  // Station module operations (Phase 6)
  getPlayerStationModules(playerId: string): Promise<StationModule[]>;
  buildStationModule(playerId: string, moduleData: Partial<InsertStationModule>): Promise<StationModule>;

  // Research operations (Phase 6.3)
  startResearch(playerId: string, researchId: string): Promise<ResearchProject>;
  cancelResearch(playerId: string, projectId: string): Promise<void>;
  getActiveResearch(playerId: string): Promise<ResearchProject | null>;
  getResearchHistory(playerId: string): Promise<ResearchProject[]>;
  getPlayerTechUnlocks(playerId: string): Promise<PlayerTechUnlock[]>;
  checkResearchPrerequisites(playerId: string, researchId: string): Promise<boolean>;
  
  // Bonus system (Phase 6.5)
  getPlayerResearchBonuses(playerId: string): Promise<ResearchBonuses>;

  // Ship construction and management (Phase 7.3)
  startShipConstruction(playerId: string, chassisId: string, customName?: string): Promise<Ship>;
  getPlayerShips(playerId: string): Promise<Ship[]>;
  getShipById(shipId: string): Promise<Ship | null>;
  updateShipDamage(shipId: string, newHull: number, newShields: number): Promise<void>;
  destroyShip(shipId: string): Promise<void>;

  // Fleet assignment management (Phase 7.4)
  assignShipToFleet(shipId: string, fleetRole: "offense" | "defense" | "reserve"): Promise<void>;
  getFleetComposition(playerId: string): Promise<{
    offense: Ship[];
    defense: Ship[];
    reserve: Ship[];
  }>;

  // Battle session data model (Phase 7.5)
  createBattle(playerId: string, playerFleet: string[], enemyFleet: any[]): Promise<Battle>;
  updateBattleResult(battleId: string, status: string, battleLog: any[], rewards: any): Promise<void>;
  getBattleById(battleId: string): Promise<Battle | null>;
  getPlayerBattles(playerId: string): Promise<Battle[]>;

  // Battle initiation workflow (Phase 7.8)
  startBattle(playerId: string, difficulty: "easy" | "medium" | "hard"): Promise<Battle>;

  // Equipment system (Phase 8)
  craftEquipment(playerId: string, catalogId: string): Promise<void>;
  equipItem(shipId: string, equipmentId: string, slot: string): Promise<void>;
  getShipEquipment(shipId: string): Promise<any[]>;
  getPlayerEquipment(playerId: string): Promise<any[]>;

  // Combat missions (Phase 8+9)
  startCombatMission(playerId: string, bossId: string): Promise<Battle>;
  getAvailableCombatMissions(playerId: string): Promise<any[]>;
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

  async deletePlayer(id: string): Promise<void> {
    // Delete all player-related data (cascade will handle most of it due to FK constraints)
    await db.delete(players).where(eq(players.id, id));
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

  async upgradeCentralHub(playerId: string, targetLevel: number): Promise<void> {
    return await db.transaction(async (tx) => {
      const [player] = await tx
        .select()
        .from(players)
        .where(eq(players.id, playerId))
        .for('update');

      if (!player) {
        throw new Error('Player not found');
      }

      if (targetLevel !== player.hubLevel + 1) {
        throw new Error(`Can only upgrade to next level. Current: ${player.hubLevel}, Target: ${targetLevel}`);
      }

      if (targetLevel > CENTRAL_HUB_CONFIG.maxLevel) {
        throw new Error(`Target level ${targetLevel} exceeds max level ${CENTRAL_HUB_CONFIG.maxLevel}`);
      }

      const upgradeCostConfig = CENTRAL_HUB_CONFIG.upgradeCosts.find(c => c.level === targetLevel);
      if (!upgradeCostConfig) {
        throw new Error(`No upgrade cost configuration found for level ${targetLevel}`);
      }

      const requiredMetal = upgradeCostConfig.metal || 0;
      const requiredCredits = upgradeCostConfig.credits || 0;
      const requiredCrystals = upgradeCostConfig.crystals || 0;

      if (player.metal < requiredMetal) {
        throw new Error(`Insufficient metal. Required: ${requiredMetal}, Available: ${player.metal}`);
      }
      if (player.credits < requiredCredits) {
        throw new Error(`Insufficient credits. Required: ${requiredCredits}, Available: ${player.credits}`);
      }
      if (player.crystals < requiredCrystals) {
        throw new Error(`Insufficient crystals. Required: ${requiredCrystals}, Available: ${player.crystals}`);
      }

      await tx
        .update(players)
        .set({
          hubLevel: targetLevel,
          metal: player.metal - requiredMetal,
          credits: player.credits - requiredCredits,
          crystals: player.crystals - requiredCrystals,
          lastUpdatedAt: new Date(),
        })
        .where(eq(players.id, playerId));
    });
  }

  async calculatePowerBudget(playerId: string): Promise<{ generation: number; consumption: number; available: number }> {
    const powerModules = await db
      .select()
      .from(stationModules)
      .where(
        and(
          eq(stationModules.playerId, playerId),
          eq(stationModules.moduleType, 'power_module'),
          eq(stationModules.isBuilt, true)
        )
      );

    const generation = powerModules.reduce((sum, module) => {
      return sum + (module.powerOutput || 0);
    }, 0);

    const allBuiltModules = await db
      .select()
      .from(stationModules)
      .where(
        and(
          eq(stationModules.playerId, playerId),
          eq(stationModules.isBuilt, true)
        )
      );

    const allBuiltBuildings = await db
      .select()
      .from(buildings)
      .where(
        and(
          eq(buildings.playerId, playerId),
          eq(buildings.isBuilt, true)
        )
      );

    let consumption = allBuiltModules.reduce((sum, module) => {
      const moduleType = module.moduleType as keyof typeof BUILDING_POWER_COSTS;
      const powerCost = BUILDING_POWER_COSTS[moduleType] || 0;
      return sum + powerCost;
    }, 0);

    consumption += allBuiltBuildings.reduce((sum, building) => {
      const buildingType = building.buildingType as keyof typeof BUILDING_POWER_COSTS;
      const powerCost = BUILDING_POWER_COSTS[buildingType] || 0;
      return sum + powerCost;
    }, 0);

    return {
      generation,
      consumption,
      available: generation - consumption,
    };
  }

  async enforcePowerLimits(playerId: string): Promise<void> {
    const budget = await this.calculatePowerBudget(playerId);
    
    if (budget.available < 0) {
      // Power deficit: disable all non-power-module buildings in stationModules
      await db
        .update(stationModules)
        .set({ isPowered: false })
        .where(
          and(
            eq(stationModules.playerId, playerId),
            eq(stationModules.isBuilt, true),
            ne(stationModules.moduleType, 'power_module')
          )
        );
      
      // Power deficit: disable all buildings in buildings table
      await db
        .update(buildings)
        .set({ isPowered: false })
        .where(
          and(
            eq(buildings.playerId, playerId),
            eq(buildings.isBuilt, true)
          )
        );
    } else {
      // Power surplus: re-enable all buildings in stationModules
      await db
        .update(stationModules)
        .set({ isPowered: true })
        .where(
          and(
            eq(stationModules.playerId, playerId),
            eq(stationModules.isBuilt, true)
          )
        );
      
      // Power surplus: re-enable all buildings in buildings table
      await db
        .update(buildings)
        .set({ isPowered: true })
        .where(
          and(
            eq(buildings.playerId, playerId),
            eq(buildings.isBuilt, true)
          )
        );
    }
  }

  async getPlayerStationModules(playerId: string): Promise<StationModule[]> {
    return await db
      .select()
      .from(stationModules)
      .where(eq(stationModules.playerId, playerId));
  }

  async buildStationModule(playerId: string, moduleData: Partial<InsertStationModule>): Promise<StationModule> {
    return await db.transaction(async (tx) => {
      const player = await this.getPlayer(playerId);
      if (!player) {
        throw new Error('Player not found');
      }

      const moduleType = moduleData.moduleType;
      if (!moduleType) {
        throw new Error('Module type is required');
      }

      // Check hub level requirements for module type
      if (MODULE_UNLOCK_REQUIREMENTS[moduleType]) {
        const required = MODULE_UNLOCK_REQUIREMENTS[moduleType].hubLevel;
        if (player.hubLevel < required) {
          throw new Error(`Central Hub level ${required} required to build ${moduleType}`);
        }
      }

      // Calculate power cost
      const powerCost = BUILDING_POWER_COSTS[moduleType as keyof typeof BUILDING_POWER_COSTS] || 0;

      // Create the module
      const [module] = await tx
        .insert(stationModules)
        .values({
          playerId,
          ...moduleData,
          powerCost,
        })
        .returning();

      return module;
    });
  }

  // Research operations (Phase 6.3)
  async startResearch(playerId: string, researchId: string): Promise<ResearchProject> {
    return await db.transaction(async (tx) => {
      // 1. Validate research tech exists in RESEARCH_TREE
      const tech = RESEARCH_TREE.find(t => t.id === researchId);
      if (!tech) {
        throw new Error("Invalid research ID");
      }
      
      // 2. Check if research already unlocked
      const existingUnlocks = await tx
        .select()
        .from(playerTechUnlocks)
        .where(
          and(
            eq(playerTechUnlocks.playerId, playerId),
            eq(playerTechUnlocks.researchId, researchId)
          )
        );
      
      if (existingUnlocks.length > 0) {
        throw new Error("Research already unlocked");
      }
      
      // 3. Check prerequisites
      const hasPrereqs = await this.checkResearchPrerequisites(playerId, researchId);
      if (!hasPrereqs) {
        throw new Error("Prerequisites not met");
      }
      
      // 4. Check if player has active research
      const activeResearch = await this.getActiveResearch(playerId);
      if (activeResearch) {
        throw new Error("Already have active research");
      }
      
      // 5. Get player bonuses and calculate effective costs/duration
      const bonuses = await this.getPlayerResearchBonuses(playerId);
      
      const baseCost = tech.cost;
      const effectiveCost = {
        metal: Math.ceil((baseCost.metal || 0) * bonuses.researchCost),
        crystals: Math.ceil((baseCost.crystals || 0) * bonuses.researchCost),
        credits: Math.ceil((baseCost.credits || 0) * bonuses.researchCost),
      };
      
      const effectiveDuration = Math.ceil(tech.duration * bonuses.researchSpeed);
      
      // 6. Get player and validate resources
      const player = await this.getPlayer(playerId);
      if (!player) {
        throw new Error("Player not found");
      }
      
      if (effectiveCost.metal && player.metal < effectiveCost.metal) {
        throw new Error("Insufficient metal");
      }
      if (effectiveCost.crystals && player.crystals < effectiveCost.crystals) {
        throw new Error("Insufficient crystals");
      }
      if (effectiveCost.credits && player.credits < effectiveCost.credits) {
        throw new Error("Insufficient credits");
      }
      
      // 7. Deduct resources
      await tx
        .update(players)
        .set({
          metal: player.metal - (effectiveCost.metal || 0),
          crystals: player.crystals - (effectiveCost.crystals || 0),
          credits: player.credits - (effectiveCost.credits || 0),
        })
        .where(eq(players.id, playerId));
      
      // 8. Create research project
      const now = new Date();
      const completesAt = new Date(now.getTime() + effectiveDuration * 1000);
      
      const [project] = await tx
        .insert(researchProjects)
        .values({
          playerId,
          researchId,
          researchName: tech.name,
          category: tech.category,
          status: "in_progress",
          startedAt: now,
          completesAt,
        })
        .returning();
      
      return project;
    });
  }

  async cancelResearch(playerId: string, projectId: string): Promise<void> {
    const project = await db
      .select()
      .from(researchProjects)
      .where(
        and(
          eq(researchProjects.id, projectId),
          eq(researchProjects.playerId, playerId)
        )
      )
      .limit(1);
    
    if (project.length === 0) {
      throw new Error("Research project not found");
    }
    
    if (project[0].status !== "in_progress") {
      throw new Error("Cannot cancel completed research");
    }
    
    await db
      .update(researchProjects)
      .set({
        status: "cancelled",
        completedAt: new Date(),
      })
      .where(eq(researchProjects.id, projectId));
  }

  async getActiveResearch(playerId: string): Promise<ResearchProject | null> {
    const [project] = await db
      .select()
      .from(researchProjects)
      .where(
        and(
          eq(researchProjects.playerId, playerId),
          eq(researchProjects.status, "in_progress")
        )
      )
      .limit(1);
    
    return project || null;
  }

  async getResearchHistory(playerId: string): Promise<ResearchProject[]> {
    return await db
      .select()
      .from(researchProjects)
      .where(eq(researchProjects.playerId, playerId));
  }

  async getPlayerTechUnlocks(playerId: string): Promise<PlayerTechUnlock[]> {
    return await db
      .select()
      .from(playerTechUnlocks)
      .where(eq(playerTechUnlocks.playerId, playerId));
  }

  async checkResearchPrerequisites(playerId: string, researchId: string): Promise<boolean> {
    const tech = RESEARCH_TREE.find(t => t.id === researchId);
    if (!tech) {
      return false;
    }
    
    // If no prerequisites, return true
    if (tech.prerequisites.length === 0) {
      return true;
    }
    
    const unlocks = await this.getPlayerTechUnlocks(playerId);
    const unlockedIds = new Set(unlocks.map(u => u.researchId));
    
    // Check if all prerequisites are unlocked
    return tech.prerequisites.every(prereqId => unlockedIds.has(prereqId));
  }

  async getPlayerResearchBonuses(playerId: string): Promise<ResearchBonuses> {
    const unlocks = await this.getPlayerTechUnlocks(playerId);
    return calculateResearchBonuses(unlocks);
  }

  // Ship construction and management (Phase 7.3)
  async startShipConstruction(playerId: string, chassisId: string, customName?: string): Promise<Ship> {
    return await db.transaction(async (tx) => {
      // 1. Validate chassis exists
      const chassis = SHIP_CHASSIS.find(c => c.id === chassisId);
      if (!chassis) throw new Error("Invalid chassis type");
      
      // 2. Check shipyard exists and is powered
      const [shipyard] = await tx
        .select()
        .from(stationModules)
        .where(and(
          eq(stationModules.playerId, playerId),
          eq(stationModules.moduleType, "shipyard"),
          eq(stationModules.isBuilt, true)
        ))
        .limit(1);
      
      if (!shipyard) throw new Error("Shipyard not built");
      if (!shipyard.isPowered) throw new Error("Shipyard is unpowered");
      
      // 3. Get player and validate resources
      const [player] = await tx
        .select()
        .from(players)
        .where(eq(players.id, playerId))
        .limit(1);
      
      if (!player) throw new Error("Player not found");
      
      const cost = chassis.cost;
      
      if (player.metal < cost.metal) throw new Error("Insufficient metal");
      if (player.crystals < cost.crystals) throw new Error("Insufficient crystals");
      if (player.credits < cost.credits) throw new Error("Insufficient credits");
      
      // 4. Deduct resources
      await tx
        .update(players)
        .set({
          metal: sql`${players.metal} - ${cost.metal}`,
          crystals: sql`${players.crystals} - ${cost.crystals}`,
          credits: sql`${players.credits} - ${cost.credits}`,
        })
        .where(eq(players.id, playerId));
      
      // 5. Get research bonuses to calculate stats
      const bonuses = await this.getPlayerResearchBonuses(playerId);
      const stats = calculateShipStats(chassisId, bonuses);
      
      // 6. Create ship instance
      const [ship] = await tx
        .insert(ships)
        .values({
          playerId,
          chassisId,
          name: customName || chassis.name,
          currentHull: stats.maxHull,
          currentShields: stats.maxShields,
          fleetRole: "reserve",
          isDestroyed: false,
        })
        .returning();
      
      return ship;
    });
  }

  async getPlayerShips(playerId: string): Promise<Ship[]> {
    return await db
      .select()
      .from(ships)
      .where(and(
        eq(ships.playerId, playerId),
        eq(ships.isDestroyed, false)
      ))
      .orderBy(ships.createdAt);
  }

  async getShipById(shipId: string): Promise<Ship | null> {
    const [ship] = await db
      .select()
      .from(ships)
      .where(eq(ships.id, shipId))
      .limit(1);
    
    return ship || null;
  }

  async updateShipDamage(shipId: string, newHull: number, newShields: number): Promise<void> {
    await db
      .update(ships)
      .set({
        currentHull: Math.max(0, newHull),
        currentShields: Math.max(0, newShields),
        isDestroyed: newHull <= 0,
      })
      .where(eq(ships.id, shipId));
  }

  async destroyShip(shipId: string): Promise<void> {
    await db
      .update(ships)
      .set({ isDestroyed: true })
      .where(eq(ships.id, shipId));
  }

  async assignShipToFleet(shipId: string, fleetRole: "offense" | "defense" | "reserve"): Promise<void> {
    await db
      .update(ships)
      .set({ fleetRole })
      .where(eq(ships.id, shipId));
  }

  async getFleetComposition(playerId: string): Promise<{
    offense: Ship[];
    defense: Ship[];
    reserve: Ship[];
  }> {
    const allShips = await this.getPlayerShips(playerId);
    
    return {
      offense: allShips.filter(s => s.fleetRole === "offense"),
      defense: allShips.filter(s => s.fleetRole === "defense"),
      reserve: allShips.filter(s => s.fleetRole === "reserve"),
    };
  }

  async createBattle(playerId: string, playerFleet: string[], enemyFleet: any[]): Promise<Battle> {
    const [battle] = await db
      .insert(battles)
      .values({
        playerId,
        playerFleet: JSON.stringify(playerFleet),
        enemyFleet: JSON.stringify(enemyFleet),
        status: "in_progress",
        battleLog: null,
        rewards: null,
      })
      .returning();
    
    return battle;
  }

  async updateBattleResult(battleId: string, status: string, battleLog: any[], rewards: any): Promise<void> {
    await db
      .update(battles)
      .set({
        status,
        battleLog: JSON.stringify(battleLog),
        rewards: JSON.stringify(rewards),
        completedAt: new Date(),
      })
      .where(eq(battles.id, battleId));
  }

  async getBattleById(battleId: string): Promise<Battle | null> {
    const [battle] = await db
      .select()
      .from(battles)
      .where(eq(battles.id, battleId))
      .limit(1);
    
    return battle || null;
  }

  async getPlayerBattles(playerId: string): Promise<Battle[]> {
    return await db
      .select()
      .from(battles)
      .where(eq(battles.playerId, playerId))
      .orderBy(sql`${battles.startedAt} DESC`)
      .limit(20);
  }

  async startBattle(playerId: string, difficulty: "easy" | "medium" | "hard"): Promise<Battle> {
    return await db.transaction(async (tx) => {
      const fleet = await this.getFleetComposition(playerId);
      
      if (fleet.offense.length === 0) {
        throw new Error("No ships assigned to offensive fleet");
      }
      
      const aiConfig: AIFleetConfig = {
        difficulty,
        shipCount: Math.max(2, Math.floor(fleet.offense.length * 0.8)),
      };
      const enemyFleet = generateAIFleet(aiConfig);
      
      const bonuses = await this.getPlayerResearchBonuses(playerId);
      
      const result = simulateBattle(fleet.offense, enemyFleet, bonuses);
      
      const baseRewards = {
        easy: { metal: 200, crystals: 50, credits: 100 },
        medium: { metal: 400, crystals: 100, credits: 200 },
        hard: { metal: 800, crystals: 200, credits: 400 },
      };
      
      const rewards = result.victory ? baseRewards[difficulty] : { metal: 0, crystals: 0, credits: 0 };
      
      const [battle] = await tx
        .insert(battles)
        .values({
          playerId,
          playerFleet: JSON.stringify(fleet.offense.map(s => s.id)),
          enemyFleet: JSON.stringify(enemyFleet),
          status: result.victory ? "victory" : "defeat",
          battleLog: JSON.stringify(result.log),
          rewards: JSON.stringify(rewards),
          completedAt: new Date(),
        })
        .returning();
      
      for (const ship of fleet.offense) {
        if (result.destroyedPlayerShips.includes(ship.id)) {
          await tx.update(ships).set({ isDestroyed: true }).where(eq(ships.id, ship.id));
        }
      }
      
      if (result.victory) {
        await tx
          .update(players)
          .set({
            metal: sql`${players.metal} + ${rewards.metal}`,
            crystals: sql`${players.crystals} + ${rewards.crystals}`,
            credits: sql`${players.credits} + ${rewards.credits}`,
          })
          .where(eq(players.id, playerId));
      }
      
      return battle;
    });
  }

  async craftEquipment(playerId: string, catalogId: string): Promise<void> {
    return await db.transaction(async (tx) => {
      const catalogItem = EQUIPMENT_CATALOG.find(item => item.id === catalogId);
      if (!catalogItem) {
        throw new Error(`Equipment catalog item not found: ${catalogId}`);
      }

      const [player] = await tx.select().from(players).where(eq(players.id, playerId));
      if (!player) {
        throw new Error('Player not found');
      }

      if (player.metal < catalogItem.cost.metal ||
          player.crystals < catalogItem.cost.crystals ||
          player.credits < catalogItem.cost.credits) {
        throw new Error('Insufficient resources');
      }

      await tx
        .update(players)
        .set({
          metal: player.metal - catalogItem.cost.metal,
          crystals: player.crystals - catalogItem.cost.crystals,
          credits: player.credits - catalogItem.cost.credits,
        })
        .where(eq(players.id, playerId));

      await tx.insert(equipment).values({
        playerId,
        catalogId,
        name: catalogItem.name,
        type: catalogItem.type,
        bonusHull: catalogItem.bonusHull || 0,
        bonusShields: catalogItem.bonusShields || 0,
        bonusDamage: catalogItem.bonusDamage || 0,
      });
    });
  }

  async equipItem(shipId: string, equipmentId: string, slot: string): Promise<void> {
    return await db.transaction(async (tx) => {
      const [ship] = await tx.select().from(ships).where(eq(ships.id, shipId));
      if (!ship) {
        throw new Error('Ship not found');
      }

      const [equipmentItem] = await tx.select().from(equipment).where(eq(equipment.id, equipmentId));
      if (!equipmentItem) {
        throw new Error('Equipment not found');
      }

      if (equipmentItem.playerId !== ship.playerId) {
        throw new Error('Equipment does not belong to ship owner');
      }

      const existingInSlot = await tx
        .select()
        .from(shipEquipment)
        .where(and(eq(shipEquipment.shipId, shipId), eq(shipEquipment.slot, slot)))
        .limit(1);

      if (existingInSlot.length > 0) {
        await tx.delete(shipEquipment).where(eq(shipEquipment.id, existingInSlot[0].id));
      }

      await tx.insert(shipEquipment).values({
        shipId,
        equipmentId,
        slot,
      });

      await tx.update(equipment).set({ isEquipped: true }).where(eq(equipment.id, equipmentId));
    });
  }

  async getShipEquipment(shipId: string): Promise<any[]> {
    const results = await db
      .select({
        id: shipEquipment.id,
        slot: shipEquipment.slot,
        equipmentId: equipment.id,
        name: equipment.name,
        type: equipment.type,
        bonusHull: equipment.bonusHull,
        bonusShields: equipment.bonusShields,
        bonusDamage: equipment.bonusDamage,
      })
      .from(shipEquipment)
      .innerJoin(equipment, eq(shipEquipment.equipmentId, equipment.id))
      .where(eq(shipEquipment.shipId, shipId));

    return results;
  }

  async getPlayerEquipment(playerId: string): Promise<any[]> {
    const results = await db
      .select()
      .from(equipment)
      .where(eq(equipment.playerId, playerId));

    return results;
  }

  async startCombatMission(playerId: string, bossId: string): Promise<Battle> {
    return await db.transaction(async (tx) => {
      const bossEncounter = BOSS_ENCOUNTERS.find(boss => boss.id === bossId);
      if (!bossEncounter) {
        throw new Error(`Boss encounter not found: ${bossId}`);
      }

      const fleet = await this.getFleetComposition(playerId);
      
      if (fleet.offense.length === 0) {
        throw new Error("No ships assigned to offensive fleet");
      }

      const bonuses = await this.getPlayerResearchBonuses(playerId);
      const result = simulateBattle(fleet.offense, bossEncounter.fleet, bonuses);

      const rewards = result.victory ? bossEncounter.rewards : { metal: 0, crystals: 0, credits: 0 };

      const [battle] = await tx
        .insert(battles)
        .values({
          playerId,
          playerFleet: JSON.stringify(fleet.offense.map(s => s.id)),
          enemyFleet: JSON.stringify(bossEncounter.fleet),
          status: result.victory ? "victory" : "defeat",
          battleLog: JSON.stringify(result.log),
          rewards: JSON.stringify(rewards),
          completedAt: new Date(),
        })
        .returning();

      await tx.insert(combatMissions).values({
        playerId,
        missionId: bossId,
        missionType: "boss",
        difficulty: "boss",
        status: result.victory ? "completed" : "failed",
        rewards: JSON.stringify(rewards),
        battleId: battle.id,
        completedAt: new Date(),
      });

      for (const ship of fleet.offense) {
        if (result.destroyedPlayerShips.includes(ship.id)) {
          await tx.update(ships).set({ isDestroyed: true }).where(eq(ships.id, ship.id));
        }
      }

      if (result.victory) {
        await tx
          .update(players)
          .set({
            metal: sql`${players.metal} + ${rewards.metal}`,
            crystals: sql`${players.crystals} + ${rewards.crystals}`,
            credits: sql`${players.credits} + ${rewards.credits}`,
          })
          .where(eq(players.id, playerId));
      }

      return battle;
    });
  }

  async getAvailableCombatMissions(playerId: string): Promise<any[]> {
    const completedMissions = await db
      .select({ missionId: combatMissions.missionId })
      .from(combatMissions)
      .where(
        and(
          eq(combatMissions.playerId, playerId),
          eq(combatMissions.status, "completed")
        )
      );

    const completedIds = new Set(completedMissions.map(m => m.missionId));

    return BOSS_ENCOUNTERS.filter(boss => !completedIds.has(boss.id));
  }
}

export const storage = new DatabaseStorage();
