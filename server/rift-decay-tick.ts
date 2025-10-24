import { storage } from "./storage";
import { db } from "./db";
import { resourceNodes, extractionArrays } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { log } from "./vite";
import { getEffectiveArrayStats, RIFT_CONFIG } from "@shared/schema";

/**
 * Rift Decay Tick System (Phase 4.3)
 * 
 * Runs every 10 seconds to process rift stability decay:
 * - Finds all active rifts (collapseAt is null)
 * - Calculates passive decay: RIFT_CONFIG.passiveDecayPerTick
 * - Calculates extraction decay: sum of deployed arrays' extraction rates * extractionDecayMultiplier * volatility
 * - Reduces stability
 * - If stability <= 0, sets collapseAt and decommissions all attached arrays
 */

const TICK_INTERVAL = 10000; // 10 seconds
let tickIntervalHandle: NodeJS.Timeout | null = null;

export function startRiftDecayTickSystem() {
  // Prevent multiple tick systems from running
  if (tickIntervalHandle) {
    log("[Rift Decay Tick] Tick system already running, skipping");
    return;
  }

  log("[Rift Decay Tick] Starting rift decay tick system");
  
  tickIntervalHandle = setInterval(async () => {
    try {
      await processRiftDecay();
    } catch (error) {
      console.error("[Rift Decay Tick] Error processing rift decay:", error);
    }
  }, TICK_INTERVAL);
}

export function stopRiftDecayTickSystem() {
  if (tickIntervalHandle) {
    clearInterval(tickIntervalHandle);
    tickIntervalHandle = null;
    log("[Rift Decay Tick] Stopped rift decay tick system");
  }
}

async function processRiftDecay() {
  // Get all active rifts (not collapsed)
  const activeRifts = await storage.getAllActiveRifts();
  
  if (activeRifts.length === 0) {
    return;
  }

  for (const rift of activeRifts) {
    try {
      await processRiftDecaySingle(rift);
    } catch (error) {
      console.error(`[Rift Decay Tick] Error processing rift ${rift.id}:`, error);
    }
  }
}

async function processRiftDecaySingle(rift: any) {
  // Get all arrays deployed to this rift
  const deployedArrays = await db
    .select()
    .from(extractionArrays)
    .where(
      and(
        eq(extractionArrays.targetRiftId, rift.id),
        eq(extractionArrays.status, 'deployed')
      )
    );

  // Calculate passive decay
  let totalDecay = RIFT_CONFIG.passiveDecayPerTick;

  // Calculate extraction decay
  if (deployedArrays.length > 0) {
    for (const array of deployedArrays) {
      const stats = getEffectiveArrayStats(array);
      // Each crystal extracted causes additional decay
      const extractionDecay = stats.extractionRate * RIFT_CONFIG.extractionDecayMultiplier;
      totalDecay += extractionDecay;
    }
  }

  // Apply volatility modifier
  const volatility = rift.volatilityModifier || 1.0;
  totalDecay *= volatility;

  // Calculate new stability
  const currentStability = rift.stability || 0;
  const newStability = Math.max(0, currentStability - totalDecay);

  // Update rift
  if (newStability <= 0) {
    // Rift collapsed!
    await storage.updateResourceNode(rift.id, {
      stability: 0,
      collapseAt: new Date(),
      isDepleted: true,
      depletedAt: new Date(),
    });

    // Decommission all arrays attached to this rift
    for (const array of deployedArrays) {
      await storage.updateExtractionArray(array.id, {
        status: 'decommissioned',
        targetRiftId: null,
      });
      
      log(`[Rift Decay Tick] Array ${array.arrayName} decommissioned due to rift collapse`);
    }

    log(`[Rift Decay Tick] Rift ${rift.nodeName} collapsed`);
  } else {
    // Update stability
    await storage.updateResourceNode(rift.id, {
      stability: newStability,
    });
  }
}
