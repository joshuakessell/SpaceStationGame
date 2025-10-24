import { storage } from "./storage";
import { db } from "./db";
import { drones, extractionArrays, researchProjects, playerTechUnlocks, stationModules } from "@shared/schema";
import { lte, and, isNotNull, eq } from "drizzle-orm";
import { log } from "./vite";

/**
 * Upgrade Tick System
 * 
 * Runs periodically to complete upgrades for drones, extraction arrays, and research projects:
 * - Finds all drones with upgradeCompletesAt <= now
 * - Finds all arrays with upgradeCompletesAt <= now
 * - Finds all research projects with completesAt <= now
 * - Calls storage.completeDroneUpgrade / storage.completeArrayUpgrade for each
 * - Completes research projects and updates playerTechUnlocks
 * - Logs completion
 */

const TICK_INTERVAL = 5000; // 5 seconds
let tickIntervalHandle: NodeJS.Timeout | null = null;

export function startUpgradeTickSystem() {
  // Prevent multiple tick systems from running
  if (tickIntervalHandle) {
    log("[Upgrade Tick] Tick system already running, skipping");
    return;
  }

  log("[Upgrade Tick] Starting upgrade and research tick system");
  
  tickIntervalHandle = setInterval(async () => {
    try {
      await processUpgradeCompletions();
      await processResearchCompletion();
    } catch (error) {
      console.error("[Upgrade Tick] Error processing upgrades and research:", error);
    }
  }, TICK_INTERVAL);
}

export function stopUpgradeTickSystem() {
  if (tickIntervalHandle) {
    clearInterval(tickIntervalHandle);
    tickIntervalHandle = null;
    log("[Upgrade Tick] Stopped upgrade tick system");
  }
}

async function processUpgradeCompletions() {
  const now = new Date();
  
  // Find all drones with completed upgrades
  const completedDroneUpgrades = await db
    .select()
    .from(drones)
    .where(
      and(
        isNotNull(drones.upgradingType),
        isNotNull(drones.upgradeCompletesAt),
        lte(drones.upgradeCompletesAt, now)
      )
    );
  
  for (const drone of completedDroneUpgrades) {
    try {
      await storage.completeDroneUpgrade(drone.id);
      log(`[Upgrade Tick] Drone ${drone.droneName} completed ${drone.upgradingType} upgrade`);
    } catch (error) {
      console.error(`[Upgrade Tick] Error completing upgrade for drone ${drone.id}:`, error);
    }
  }

  // Find all arrays with completed upgrades
  const completedArrayUpgrades = await db
    .select()
    .from(extractionArrays)
    .where(
      and(
        isNotNull(extractionArrays.upgradingType),
        isNotNull(extractionArrays.upgradeCompletesAt),
        lte(extractionArrays.upgradeCompletesAt, now)
      )
    );
  
  for (const array of completedArrayUpgrades) {
    try {
      await storage.completeArrayUpgrade(array.id);
      log(`[Upgrade Tick] Array ${array.arrayName} completed ${array.upgradingType} upgrade`);
    } catch (error) {
      console.error(`[Upgrade Tick] Error completing upgrade for array ${array.id}:`, error);
    }
  }
}

/**
 * Process Research Completion
 * 
 * Checks all in-progress research projects and completes them if:
 * 1. The completion time has been reached (completesAt <= now)
 * 2. The research bay is powered (if it exists)
 * 
 * When research is complete:
 * - Updates researchProjects status to "completed"
 * - Inserts record into playerTechUnlocks
 */
async function processResearchCompletion() {
  const now = new Date();
  
  // Find all in-progress research projects
  const activeProjects = await db
    .select()
    .from(researchProjects)
    .where(
      and(
        eq(researchProjects.status, "in_progress"),
        lte(researchProjects.completesAt, now)
      )
    );
  
  for (const project of activeProjects) {
    try {
      // Check if research bay is powered (if it exists)
      const researchBays = await db
        .select()
        .from(stationModules)
        .where(
          and(
            eq(stationModules.playerId, project.playerId),
            eq(stationModules.moduleType, "research_bay"),
            eq(stationModules.isBuilt, true)
          )
        );
      
      // Skip completion if research bay exists but is unpowered
      if (researchBays.length > 0 && !researchBays[0].isPowered) {
        log(`[Research Tick] Research paused for player ${project.playerId}: research bay unpowered`);
        continue;
      }
      
      // Complete the research in a transaction
      await db.transaction(async (tx) => {
        // Update project status
        await tx
          .update(researchProjects)
          .set({
            status: "completed",
            completedAt: now,
          })
          .where(eq(researchProjects.id, project.id));
        
        // Add tech unlock
        await tx.insert(playerTechUnlocks).values({
          playerId: project.playerId,
          researchId: project.researchId,
          unlockedAt: now,
        });
      });
      
      log(`[Research Tick] Research completed: ${project.researchName} (${project.researchId}) for player ${project.playerId}`);
    } catch (error) {
      console.error(`[Research Tick] Error completing research for project ${project.id}:`, error);
    }
  }
}
