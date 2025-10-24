# Research Tree Validation Tests

This directory contains automated validation tests for the RESEARCH_TREE configuration.

## Running the Tests

The test suite uses Node.js's built-in test runner and can be executed with:

```bash
npx tsx --test shared/__tests__/research-tree.test.ts
```

Or run all tests in the __tests__ directory:

```bash
npx tsx --test shared/__tests__/*.test.ts
```

## What Gets Validated

### 1. Valid Prerequisite IDs
Ensures all prerequisite technology IDs reference existing technologies in the tree.

**Example Error**: If a tech lists `"MD-999"` as a prerequisite but `MD-999` doesn't exist in RESEARCH_TREE, the test will fail with:
```
Tech MD-002 has invalid prerequisite: MD-999
```

### 2. No Circular Dependencies (Acyclic Structure)
Verifies the research tree has no circular dependencies using depth-first search.

**Example Error**: If `MD-001` requires `MD-002` and `MD-002` requires `MD-001`, the test will fail with:
```
Circular dependency detected starting from tech: MD-001
```

### 3. Basic Structure Validation
Checks that all technologies have required fields with valid values:
- `id` (non-empty string)
- `name` (non-empty string)
- `category` (must be "mining", "ship", or "science_lab")
- `duration` (positive number)
- `cost` (object)
- `bonuses` (object)

### 4. Unique Technology IDs
Ensures no duplicate technology IDs exist in the tree.

### 5. Valid Resource Types in Costs
Verifies that cost objects only contain valid resource types (metal, crystals, credits, exotic, energyCells) and all values are positive numbers.

### 6. Valid Bonus Types
Ensures bonus objects only contain recognized bonus types (miningEfficiency, cargoCapacity, droneSpeed, etc.) and all values are positive numbers.

## Adding New Tests

To add a new test case, add it to the describe block in `research-tree.test.ts`:

```typescript
test('your test description', () => {
  // Your test logic here
  assert.strictEqual(actual, expected, 'Error message');
});
```

## Integration with CI/CD

To run these tests automatically, add a test script to your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run validation tests
  run: npx tsx --test shared/__tests__/*.test.ts
```
