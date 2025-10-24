import { storage } from "./storage";
import { log } from "./vite";
import { getEffectiveDroneStats } from "@shared/schema";

/**
 * Mission Lifecycle Tick System
 * 
 * Runs periodically to update mission states based on timestamps:
 * - traveling → mining (when now >= arrivalAt)
 * - mining → returning (when now >= completesAt)
 * - returning → completed (when now >= returnAt)
 * 
 * When a mission completes:
 * - Delivers Iron resources to player
 * - Depletes the resource node
 * - Sets drone back to idle
 */

const TICK_INTERVAL = 5000; // 5 seconds
let tickIntervalHandle: NodeJS.Timeout | null = null;

export function startMissionTickSystem() {
  // Prevent multiple tick systems from running
  if (tickIntervalHandle) {
    log("[Mission Tick] Tick system already running, skipping");
    return;
  }

  log("[Mission Tick] Starting mission lifecycle tick system");
  
  tickIntervalHandle = setInterval(async () => {
    try {
      await processMissionLifecycle();
    } catch (error) {
      console.error("[Mission Tick] Error processing missions:", error);
    }
  }, TICK_INTERVAL);
}

export function stopMissionTickSystem() {
  if (tickIntervalHandle) {
    clearInterval(tickIntervalHandle);
    tickIntervalHandle = null;
    log("[Mission Tick] Stopped mission lifecycle tick system");
  }
}

async function processMissionLifecycle() {
  // Get all active missions (not completed or cancelled)
  const missions = await storage.getAllActiveMissions();
  const now = new Date();
  
  for (const mission of missions) {
    // Handle state transitions based on timestamps
    if (mission.status === "traveling" && mission.arrivalAt && now >= mission.arrivalAt) {
      // Drone has arrived, start mining
      if (mission.droneId) {
        await storage.updateMission(mission.id, { status: "mining" });
        await storage.updateDrone(mission.droneId, { status: "mining" });
        log(`[Mission Tick] Mission ${mission.id} started mining`);
      }
    } 
    else if (mission.status === "mining" && mission.completesAt && now >= mission.completesAt) {
      // Mining complete, start return trip
      if (mission.droneId) {
        await storage.updateMission(mission.id, { status: "returning" });
        await storage.updateDrone(mission.droneId, { status: "returning" });
        log(`[Mission Tick] Mission ${mission.id} started returning`);
      }
    }
    else if (mission.status === "returning" && mission.returnAt && now >= mission.returnAt) {
      // Mission complete, deliver resources
      await completeMission(mission.id, mission.playerId);
      log(`[Mission Tick] Mission ${mission.id} completed`);
    }
  }
}

async function completeMission(missionId: string, playerId: string) {
  const mission = await storage.getMission(missionId);
  if (!mission || !mission.droneId || !mission.targetNodeId) return;
  
  const drone = await storage.getDrone(mission.droneId);
  if (!drone) return;
  
  // Use effective stats (with upgrades applied)
  const effectiveStats = getEffectiveDroneStats(drone);
  
  const result = await storage.atomicCompleteMission(
    missionId,
    "returning",
    playerId,
    mission.targetNodeId,
    mission.droneId,
    effectiveStats.cargoCapacity
  );
  
  if (!result.success) {
    log(`[Mission Tick] Mission ${missionId} already completed by another process`);
    return;
  }
  
  log(`[Mission Tick] Mission ${missionId} completed, collected ${result.ironCollected} Iron`);
}
