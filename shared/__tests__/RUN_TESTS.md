# Running Research Tree Validation Tests

## Quick Start

Run the validation tests with this single command:

```bash
npx tsx --test shared/__tests__/research-tree.test.ts
```

## Expected Output

When all validations pass, you'll see:

```
▶ RESEARCH_TREE validation
  ✔ all prerequisite IDs reference existing technologies
  ✔ research tree has no circular dependencies
  ✔ all technologies have required fields
  ✔ all technologies have unique IDs
  ✔ cost object contains valid resource types
  ✔ bonuses object contains valid bonus types
✔ RESEARCH_TREE validation

ℹ tests 6
ℹ pass 6
ℹ fail 0
```

## When to Run These Tests

Run validation tests:
- **Before committing** changes to RESEARCH_TREE
- **After adding** new technologies to the tree
- **When modifying** prerequisite relationships
- **As part of CI/CD** pipeline

## What Happens if Tests Fail?

### Invalid Prerequisite Example
If you reference a non-existent technology:
```
AssertionError: Tech MD-002 has invalid prerequisite: MD-999
```
**Fix**: Update the prerequisite ID to match an existing technology.

### Circular Dependency Example
If technologies have circular prerequisites:
```
AssertionError: Circular dependency detected starting from tech: MD-001
```
**Fix**: Remove the circular reference by restructuring prerequisites.

### Invalid Field Example
If a technology has an invalid category:
```
AssertionError: Tech SR-004 has invalid category: weapons
```
**Fix**: Change category to one of: mining, ship, science_lab

## Manual Validation Script (Alternative)

If you prefer not to use the test runner, you can run the validation as a simple script:

```bash
npx tsx -e "import('./shared/__tests__/research-tree.test.ts')"
```

## Continuous Integration

Add to your CI workflow (e.g., `.github/workflows/test.yml`):

```yaml
- name: Validate Research Tree
  run: npx tsx --test shared/__tests__/research-tree.test.ts
```
