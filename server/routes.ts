import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertPlayerSchema, insertBuildingSchema, updatePlayerSchema, updateBuildingSchema } from "@shared/schema";
import { z } from "zod";

// Helper function to calculate accumulated resources
function calculateAccumulatedResources(building: any, now: Date) {
  if (!building.isBuilt || !building.productionRate || !building.lastCollectedAt || !building.maxStorage) {
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
      
      // If player doesn't exist, create one
      if (!player) {
        player = await storage.createPlayer({
          id: userId,
          name: "",
          credits: 100,
          metal: 50,
          crystals: 0,
          tutorialStep: "welcome",
        });
      }
      
      res.json(player);
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
      const droneCosts: { [key: number]: { credits: number; metal: number; crystals: number } } = {
        1: { credits: 100, metal: 50, crystals: 0 },
        2: { credits: 300, metal: 150, crystals: 25 },
        3: { credits: 600, metal: 300, crystals: 75 },
      };

      const cost = droneCosts[tier] || droneCosts[1];

      // Check if player has enough resources
      if (player.credits < cost.credits || player.metal < cost.metal || player.crystals < cost.crystals) {
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
        credits: player.credits - cost.credits,
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

      // Calculate timing based on distance and drone speed
      const distanceKm = cluster.distanceClass === 'short' ? 100 : cluster.distanceClass === 'mid' ? 300 : 600;
      const travelTimeSec = distanceKm / drone.travelSpeed;
      
      // Calculate mining time based on how much we can harvest
      const amountToHarvest = Math.min(drone.cargoCapacity, cluster.remainingIron);
      const miningTimeSec = amountToHarvest / drone.harvestRate;

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

  const httpServer = createServer(app);
  return httpServer;
}
