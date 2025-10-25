import { storage } from "./storage";
import { db } from "./db";
import { expeditions } from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";
import { log } from "./vite";

/**
 * Expedition Tick System (Phase 7b - Task 7b)
 * 
 * Runs every 30 seconds to process expedition cycles:
 * - Finds all active expeditions
 * - Checks if completion time has passed
 * - Updates status from "active" to "completed" when ready
 * - Players claim rewards via API endpoint
 */

const TICK_INTERVAL = 30000; // 30 seconds
let tickIntervalHandle: NodeJS.Timeout | null = null;

export function startExpeditionTickSystem() {
  // Prevent multiple tick systems from running
  if (tickIntervalHandle) {
    log("[Expedition Tick] Tick system already running, skipping");
    return;
  }

  log("[Expedition Tick] Starting expedition tick system");
  
  tickIntervalHandle = setInterval(async () => {
    try {
      await processExpeditions();
    } catch (error) {
      console.error("[Expedition Tick] Error processing expeditions:", error);
    }
  }, TICK_INTERVAL);
}

export function stopExpeditionTickSystem() {
  if (tickIntervalHandle) {
    clearInterval(tickIntervalHandle);
    tickIntervalHandle = null;
    log("[Expedition Tick] Stopped expedition tick system");
  }
}

async function processExpeditions() {
  const now = new Date();
  
  // Find all active expeditions that have completed
  const completedExpeditions = await db
    .select()
    .from(expeditions)
    .where(and(
      eq(expeditions.status, "active"),
      lt(expeditions.completesAt, now)
    ));
  
  if (completedExpeditions.length === 0) {
    return;
  }

  log(`[Expedition Tick] Processing ${completedExpeditions.length} completed expeditions`);

  for (const expedition of completedExpeditions) {
    try {
      await db
        .update(expeditions)
        .set({ 
          status: "completed",
          completedAt: new Date()
        })
        .where(eq(expeditions.id, expedition.id));
      
      log(`[Expedition Tick] Expedition ${expedition.id} completed (${expedition.aiCoreReward} AI Cores ready for claim)`);
    } catch (error) {
      console.error(`[Expedition Tick] Error updating expedition ${expedition.id}:`, error);
    }
  }
}
