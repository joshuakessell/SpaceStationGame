import { RESEARCH_TREE, type PlayerTechUnlock } from "@shared/schema";
import memoizee from "memoizee";

export interface ResearchBonuses {
  miningEfficiency: number;
  cargoCapacity: number;
  droneSpeed: number;
  shieldCapacity: number;
  weaponDamage: number;
  hullStrength: number;
  researchSpeed: number;
  researchCost: number;
}

export function calculateResearchBonuses(techUnlocks: PlayerTechUnlock[]): ResearchBonuses {
  const bonuses: ResearchBonuses = {
    miningEfficiency: 1.0,
    cargoCapacity: 1.0,
    droneSpeed: 1.0,
    shieldCapacity: 1.0,
    weaponDamage: 1.0,
    hullStrength: 1.0,
    researchSpeed: 1.0,
    researchCost: 1.0,
  };
  
  const unlockedIds = new Set(techUnlocks.map(u => u.researchId));
  
  for (const researchId of Array.from(unlockedIds)) {
    const tech = RESEARCH_TREE.find(t => t.id === researchId);
    if (!tech) continue;
    
    if (tech.bonuses.miningEfficiency) {
      bonuses.miningEfficiency += tech.bonuses.miningEfficiency;
    }
    if (tech.bonuses.cargoCapacity) {
      bonuses.cargoCapacity += tech.bonuses.cargoCapacity;
    }
    if (tech.bonuses.droneSpeed) {
      bonuses.droneSpeed += tech.bonuses.droneSpeed;
    }
    if (tech.bonuses.shieldCapacity) {
      bonuses.shieldCapacity += tech.bonuses.shieldCapacity;
    }
    if (tech.bonuses.weaponDamage) {
      bonuses.weaponDamage += tech.bonuses.weaponDamage;
    }
    if (tech.bonuses.hullStrength) {
      bonuses.hullStrength += tech.bonuses.hullStrength;
    }
    
    if (tech.bonuses.researchSpeed) {
      bonuses.researchSpeed -= tech.bonuses.researchSpeed;
    }
    if (tech.bonuses.researchCost) {
      bonuses.researchCost -= tech.bonuses.researchCost;
    }
  }
  
  return bonuses;
}

export const getCachedResearchBonuses = memoizee(
  calculateResearchBonuses,
  {
    normalizer: (args: [PlayerTechUnlock[]]) => {
      return args[0].map(u => u.researchId).sort().join(",");
    },
    maxAge: 5000,
  }
);
