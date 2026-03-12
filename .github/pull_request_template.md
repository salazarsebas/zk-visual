## What this PR does

A brief description of the changes.

## Type of change

- [ ] New circuit visualization
- [ ] Bug fix
- [ ] UI improvement
- [ ] Documentation
- [ ] Other

## For new circuit visualizations

- [ ] Circuit follows the `generateSteps()` pattern (pre-computed, immutable steps)
- [ ] Graph objects are never mutated (spread + override only)
- [ ] No `x`/`y` coordinates set inside `generateSteps()`
- [ ] Field values use BigInt suffix (`3n`, not `3`)
- [ ] `totalConstraints` never decreases across steps
- [ ] Every step has a clear `description`
- [ ] Circuit is registered in `src/lib/circuits/index.ts`
- [ ] Constraint count matches `docs/zk/gadgets.md` (if applicable)

## Checklist

- [ ] `bun test` passes
- [ ] Tested in browser (dev server)
- [ ] No new dependencies added (or justified if added)

## Screenshots

If applicable, add screenshots or a screen recording of the visualization.
