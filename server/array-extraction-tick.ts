import { storage } from "./storage";
import { db } from "./db";
import { players, resourceNodes, stationModules, buildings } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { log } from "./vite";
import { getEffectiveArrayStats } from "@shared/schema";

/**
 * Array Extraction Tick System (Phase 4.4)
 * 
 * Runs every 10 seconds to process continuous crystal extraction:
 * - Finds all deployed arrays
 * - For each array, checks rift stability
 * - If rift is stable: extracts crystals, credits player, increments totalCrystalsExtracted
 * - If rift collapsed: decommissions array
 */

const TICK_INTERVAL = 10000; // 10 seconds
let tickIntervalHandle: NodeJS.Timeout | null = null;

export function startArrayExtractionTickSystem() {
  // Prevent multiple tick systems from running
  if (tickIntervalHandle) {
    log("[Array Extraction Tick] Tick system already running, skipping");
    return;
  }

  log("[Array Extraction Tick] Starting array extraction tick system");
  
  tickIntervalHandle = setInterval(async () => {
    try {
      await processArrayExtractions();
    } catch (error) {
      console.error("[Array Extraction Tick] Error processing array extractions:", error);
    }
  }, TICK_INTERVAL);
}

export function stopArrayExtractionTickSystem() {
  if (tickIntervalHandle) {
    clearInterval(tickIntervalHandle);
    tickIntervalHandle = null;
    log("[Array Extraction Tick] Stopped array extraction tick system");
  }
}

async function processArrayExtractions() {
  // Get all deployed arrays
  const deployedArrays = await storage.getAllDeployedArrays();
  
  if (deployedArrays.length === 0) {
    return;
  }

  for (const array of deployedArrays) {
    try {
      await processArrayExtractionSingle(array);
    } catch (error) {
      console.error(`[Array Extraction Tick] Error processing array ${array.id}:`, error);
    }
  }
}

async function processArrayExtractionSingle(array: any) {
  // Check if array bay is powered before processing extraction
  const isArrayBayPowered = await checkArrayBayPowered(array.playerId);
  
  if (!isArrayBayPowered) {
    log(`[Array Extraction Tick] Skipping array ${array.arrayName} - array bay not powered`);
    return;
  }
  
  // Get the rift this array is deployed to
  if (!array.targetRiftId) {
    log(`[Array Extraction Tick] Array ${array.arrayName} has no target rift, skipping`);
    return;
  }

  const rift = await storage.getResourceNode(array.targetRiftId);
  
  if (!rift) {
    log(`[Array Extraction Tick] Rift not found for array ${array.arrayName}, decommissioning`);
    await storage.updateExtractionArray(array.id, {
      status: 'decommissioned',
      targetRiftId: null,
    });
    return;
  }

  // Check if rift has collapsed
  if (rift.collapseAt || rift.isDepleted) {
    log(`[Array Extraction Tick] Rift ${rift.nodeName} has collapsed, decommissioning array ${array.arrayName}`);
    await storage.updateExtractionArray(array.id, {
      status: 'decommissioned',
      targetRiftId: null,
    });
    return;
  }

  // Check if rift has sufficient stability
  const currentStability = rift.stability || 0;
  if (currentStability <= 0) {
    log(`[Array Extraction Tick] Rift ${rift.nodeName} has no stability, decommissioning array ${array.arrayName}`);
    await storage.updateExtractionArray(array.id, {
      status: 'decommissioned',
      targetRiftId: null,
    });
    return;
  }

  // Extract crystals
  const stats = getEffectiveArrayStats(array);
  const crystalsExtracted = stats.extractionRate;

  // Credit player
  const [player] = await db
    .select()
    .from(players)
    .where(eq(players.id, array.playerId));

  if (!player) {
    log(`[Array Extraction Tick] Player not found for array ${array.arrayName}`);
    return;
  }

  // Get dynamic storage caps based on warehouse/silo levels
  const storageCaps = await storage.getPlayerStorageCaps(array.playerId);

  // Update player crystals (respecting max cap)
  const newCrystals = Math.min(
    player.crystals + crystalsExtracted,
    storageCaps.maxCrystals
  );

  await db
    .update(players)
    .set({
      crystals: newCrystals,
      lastUpdatedAt: new Date(),
    })
    .where(eq(players.id, array.playerId));

  // Update array's total crystals extracted
  await storage.updateExtractionArray(array.id, {
    totalCrystalsExtracted: array.totalCrystalsExtracted + crystalsExtracted,
  });

  log(`[Array Extraction Tick] Array ${array.arrayName} extracted ${crystalsExtracted} crystals from ${rift.nodeName}`);
}

async function checkArrayBayPowered(playerId: string): Promise<boolean> {
  // Check BOTH buildings and stationModules for array_bay
  const [arrayBay] = await db
    .select()
    .from(buildings)
    .where(and(
      eq(buildings.playerId, playerId),
      eq(buildings.buildingType, "array_bay"),
      eq(buildings.isBuilt, true)
    ))
    .limit(1);
  
  if (arrayBay) {
    return arrayBay.isPowered; // Return actual isPowered value
  }
  
  // Also check stationModules if no building found
  const [module] = await db
    .select()
    .from(stationModules)
    .where(and(
      eq(stationModules.playerId, playerId),
      eq(stationModules.moduleType, "array_bay"),
      eq(stationModules.isBuilt, true)
    ))
    .limit(1);
  
  return module ? module.isPowered : true; // Default to true if neither exists
}
