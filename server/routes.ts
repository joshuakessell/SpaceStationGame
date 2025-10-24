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

  const httpServer = createServer(app);
  return httpServer;
}
