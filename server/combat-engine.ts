import { SHIP_CHASSIS, calculateShipStats, type Ship } from "@shared/schema";
import type { ResearchBonuses } from "./bonus-system";

export interface BattleShip {
  id: string;
  chassisId: string;
  name: string;
  currentHull: number;
  currentShields: number;
  maxHull: number;
  maxShields: number;
  weaponDamage: number;
  speed: number;
}

export interface TurnEvent {
  turn: number;
  attacker: string;
  target: string;
  damage: number;
  shieldsRemaining: number;
  hullRemaining: number;
  destroyed: boolean;
}

export interface BattleResult {
  victory: boolean;
  log: TurnEvent[];
  survivingPlayerShips: string[];
  destroyedPlayerShips: string[];
}

export function simulateBattle(
  playerShips: Ship[],
  enemyShips: any[],
  playerBonuses: ResearchBonuses
): BattleResult {
  const playerFleet: BattleShip[] = playerShips.map(ship => {
    const chassis = SHIP_CHASSIS.find(c => c.id === ship.chassisId)!;
    const stats = calculateShipStats(ship.chassisId, playerBonuses);
    
    return {
      id: ship.id,
      chassisId: ship.chassisId,
      name: ship.name || chassis.name,
      currentHull: ship.currentHull,
      currentShields: ship.currentShields,
      maxHull: stats.maxHull,
      maxShields: stats.maxShields,
      weaponDamage: stats.weaponDamage,
      speed: stats.speed,
    };
  });
  
  const enemyFleet: BattleShip[] = enemyShips.map(enemy => {
    const chassis = SHIP_CHASSIS.find(c => c.id === enemy.chassisId)!;
    
    return {
      id: enemy.id || `enemy-${Math.random()}`,
      chassisId: enemy.chassisId,
      name: enemy.name || chassis.name,
      currentHull: enemy.maxHull,
      currentShields: enemy.maxShields,
      maxHull: enemy.maxHull,
      maxShields: enemy.maxShields,
      weaponDamage: enemy.weaponDamage,
      speed: chassis.baseStats.speed,
    };
  });
  
  const log: TurnEvent[] = [];
  let turn = 1;
  
  while (turn <= 100) {
    const playerAlive = playerFleet.filter(s => s.currentHull > 0).length;
    const enemyAlive = enemyFleet.filter(s => s.currentHull > 0).length;
    
    if (playerAlive === 0 || enemyAlive === 0) {
      break;
    }
    
    const allShips = [...playerFleet, ...enemyFleet]
      .filter(s => s.currentHull > 0)
      .sort((a, b) => b.speed - a.speed);
    
    for (const attacker of allShips) {
      if (attacker.currentHull <= 0) continue;
      
      const isPlayerShip = playerFleet.some(s => s.id === attacker.id);
      const targetFleet = isPlayerShip ? enemyFleet : playerFleet;
      const aliveTargets = targetFleet.filter(s => s.currentHull > 0);
      
      if (aliveTargets.length === 0) break;
      
      const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
      
      let damage = attacker.weaponDamage;
      let shieldDamage = Math.min(damage, target.currentShields);
      target.currentShields -= shieldDamage;
      
      let hullDamage = damage - shieldDamage;
      target.currentHull -= hullDamage;
      
      log.push({
        turn,
        attacker: attacker.name,
        target: target.name,
        damage,
        shieldsRemaining: Math.max(0, target.currentShields),
        hullRemaining: Math.max(0, target.currentHull),
        destroyed: target.currentHull <= 0,
      });
    }
    
    turn++;
  }
  
  const finalPlayerAlive = playerFleet.filter(s => s.currentHull > 0);
  const finalEnemyAlive = enemyFleet.filter(s => s.currentHull > 0);
  
  return {
    victory: finalPlayerAlive.length > 0 && finalEnemyAlive.length === 0,
    log,
    survivingPlayerShips: finalPlayerAlive.map(s => s.id),
    destroyedPlayerShips: playerFleet.filter(s => s.currentHull <= 0).map(s => s.id),
  };
}

export function calculateShipStatsWithEquipment(
  ship: Ship,
  bonuses: ResearchBonuses,
  equipmentBonuses: { hull: number; shields: number; damage: number }
): BattleShip {
  const chassis = SHIP_CHASSIS.find(c => c.id === ship.chassisId)!;
  const baseStats = calculateShipStats(ship.chassisId, bonuses);
  
  return {
    id: ship.id,
    chassisId: ship.chassisId,
    name: ship.name || chassis.name,
    currentHull: ship.currentHull,
    currentShields: ship.currentShields,
    maxHull: baseStats.maxHull + equipmentBonuses.hull,
    maxShields: baseStats.maxShields + equipmentBonuses.shields,
    weaponDamage: baseStats.weaponDamage + equipmentBonuses.damage,
    speed: baseStats.speed,
  };
}

export interface AIFleetConfig {
  difficulty: "easy" | "medium" | "hard";
  shipCount: number;
}

export function generateAIFleet(config: AIFleetConfig): any[] {
  const difficulty = config.difficulty;
  
  const statMultipliers = {
    easy: 0.6,
    medium: 1.0,
    hard: 1.5,
  };
  
  const multiplier = statMultipliers[difficulty];
  
  const chassisPool = ["fighter", "corvette", "frigate"];
  if (difficulty === "medium") chassisPool.push("destroyer");
  if (difficulty === "hard") chassisPool.push("cruiser", "battleship");
  
  const fleet: any[] = [];
  
  for (let i = 0; i < config.shipCount; i++) {
    const chassisId = chassisPool[Math.floor(Math.random() * chassisPool.length)];
    const chassis = SHIP_CHASSIS.find(c => c.id === chassisId)!;
    
    fleet.push({
      id: `ai-${difficulty}-${i}`,
      chassisId,
      name: `Enemy ${chassis.name} ${i + 1}`,
      maxHull: Math.floor(chassis.baseStats.maxHull * multiplier),
      maxShields: Math.floor(chassis.baseStats.maxShields * multiplier),
      weaponDamage: Math.floor(chassis.baseStats.weaponDamage * multiplier),
    });
  }
  
  return fleet;
}
