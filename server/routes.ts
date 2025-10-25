import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertPlayerSchema, insertBuildingSchema, updatePlayerSchema, updateBuildingSchema, getEffectiveDroneStats, POWER_MODULE_TIERS, CENTRAL_HUB_CONFIG, BUILDING_POWER_COSTS, MODULE_UNLOCK_REQUIREMENTS, stationModules } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

// Helper function to calculate accumulated resources
function calculateAccumulatedResources(building: any, now: Date) {
  if (!building.isBuilt || !building.productionRate || !building.lastCollectedAt || !building.maxStorage) {
    return building;
  }
  
  // DISABLED: metal_mine and crystal_refinery no longer auto-produce resources
  // Players must use drones for iron and extraction arrays for crystals
  if (building.buildingType === "metal_mine" || building.buildingType === "crystal_refinery") {
    return building;
  }
  
  // No new resources if not powered
  if (!building.isPowered) {
    return building;
  }
  
  const timeSinceCollection = (now.getTime() - building.lastCollectedAt.getTime()) / 1000;
  const accumulatedAmount = (building.productionRate / 3600) * timeSinceCollection;
  const newStorage = Math.min(
    (building.currentStorage || 0) + accumulatedAmount,
    building.maxStorage
  );
  
  return { ...building, currentStorage: newStorage };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);

  // DEV MODE ONLY: Login without authentication
  if (process.env.NODE_ENV === "development") {
    app.get('/api/dev-login', async (req: any, res) => {
      try {
        const DEV_USER_ID = "dev-user-12345";
        
        // Create dev user in database if doesn't exist
        await storage.upsertUser({
          id: DEV_USER_ID,
          email: "dev@example.com",
          firstName: "Dev",
          lastName: "User",
          profileImageUrl: null,
        });
        
        // Create fake session data that mimics OAuth flow
        const fakeUser = {
          claims: {
            sub: DEV_USER_ID,
            email: "dev@example.com",
            first_name: "Dev",
            last_name: "User",
            exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days from now
          },
          access_token: "dev-token",
          refresh_token: "dev-refresh-token",
          expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
        };
        
        // Manually log in the user
        req.login(fakeUser, (err: any) => {
          if (err) {
            console.error("Dev login error:", err);
            return res.status(500).json({ message: "Dev login failed" });
          }
          res.redirect("/");
        });
      } catch (error) {
        console.error("Dev login error:", error);
        res.status(500).json({ message: "Dev login failed" });
      }
    });
  }

  // Get authenticated user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get or create player data for authenticated user
  app.get('/api/player', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let player = await storage.getPlayer(userId);
      
      // DEV MODE: Start with 10000 resources (only on first creation, not every request)
      const DEV_MODE = process.env.NODE_ENV === "development";
      
      if (!player) {
        // Create new player
        if (DEV_MODE) {
          // Dev mode: start with 10000 of each resource, skip tutorial
          player = await storage.createPlayer({
            id: userId,
            name: "",
            gold: 10000,
            metal: 10000,
            crystals: 10000,
            exotic: 10000,
            tutorialStep: "complete",
          });
        } else {
          // Production mode: normal starting resources
          player = await storage.createPlayer({
            id: userId,
            name: "",
            gold: 100,
            metal: 50,
            crystals: 0,
            tutorialStep: "welcome",
          });
        }
      }
      
      // Get dynamic storage caps based on warehouse/silo buildings
      const storageCaps = await storage.getPlayerStorageCaps(userId);
      
      // Return player data with calculated storage caps
      res.json({
        ...player,
        maxMetal: storageCaps.maxMetal,
        maxCrystals: storageCaps.maxCrystals,
      });
    } catch (error) {
      console.error("Error fetching player:", error);
      res.status(500).json({ message: "Failed to fetch player data" });
    }
  });

  // Update player data
  app.patch('/api/player', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedUpdates = updatePlayerSchema.parse({
        id: userId,
        ...req.body,
      });
      
      const player = await storage.updatePlayer(userId, validatedUpdates);
      res.json(player);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      console.error("Error updating player:", error);
      res.status(500).json({ message: "Failed to update player" });
    }
  });

  // Get all buildings for authenticated player
  app.get('/api/buildings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const buildings = await storage.getPlayerBuildings(userId);
      
      // Calculate and persist accumulated resources for each building
      const now = new Date();
      const updatedBuildings = [];
      
      for (const building of buildings) {
        const buildingWithResources = calculateAccumulatedResources(building, now);
        
        // Persist the calculated storage if it changed
        if (buildingWithResources.currentStorage !== building.currentStorage) {
          const updated = await storage.updateBuilding(building.id, {
            currentStorage: buildingWithResources.currentStorage,
          });
          updatedBuildings.push(updated);
        } else {
          updatedBuildings.push(building);
        }
      }
      
      res.json(updatedBuildings);
    } catch (error) {
      console.error("Error fetching buildings:", error);
      res.status(500).json({ message: "Failed to fetch buildings" });
    }
  });

  // Create a new building
  app.post('/api/buildings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const buildingData = insertBuildingSchema.parse({
        ...req.body,
        playerId: userId,
      });
      
      const building = await storage.createBuilding(buildingData);
      res.json(building);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid building data", errors: error.errors });
      }
      console.error("Error creating building:", error);
      res.status(500).json({ message: "Failed to create building" });
    }
  });

  // Update a building
  app.patch('/api/buildings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedUpdates = updateBuildingSchema.parse({
        id,
        ...req.body,
      });
      
      const building = await storage.updateBuilding(id, validatedUpdates);
      res.json(building);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      console.error("Error updating building:", error);
      res.status(500).json({ message: "Failed to update building" });
    }
  });

  // Collect resources from a building
  app.post('/api/buildings/:id/collect', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      // Get the building and calculate current storage
      const buildings = await storage.getPlayerBuildings(userId);
      const building = buildings.find(b => b.id === id);
      
      if (!building) {
        return res.status(404).json({ message: "Building not found" });
      }
      
      // Calculate accumulated resources
      const now = new Date();
      const buildingWithResources = calculateAccumulatedResources(building, now);
      
      if (!buildingWithResources.isBuilt || !buildingWithResources.currentStorage || buildingWithResources.currentStorage <= 0) {
        return res.status(400).json({ message: "No resources to collect" });
      }
      
      // Get player and update resources
      const player = await storage.getPlayer(userId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      
      const collectedAmount = buildingWithResources.currentStorage;
      const resourceType = building.resourceType;
      
      // Update player resources
      const updates: any = {};
      if (resourceType === 'metal') {
        updates.metal = player.metal + Math.floor(collectedAmount);
      } else if (resourceType === 'crystals') {
        updates.crystals = player.crystals + Math.floor(collectedAmount);
      }
      
      const updatedPlayer = await storage.updatePlayer(userId, updates);
      
      // Reset building storage
      const updatedBuilding = await storage.updateBuilding(id, {
        currentStorage: 0,
        lastCollectedAt: now,
      });
      
      res.json({
        player: updatedPlayer,
        building: updatedBuilding,
        collected: Math.floor(collectedAmount),
      });
    } catch (error) {
      console.error("Error collecting resources:", error);
      res.status(500).json({ message: "Failed to collect resources" });
    }
  });

  // Delete a building
  app.delete('/api/buildings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBuilding(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting building:", error);
      res.status(500).json({ message: "Failed to delete building" });
    }
  });

  // Get all resource nodes for authenticated player
  app.get('/api/resource-nodes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const nodes = await storage.getPlayerResourceNodes(userId);
      res.json(nodes);
    } catch (error) {
      console.error("Error fetching resource nodes:", error);
      res.status(500).json({ message: "Failed to fetch resource nodes" });
    }
  });

  // Scan for new asteroid clusters
  app.post('/api/resource-nodes/scan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get player and their buildings to determine scanner level
      const player = await storage.getPlayer(userId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }

      const buildings = await storage.getPlayerBuildings(userId);
      const scannerBuilding = buildings.find(b => b.buildingType === 'scanner' && b.isBuilt);
      
      if (!scannerBuilding) {
        return res.status(400).json({ message: "Scanner Array not built" });
      }

      const scannerLevel = scannerBuilding.level;
      
      // Get existing nodes
      const existingNodes = await storage.getPlayerResourceNodes(userId);
      const discoveredCount = existingNodes.filter(n => n.isDiscovered && n.nodeType === 'asteroid_cluster').length;
      
      // Determine scan capacity based on scanner level
      let maxClusters = 2;
      let allowedRanges = ['short'];
      if (scannerLevel >= 2) {
        maxClusters = 4;
        allowedRanges = ['short', 'mid'];
      }
      if (scannerLevel >= 3) {
        maxClusters = 6;
        allowedRanges = ['short', 'mid', 'deep'];
      }

      // Check if we can discover more
      if (discoveredCount >= maxClusters) {
        return res.status(400).json({ message: "Maximum clusters already discovered for current scanner level" });
      }

      // Find undiscovered nodes or create new ones
      const undiscoveredNodes = existingNodes.filter(n => !n.isDiscovered && n.nodeType === 'asteroid_cluster');
      let nodeToDiscover = undiscoveredNodes[0];

      // If no undiscovered nodes exist, create a new one
      if (!nodeToDiscover) {
        const distanceOptions = allowedRanges;
        const distanceClass = distanceOptions[Math.floor(Math.random() * distanceOptions.length)];
        
        // Generate random Iron amount based on distance
        let ironAmount = 1000;
        if (distanceClass === 'mid') ironAmount = 2500;
        if (distanceClass === 'deep') ironAmount = 5000;
        
        // Add some randomness
        ironAmount = Math.floor(ironAmount * (0.8 + Math.random() * 0.4));

        nodeToDiscover = await storage.createResourceNode({
          playerId: userId,
          nodeType: 'asteroid_cluster',
          nodeName: `Asteroid Cluster ${String.fromCharCode(65 + discoveredCount)}${Math.floor(Math.random() * 99)}`,
          distanceClass,
          totalIron: ironAmount,
          remainingIron: ironAmount,
          isDiscovered: false,
        });
      }

      // Mark as discovered
      const discoveredNode = await storage.updateResourceNode(nodeToDiscover.id, {
        isDiscovered: true,
        discoveredAt: new Date(),
      });

      res.json({
        message: "New asteroid cluster discovered!",
        node: discoveredNode,
      });
    } catch (error) {
      console.error("Error scanning for clusters:", error);
      res.status(500).json({ message: "Failed to scan for clusters" });
    }
  });

  // Get all drones for authenticated player
  app.get('/api/drones', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const drones = await storage.getPlayerDrones(userId);
      res.json(drones);
    } catch (error) {
      console.error("Error fetching drones:", error);
      res.status(500).json({ message: "Failed to fetch drones" });
    }
  });

  // Create a new drone
  app.post('/api/drones', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { droneName, tier = 1 } = req.body;

      // Validate drone name
      if (!droneName || droneName.trim().length === 0) {
        return res.status(400).json({ message: "Drone name is required" });
      }

      // Get player and check resources
      const player = await storage.getPlayer(userId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }

      // Check max drones cap
      const existingDrones = await storage.getPlayerDrones(userId);
      if (existingDrones.length >= player.maxDrones) {
        return res.status(400).json({ message: `Maximum drone capacity reached (${player.maxDrones})` });
      }

      // Define drone costs based on tier
      const droneCosts: { [key: number]: { gold: number; metal: number; crystals: number } } = {
        1: { gold: 100, metal: 50, crystals: 0 },
        2: { gold: 300, metal: 150, crystals: 25 },
        3: { gold: 600, metal: 300, crystals: 75 },
      };

      const cost = droneCosts[tier] || droneCosts[1];

      // Check if player has enough resources
      if (player.gold < cost.gold || player.metal < cost.metal || player.crystals < cost.crystals) {
        return res.status(400).json({ message: "Insufficient resources" });
      }

      // Define stats based on tier
      const statsPerTier: { [key: number]: { speed: number; cargo: number; harvest: number } } = {
        1: { speed: 10, cargo: 50, harvest: 10 },    // Mk1: slow, small cargo, low harvest
        2: { speed: 15, cargo: 100, harvest: 20 },   // Mk2: faster, bigger cargo, better harvest
        3: { speed: 25, cargo: 200, harvest: 40 },   // Mk3: fast, large cargo, high harvest
      };

      const stats = statsPerTier[tier] || statsPerTier[1];

      // Create the drone
      const drone = await storage.createDrone({
        playerId: userId,
        droneType: 'mining_drone',
        droneName: droneName.trim(),
        tier,
        travelSpeed: stats.speed,
        cargoCapacity: stats.cargo,
        harvestRate: stats.harvest,
        durability: 100,
        status: 'idle',
        currentMissionId: null,
      });

      // Deduct resources from player
      await storage.updatePlayer(userId, {
        gold: player.gold - cost.gold,
        metal: player.metal - cost.metal,
        crystals: player.crystals - cost.crystals,
      });

      res.json(drone);
    } catch (error) {
      console.error("Error creating drone:", error);
      res.status(500).json({ message: "Failed to create drone" });
    }
  });

  // Assign drone to a cluster (create mining mission)
  app.post('/api/drones/:id/assign', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: droneId } = req.params;
      const { targetNodeId } = req.body;

      // Validate inputs
      if (!targetNodeId) {
        return res.status(400).json({ message: "Target cluster is required" });
      }

      // Get drone
      const drone = await storage.getDrone(droneId);
      if (!drone || drone.playerId !== userId) {
        return res.status(404).json({ message: "Drone not found" });
      }

      // Check if drone is available
      if (drone.status !== 'idle') {
        return res.status(400).json({ message: "Drone is not available" });
      }

      // Get target cluster
      const cluster = await storage.getResourceNode(targetNodeId);
      if (!cluster || cluster.playerId !== userId) {
        return res.status(404).json({ message: "Cluster not found" });
      }

      // Check if cluster is discovered
      if (!cluster.isDiscovered) {
        return res.status(400).json({ message: "Cluster not yet discovered" });
      }

      // Check if cluster has resources
      if (!cluster.remainingIron || cluster.remainingIron <= 0) {
        return res.status(400).json({ message: "Cluster is depleted" });
      }

      // Calculate timing based on distance and drone speed (use effective stats with upgrades)
      const effectiveStats = getEffectiveDroneStats(drone);
      const distanceKm = cluster.distanceClass === 'short' ? 100 : cluster.distanceClass === 'mid' ? 300 : 600;
      const travelTimeSec = distanceKm / effectiveStats.speed;
      
      // Calculate mining time based on how much we can harvest
      const amountToHarvest = Math.min(effectiveStats.cargoCapacity, cluster.remainingIron);
      const miningTimeSec = amountToHarvest / effectiveStats.harvestRate;

      const now = new Date();
      const arrivalAt = new Date(now.getTime() + travelTimeSec * 1000);
      const completesAt = new Date(arrivalAt.getTime() + miningTimeSec * 1000);
      const returnAt = new Date(completesAt.getTime() + travelTimeSec * 1000);

      // Create mission
      const mission = await storage.createMission({
        playerId: userId,
        missionType: 'mining_trip',
        status: 'traveling_out',
        droneId,
        arrayId: null,
        targetNodeId,
        cargoAmount: 0,
        cargoType: 'iron',
        startedAt: now,
        arrivalAt,
        completesAt,
        returnAt,
        completedAt: null,
      });

      // Update drone status
      await storage.updateDrone(droneId, {
        status: 'traveling',
        currentMissionId: mission.id,
      });

      res.json(mission);
    } catch (error) {
      console.error("Error assigning drone:", error);
      res.status(500).json({ message: "Failed to assign drone" });
    }
  });

  // Upgrade a drone
  app.post('/api/drones/:id/upgrade', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: droneId } = req.params;
      const { type } = req.body;

      // Validate upgrade type
      if (!type || !['speed', 'cargo', 'harvest'].includes(type)) {
        return res.status(400).json({ message: "Invalid upgrade type. Must be 'speed', 'cargo', or 'harvest'" });
      }

      // Get drone
      const drone = await storage.getDrone(droneId);
      if (!drone || drone.playerId !== userId) {
        return res.status(404).json({ message: "Drone not found" });
      }

      // Attempt upgrade
      await storage.upgradeDrone(droneId, type as "speed" | "cargo" | "harvest");

      res.json({ success: true, message: `${type} upgrade started` });
    } catch (error: any) {
      console.error("Error upgrading drone:", error);
      res.status(400).json({ message: error.message || "Failed to upgrade drone" });
    }
  });

  // Get all missions for authenticated player
  app.get('/api/missions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const missions = await storage.getPlayerMissions(userId);
      res.json(missions);
    } catch (error) {
      console.error("Error fetching missions:", error);
      res.status(500).json({ message: "Failed to fetch missions" });
    }
  });

  // ============================================================================
  // RIFT SCANNER & EXTRACTION ARRAYS (Phase 4)
  // ============================================================================

  // Scan for crystal rifts
  app.post('/api/buildings/rift-scanner/scan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get player to check scanner level
      const player = await storage.getPlayer(userId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }

      // Get rift scanner building
      const buildings = await storage.getPlayerBuildings(userId);
      const riftScanner = buildings.find(b => b.buildingType === 'rift_scanner' && b.isBuilt);
      
      if (!riftScanner) {
        return res.status(400).json({ message: "Rift Scanner not built" });
      }

      const scannerLevel = riftScanner.level;

      // Check existing rifts count
      const existingRifts = await storage.getPlayerResourceNodes(userId);
      const riftsCount = existingRifts.filter(n => n.nodeType === 'crystal_rift').length;
      
      const maxRifts = scannerLevel === 1 ? 2 : scannerLevel === 2 ? 4 : 6;
      if (riftsCount >= maxRifts) {
        return res.status(400).json({ message: `Maximum ${maxRifts} rifts for scanner level ${scannerLevel}` });
      }

      // Create new rift with random properties
      const baseStability = 500 + Math.random() * 500; // 500-1000
      const richness = 5 + Math.floor(Math.random() * 11); // 5-15 crystals per tick
      const volatility = 0.8 + Math.random() * 0.4; // 0.8-1.2
      
      // Random distance class weighted toward player's scanner level
      const distanceClasses = scannerLevel === 1 ? ['short'] : scannerLevel === 2 ? ['short', 'mid'] : ['short', 'mid', 'deep'];
      const distanceClass = distanceClasses[Math.floor(Math.random() * distanceClasses.length)];

      const rift = await storage.createResourceNode({
        playerId: userId,
        nodeType: 'crystal_rift',
        nodeName: `Rift-${riftsCount + 1}`,
        distanceClass,
        isDiscovered: true,
        discoveredAt: new Date(),
        totalIron: null,
        remainingIron: null,
        stability: baseStability,
        maxStability: baseStability,
        richnessCrystalPerTick: richness,
        volatilityModifier: volatility,
        collapseAt: null,
        energyOutput: richness,
        isDepleted: false,
        depletedAt: null,
      });

      res.json(rift);
    } catch (error) {
      console.error("Error scanning for rifts:", error);
      res.status(500).json({ message: "Failed to scan for rifts" });
    }
  });

  // Get all extraction arrays for authenticated player
  app.get('/api/extraction-arrays', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const arrays = await storage.getPlayerExtractionArrays(userId);
      res.json(arrays);
    } catch (error) {
      console.error("Error fetching extraction arrays:", error);
      res.status(500).json({ message: "Failed to fetch extraction arrays" });
    }
  });

  // Build a new extraction array
  app.post('/api/extraction-arrays/build', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier, arrayName } = req.body;

      if (!tier || ![1, 2, 3].includes(tier)) {
        return res.status(400).json({ message: "Invalid tier. Must be 1, 2, or 3" });
      }

      // Get player
      const player = await storage.getPlayer(userId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }

      // Check array capacity
      const existingArrays = await storage.getPlayerExtractionArrays(userId);
      if (existingArrays.length >= player.maxExtractionArrays) {
        return res.status(400).json({ message: `Maximum ${player.maxExtractionArrays} arrays allowed` });
      }

      // Get tier config
      const tierConfig = [
        { id: 1, name: "T1 Array", baseExtraction: 2, buildCost: { metal: 200, gold: 100 } },
        { id: 2, name: "T2 Array", baseExtraction: 5, buildCost: { metal: 500, gold: 250 } },
        { id: 3, name: "T3 Array", baseExtraction: 10, buildCost: { metal: 1000, gold: 500 } },
      ].find(t => t.id === tier);

      if (!tierConfig) {
        return res.status(400).json({ message: "Invalid tier configuration" });
      }

      // Check resources
      if (player.metal < tierConfig.buildCost.metal || player.gold < tierConfig.buildCost.gold) {
        return res.status(400).json({ message: "Insufficient resources" });
      }

      // Deduct resources
      await storage.updatePlayer(userId, {
        metal: player.metal - tierConfig.buildCost.metal,
        gold: player.gold - tierConfig.buildCost.gold,
      });

      // Create array
      const array = await storage.createExtractionArray({
        playerId: userId,
        arrayName: arrayName || `Array-${existingArrays.length + 1}`,
        tier,
        baseExtractionRate: tierConfig.baseExtraction,
        uplinkLevel: 0,
        beamLevel: 0,
        telemetryLevel: 0,
        upgradingType: null,
        upgradeStartedAt: null,
        upgradeCompletesAt: null,
        status: 'idle',
        targetRiftId: null,
        deployedAt: null,
        totalCrystalsExtracted: 0,
      });

      res.json(array);
    } catch (error) {
      console.error("Error building extraction array:", error);
      res.status(500).json({ message: "Failed to build extraction array" });
    }
  });

  // Deploy extraction array to rift
  app.post('/api/extraction-arrays/:id/deploy', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: arrayId } = req.params;
      const { riftId } = req.body;

      if (!riftId) {
        return res.status(400).json({ message: "Rift ID required" });
      }

      // Get array
      const array = await storage.getExtractionArray(arrayId);
      if (!array || array.playerId !== userId) {
        return res.status(404).json({ message: "Array not found" });
      }

      // Check array is idle
      if (array.status !== 'idle') {
        return res.status(400).json({ message: "Array must be idle to deploy" });
      }

      // Get rift
      const rift = await storage.getResourceNode(riftId);
      if (!rift || rift.playerId !== userId) {
        return res.status(404).json({ message: "Rift not found" });
      }

      // Check rift type and status
      if (rift.nodeType !== 'crystal_rift') {
        return res.status(400).json({ message: "Target must be a crystal rift" });
      }

      if (rift.collapseAt || rift.isDepleted) {
        return res.status(400).json({ message: "Rift has collapsed" });
      }

      // Deploy array
      const updatedArray = await storage.updateExtractionArray(arrayId, {
        status: 'deployed',
        targetRiftId: riftId,
        deployedAt: new Date(),
      });

      res.json(updatedArray);
    } catch (error) {
      console.error("Error deploying extraction array:", error);
      res.status(500).json({ message: "Failed to deploy extraction array" });
    }
  });

  // Recall extraction array from rift
  app.post('/api/extraction-arrays/:id/recall', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: arrayId } = req.params;

      // Get array
      const array = await storage.getExtractionArray(arrayId);
      if (!array || array.playerId !== userId) {
        return res.status(404).json({ message: "Array not found" });
      }

      // Check array is deployed
      if (array.status !== 'deployed') {
        return res.status(400).json({ message: "Array is not deployed" });
      }

      // Recall array
      const updatedArray = await storage.updateExtractionArray(arrayId, {
        status: 'idle',
        targetRiftId: null,
        deployedAt: null,
      });

      res.json(updatedArray);
    } catch (error) {
      console.error("Error recalling extraction array:", error);
      res.status(500).json({ message: "Failed to recall extraction array" });
    }
  });

  // Upgrade extraction array
  app.post('/api/extraction-arrays/:id/upgrade', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: arrayId } = req.params;
      const { type } = req.body;

      // Validate upgrade type
      if (!type || !['uplink', 'beam', 'telemetry'].includes(type)) {
        return res.status(400).json({ message: "Invalid upgrade type. Must be 'uplink', 'beam', or 'telemetry'" });
      }

      // Get array
      const array = await storage.getExtractionArray(arrayId);
      if (!array || array.playerId !== userId) {
        return res.status(404).json({ message: "Array not found" });
      }

      // Attempt upgrade
      await storage.upgradeArray(arrayId, type as "uplink" | "beam" | "telemetry");

      res.json({ success: true, message: `${type} upgrade started` });
    } catch (error: any) {
      console.error("Error upgrading extraction array:", error);
      res.status(400).json({ message: error.message || "Failed to upgrade extraction array" });
    }
  });

  // ============================================================================
  // POWER SYSTEM & CENTRAL HUB (Phase 5)
  // ============================================================================

  // Upgrade Central Hub
  app.post('/api/central-hub/upgrade', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { targetLevel } = req.body;

      // Validate targetLevel
      if (!targetLevel || typeof targetLevel !== 'number') {
        return res.status(400).json({ message: "Target level is required and must be a number" });
      }

      // Attempt upgrade
      await storage.upgradeCentralHub(userId, targetLevel);

      // Get updated player data
      const updatedPlayer = await storage.getPlayer(userId);
      res.json(updatedPlayer);
    } catch (error: any) {
      console.error("Error upgrading central hub:", error);
      res.status(400).json({ message: error.message || "Failed to upgrade central hub" });
    }
  });

  // Build power module
  app.post('/api/power-modules/build', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier, name, positionX, positionY } = req.body;

      // Validate inputs
      if (!tier || typeof tier !== 'number') {
        return res.status(400).json({ message: "Tier is required and must be a number" });
      }
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: "Name is required" });
      }
      if (typeof positionX !== 'number' || typeof positionY !== 'number') {
        return res.status(400).json({ message: "Position coordinates are required" });
      }

      // Get player
      const player = await storage.getPlayer(userId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }

      // Find tier config
      const tierConfig = POWER_MODULE_TIERS.find(t => t.tier === tier);
      if (!tierConfig) {
        return res.status(400).json({ message: `Invalid tier ${tier}` });
      }

      // Check hub level requirement (tier gating)
      if (player.hubLevel < tierConfig.requiredHubLevel) {
        return res.status(400).json({ 
          message: `Central Hub level ${tierConfig.requiredHubLevel} required. Current level: ${player.hubLevel}` 
        });
      }

      // Check resources
      const cost = tierConfig.buildCost;
      const missingResources = [];
      if (cost.metal && player.metal < cost.metal) {
        missingResources.push(`metal (need ${cost.metal}, have ${player.metal})`);
      }
      if ('crystals' in cost && cost.crystals && player.crystals < cost.crystals) {
        missingResources.push(`crystals (need ${cost.crystals}, have ${player.crystals})`);
      }
      
      if (missingResources.length > 0) {
        return res.status(400).json({ message: `Insufficient resources: ${missingResources.join(', ')}` });
      }

      // Deduct resources and create module (transaction)
      const now = new Date();
      const upgradeCompletesAt = new Date(now.getTime() + tierConfig.buildTime * 1000);

      // Deduct resources
      await storage.updatePlayer(userId, {
        metal: player.metal - (cost.metal || 0),
        crystals: player.crystals - (('crystals' in cost) ? (cost.crystals || 0) : 0),
      });

      // Create station module
      const [module] = await db.insert(stationModules).values({
        playerId: userId,
        moduleType: 'power_module',
        moduleName: name.trim(),
        level: 1,
        powerTier: tier,
        powerOutput: tierConfig.powerOutput,
        powerCost: 0,
        positionX,
        positionY,
        isBuilt: false,
        isUpgrading: false,
        buildStartedAt: now,
        upgradeCompletesAt,
      }).returning();

      // Enforce power limits after building construction
      await storage.enforcePowerLimits(userId);

      res.json(module);
    } catch (error: any) {
      console.error("Error building power module:", error);
      res.status(500).json({ message: error.message || "Failed to build power module" });
    }
  });

  // Get all power modules
  app.get('/api/power-modules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Query power modules for player
      const modules = await db
        .select()
        .from(stationModules)
        .where(
          and(
            eq(stationModules.playerId, userId),
            eq(stationModules.moduleType, 'power_module')
          )
        );

      res.json(modules);
    } catch (error) {
      console.error("Error fetching power modules:", error);
      res.status(500).json({ message: "Failed to fetch power modules" });
    }
  });

  // Get power budget
  app.get('/api/power-budget', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Calculate power budget using storage method
      const powerBudget = await storage.calculatePowerBudget(userId);
      
      res.json(powerBudget);
    } catch (error) {
      console.error("Error calculating power budget:", error);
      res.status(500).json({ message: "Failed to calculate power budget" });
    }
  });

  // Get central hub unlock info
  app.get('/api/central-hub/unlock-info', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get player
      const player = await storage.getPlayer(userId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }

      const currentLevel = player.hubLevel;

      // Find unlocked tiers
      const unlockedTiers = POWER_MODULE_TIERS
        .filter(tierConfig => tierConfig.requiredHubLevel <= currentLevel)
        .map(tierConfig => tierConfig.tier);

      // Get next level cost if available
      let nextLevelCost = null;
      if (currentLevel < CENTRAL_HUB_CONFIG.maxLevel) {
        const nextLevelConfig = CENTRAL_HUB_CONFIG.upgradeCosts.find(
          cost => cost.level === currentLevel + 1
        );
        if (nextLevelConfig) {
          nextLevelCost = {
            level: nextLevelConfig.level,
            metal: nextLevelConfig.metal,
            crystals: ('crystals' in nextLevelConfig) ? nextLevelConfig.crystals : 0,
            gold: nextLevelConfig.gold,
          };
        }
      }

      res.json({
        currentLevel,
        unlockedTiers,
        nextLevelCost,
      });
    } catch (error) {
      console.error("Error fetching central hub unlock info:", error);
      res.status(500).json({ message: "Failed to fetch central hub unlock info" });
    }
  });

  // ============================================================================
  // STATION MODULES (Phase 6)
  // ============================================================================

  // Get all station modules for authenticated player
  app.get('/api/station-modules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const modules = await storage.getPlayerStationModules(userId);
      res.json(modules);
    } catch (error) {
      console.error("Error fetching station modules:", error);
      res.status(500).json({ message: "Failed to fetch station modules" });
    }
  });

  // Build a station module
  app.post('/api/station-modules/build', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { moduleType, moduleName, positionX, positionY, level } = req.body;

      // Validate inputs
      if (!moduleType || typeof moduleType !== 'string') {
        return res.status(400).json({ message: "Module type is required" });
      }
      if (!moduleName || typeof moduleName !== 'string' || moduleName.trim().length === 0) {
        return res.status(400).json({ message: "Module name is required" });
      }
      if (typeof positionX !== 'number' || typeof positionY !== 'number') {
        return res.status(400).json({ message: "Position coordinates are required" });
      }

      // Build module using storage method (includes hub level validation)
      const module = await storage.buildStationModule(userId, {
        moduleType,
        moduleName: moduleName.trim(),
        level: level || 1,
        positionX,
        positionY,
        isBuilt: true,
        isUpgrading: false,
      });

      // Enforce power limits after building
      await storage.enforcePowerLimits(userId);

      res.json(module);
    } catch (error: any) {
      console.error("Error building station module:", error);
      res.status(400).json({ message: error.message || "Failed to build station module" });
    }
  });

  // Get module unlock info
  app.get('/api/station-modules/unlock-info', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get player
      const player = await storage.getPlayer(userId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }

      const currentLevel = player.hubLevel;

      // Calculate which modules are unlocked
      const unlockedModules: Record<string, boolean> = {};
      for (const [moduleType, requirement] of Object.entries(MODULE_UNLOCK_REQUIREMENTS)) {
        unlockedModules[moduleType] = currentLevel >= requirement.hubLevel;
      }

      res.json({
        currentLevel,
        unlockedModules,
        requirements: MODULE_UNLOCK_REQUIREMENTS,
      });
    } catch (error) {
      console.error("Error fetching module unlock info:", error);
      res.status(500).json({ message: "Failed to fetch module unlock info" });
    }
  });

  // ============================================================================
  // RESEARCH SYSTEM (Phase 6.3)
  // ============================================================================

  // Start research
  app.post('/api/research/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { researchId } = req.body;
      
      if (!researchId) {
        return res.status(400).json({ message: "Missing researchId" });
      }
      
      const project = await storage.startResearch(userId, researchId);
      res.json(project);
    } catch (error: any) {
      console.error("Error starting research:", error);
      res.status(400).json({ message: error.message || "Failed to start research" });
    }
  });

  // Cancel research
  app.post('/api/research/cancel/:projectId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { projectId } = req.params;
      
      await storage.cancelResearch(userId, projectId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error cancelling research:", error);
      res.status(400).json({ message: error.message || "Failed to cancel research" });
    }
  });

  // Get active research
  app.get('/api/research/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getActiveResearch(userId);
      res.json(project);
    } catch (error) {
      console.error("Error fetching active research:", error);
      res.status(500).json({ message: "Failed to fetch active research" });
    }
  });

  // Get research history
  app.get('/api/research/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projects = await storage.getResearchHistory(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching research history:", error);
      res.status(500).json({ message: "Failed to fetch research history" });
    }
  });

  // Get player tech unlocks
  app.get('/api/research/unlocks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const unlocks = await storage.getPlayerTechUnlocks(userId);
      res.json(unlocks);
    } catch (error) {
      console.error("Error fetching tech unlocks:", error);
      res.status(500).json({ message: "Failed to fetch tech unlocks" });
    }
  });

  // Get player research bonuses
  app.get('/api/research/bonuses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bonuses = await storage.getPlayerResearchBonuses(userId);
      res.json(bonuses);
    } catch (error) {
      console.error("Error fetching research bonuses:", error);
      res.status(500).json({ message: "Failed to fetch research bonuses" });
    }
  });

  // ============================================================================
  // SHIP CONSTRUCTION SYSTEM (Phase 7.3)
  // ============================================================================

  // Build a new ship
  app.post("/api/ships/build", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { chassisId, name } = req.body;
      
      if (!chassisId) {
        return res.status(400).json({ message: "Missing chassisId" });
      }
      
      const ship = await storage.startShipConstruction(userId, chassisId, name);
      res.json(ship);
    } catch (error: any) {
      console.error("Error building ship:", error);
      res.status(400).json({ message: error.message || "Failed to build ship" });
    }
  });

  // Get all ships for authenticated player
  app.get("/api/ships", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ships = await storage.getPlayerShips(userId);
      res.json(ships);
    } catch (error) {
      console.error("Error fetching ships:", error);
      res.status(500).json({ message: "Failed to fetch ships" });
    }
  });

  // Get a specific ship by ID
  app.get("/api/ships/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const ship = await storage.getShipById(id);
      
      if (!ship) {
        return res.status(404).json({ message: "Ship not found" });
      }
      
      if (ship.playerId !== userId) {
        return res.status(403).json({ message: "Not authorized to view this ship" });
      }
      
      res.json(ship);
    } catch (error) {
      console.error("Error fetching ship:", error);
      res.status(500).json({ message: "Failed to fetch ship" });
    }
  });

  // Delete a ship (mark as destroyed)
  app.delete("/api/ships/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const ship = await storage.getShipById(id);
      
      if (!ship) {
        return res.status(404).json({ message: "Ship not found" });
      }
      
      if (ship.playerId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this ship" });
      }
      
      await storage.destroyShip(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting ship:", error);
      res.status(500).json({ message: "Failed to delete ship" });
    }
  });

  // ============================================================================
  // FLEET ASSIGNMENT MANAGEMENT (Phase 7.4)
  // ============================================================================

  // Assign a ship to a fleet role
  app.patch("/api/ships/:id/assign", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { fleetRole } = req.body;
      
      if (!fleetRole || !["offense", "defense", "reserve"].includes(fleetRole)) {
        return res.status(400).json({ message: "Invalid fleet role" });
      }
      
      const ship = await storage.getShipById(id);
      if (!ship || ship.playerId !== userId) {
        return res.status(404).json({ message: "Ship not found" });
      }
      
      await storage.assignShipToFleet(id, fleetRole);
      res.json({ success: true });
    } catch (error) {
      console.error("Error assigning ship to fleet:", error);
      res.status(500).json({ message: "Failed to assign ship to fleet" });
    }
  });

  // Get fleet composition
  app.get("/api/fleet/composition", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const composition = await storage.getFleetComposition(userId);
      res.json(composition);
    } catch (error) {
      console.error("Error fetching fleet composition:", error);
      res.status(500).json({ message: "Failed to fetch fleet composition" });
    }
  });

  // ============================================================================
  // BATTLE SESSION DATA MODEL (Phase 7.5)
  // ============================================================================

  // Get all battles for authenticated player
  app.get("/api/battles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const battles = await storage.getPlayerBattles(userId);
      res.json(battles);
    } catch (error) {
      console.error("Error fetching battles:", error);
      res.status(500).json({ message: "Failed to fetch battles" });
    }
  });

  // Get a specific battle by ID
  app.get("/api/battles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const battle = await storage.getBattleById(id);
      if (!battle || battle.playerId !== userId) {
        return res.status(404).json({ message: "Battle not found" });
      }
      
      res.json(battle);
    } catch (error) {
      console.error("Error fetching battle:", error);
      res.status(500).json({ message: "Failed to fetch battle" });
    }
  });

  // Start a new battle (Phase 7.8)
  app.post("/api/battles/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { difficulty } = req.body;
      
      if (!difficulty || !["easy", "medium", "hard"].includes(difficulty)) {
        return res.status(400).json({ message: "Invalid difficulty" });
      }
      
      const battle = await storage.startBattle(userId, difficulty);
      res.json(battle);
    } catch (error: any) {
      console.error("Error starting battle:", error);
      res.status(400).json({ message: error.message || "Failed to start battle" });
    }
  });

  // ============================================================================
  // EQUIPMENT SYSTEM (Phase 8)
  // ============================================================================

  // Craft equipment
  app.post("/api/equipment/craft", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { equipmentId } = req.body;
      
      if (!equipmentId) {
        return res.status(400).json({ message: "Missing equipmentId" });
      }
      
      await storage.craftEquipment(userId, equipmentId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error crafting equipment:", error);
      res.status(400).json({ message: error.message || "Failed to craft equipment" });
    }
  });

  // Equip item to ship
  app.post("/api/equipment/equip", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { shipId, equipmentId, slot } = req.body;
      
      if (!shipId || !equipmentId || !slot) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      await storage.equipItem(shipId, equipmentId, slot);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error equipping item:", error);
      res.status(400).json({ message: error.message || "Failed to equip item" });
    }
  });

  // Get player equipment
  app.get("/api/equipment", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const equipment = await storage.getPlayerEquipment(userId);
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ message: "Failed to fetch equipment" });
    }
  });

  // Get ship equipment
  app.get("/api/ships/:id/equipment", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const ship = await storage.getShipById(id);
      if (!ship || ship.playerId !== userId) {
        return res.status(404).json({ message: "Ship not found" });
      }
      
      const equipment = await storage.getShipEquipment(id);
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching ship equipment:", error);
      res.status(500).json({ message: "Failed to fetch ship equipment" });
    }
  });

  // ============================================================================
  // EXPEDITIONS (Phase 7b - Task 7b)
  // ============================================================================

  // Start a new expedition
  app.post("/api/expeditions/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const expedition = await storage.startExpedition(userId);
      res.json(expedition);
    } catch (error: any) {
      console.error("Error starting expedition:", error);
      res.status(400).json({ message: error.message || "Failed to start expedition" });
    }
  });

  // Claim expedition rewards
  app.post("/api/expeditions/claim/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const result = await storage.claimExpedition(userId, id);
      
      // Fetch updated player data
      const player = await storage.getPlayer(userId);
      
      res.json({ ...result, player });
    } catch (error: any) {
      console.error("Error claiming expedition:", error);
      res.status(400).json({ message: error.message || "Failed to claim expedition" });
    }
  });

  // Get player expeditions
  app.get("/api/expeditions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const expeditions = await storage.getPlayerExpeditions(userId);
      res.json(expeditions);
    } catch (error) {
      console.error("Error fetching expeditions:", error);
      res.status(500).json({ message: "Failed to fetch expeditions" });
    }
  });

  // Get active expedition
  app.get("/api/expeditions/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const expedition = await storage.getActiveExpedition(userId);
      res.json(expedition);
    } catch (error) {
      console.error("Error fetching active expedition:", error);
      res.status(500).json({ message: "Failed to fetch active expedition" });
    }
  });

  // ============================================================================
  // COMBAT MISSIONS (Phase 9)
  // ============================================================================

  // Get available combat missions
  app.get("/api/missions/available", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const missions = await storage.getAvailableCombatMissions(userId);
      res.json(missions);
    } catch (error) {
      console.error("Error fetching available missions:", error);
      res.status(500).json({ message: "Failed to fetch available missions" });
    }
  });

  // Start combat mission
  app.post("/api/missions/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { missionId } = req.body;
      
      if (!missionId) {
        return res.status(400).json({ message: "Missing missionId" });
      }
      
      const battle = await storage.startCombatMission(userId, missionId);
      res.json(battle);
    } catch (error: any) {
      console.error("Error starting combat mission:", error);
      res.status(400).json({ message: error.message || "Failed to start combat mission" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
