import { describe, test } from 'node:test';
import assert from 'node:assert';
import { RESEARCH_TREE } from '../schema.js';

describe('RESEARCH_TREE validation', () => {
  test('all prerequisite IDs reference existing technologies', () => {
    const techIds = new Set(RESEARCH_TREE.map(t => t.id));
    
    for (const tech of RESEARCH_TREE) {
      for (const prereqId of tech.prerequisites) {
        assert.strictEqual(
          techIds.has(prereqId),
          true,
          `Tech ${tech.id} has invalid prerequisite: ${prereqId}`
        );
      }
    }
  });

  test('research tree has no circular dependencies', () => {
    // Build dependency graph
    const graph = new Map<string, string[]>();
    for (const tech of RESEARCH_TREE) {
      graph.set(tech.id, tech.prerequisites);
    }
    
    // DFS to detect cycles
    function hasCycle(nodeId: string, visited: Set<string>, recursionStack: Set<string>): boolean {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      const prerequisites = graph.get(nodeId) || [];
      for (const prereqId of prerequisites) {
        if (!visited.has(prereqId)) {
          if (hasCycle(prereqId, visited, recursionStack)) {
            return true;
          }
        } else if (recursionStack.has(prereqId)) {
          return true; // Cycle detected
        }
      }
      
      recursionStack.delete(nodeId);
      return false;
    }
    
    const visited = new Set<string>();
    for (const tech of RESEARCH_TREE) {
      if (!visited.has(tech.id)) {
        const hasCircularDependency = hasCycle(tech.id, visited, new Set());
        assert.strictEqual(
          hasCircularDependency,
          false,
          `Circular dependency detected starting from tech: ${tech.id}`
        );
      }
    }
  });

  test('all technologies have required fields', () => {
    for (const tech of RESEARCH_TREE) {
      // Check id exists and is not empty
      assert.ok(tech.id, `Tech is missing id: ${JSON.stringify(tech)}`);
      
      // Check name exists and is not empty
      assert.ok(tech.name, `Tech ${tech.id} is missing name`);
      
      // Check category is valid
      assert.match(
        tech.category,
        /^(mining|ship|science_lab)$/,
        `Tech ${tech.id} has invalid category: ${tech.category}`
      );
      
      // Check duration is positive
      assert.ok(
        tech.duration > 0,
        `Tech ${tech.id} has invalid duration: ${tech.duration}`
      );
      
      // Check cost is an object
      assert.strictEqual(
        typeof tech.cost,
        'object',
        `Tech ${tech.id} cost must be an object`
      );
      assert.ok(tech.cost !== null, `Tech ${tech.id} cost cannot be null`);
      
      // Check bonuses is an object
      assert.strictEqual(
        typeof tech.bonuses,
        'object',
        `Tech ${tech.id} bonuses must be an object`
      );
      assert.ok(tech.bonuses !== null, `Tech ${tech.id} bonuses cannot be null`);
      
      // Check prerequisites is an array
      assert.ok(
        Array.isArray(tech.prerequisites),
        `Tech ${tech.id} prerequisites must be an array`
      );
    }
  });

  test('all technologies have unique IDs', () => {
    const idSet = new Set<string>();
    const duplicates: string[] = [];
    
    for (const tech of RESEARCH_TREE) {
      if (idSet.has(tech.id)) {
        duplicates.push(tech.id);
      }
      idSet.add(tech.id);
    }
    
    assert.strictEqual(
      duplicates.length,
      0,
      `Duplicate technology IDs found: ${duplicates.join(', ')}`
    );
  });

  test('cost object contains valid resource types', () => {
    const validResourceTypes = ['metal', 'crystals', 'credits', 'exotic', 'energyCells'];
    
    for (const tech of RESEARCH_TREE) {
      const costKeys = Object.keys(tech.cost);
      
      for (const key of costKeys) {
        assert.ok(
          validResourceTypes.includes(key),
          `Tech ${tech.id} has invalid cost resource type: ${key}`
        );
        
        // Check that cost values are positive numbers
        const costValue = tech.cost[key as keyof typeof tech.cost];
        assert.ok(
          typeof costValue === 'number' && costValue > 0,
          `Tech ${tech.id} has invalid cost value for ${key}: ${costValue}`
        );
      }
    }
  });

  test('bonuses object contains valid bonus types', () => {
    const validBonusTypes = [
      'miningEfficiency',
      'cargoCapacity',
      'droneSpeed',
      'shieldCapacity',
      'weaponDamage',
      'hullStrength',
      'researchSpeed',
      'researchCost',
    ];
    
    for (const tech of RESEARCH_TREE) {
      const bonusKeys = Object.keys(tech.bonuses);
      
      // Each tech should have at least one bonus
      assert.ok(
        bonusKeys.length > 0,
        `Tech ${tech.id} must have at least one bonus`
      );
      
      for (const key of bonusKeys) {
        assert.ok(
          validBonusTypes.includes(key),
          `Tech ${tech.id} has invalid bonus type: ${key}`
        );
        
        // Check that bonus values are positive numbers
        const bonusValue = tech.bonuses[key as keyof typeof tech.bonuses];
        assert.ok(
          typeof bonusValue === 'number' && bonusValue > 0,
          `Tech ${tech.id} has invalid bonus value for ${key}: ${bonusValue}`
        );
      }
    }
  });
});
