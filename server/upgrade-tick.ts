import { storage } from "./storage";
import { db } from "./db";
import { drones, extractionArrays } from "@shared/schema";
import { lte, and, isNotNull } from "drizzle-orm";
import { log } from "./vite";

/**
 * Upgrade Tick System
 * 
 * Runs periodically to complete upgrades for drones and extraction arrays:
 * - Finds all drones with upgradeCompletesAt <= now
 * - Finds all arrays with upgradeCompletesAt <= now
 * - Calls storage.completeDroneUpgrade / storage.completeArrayUpgrade for each
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

  log("[Upgrade Tick] Starting upgrade tick system");
  
  tickIntervalHandle = setInterval(async () => {
    try {
      await processUpgradeCompletions();
    } catch (error) {
      console.error("[Upgrade Tick] Error processing upgrades:", error);
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
