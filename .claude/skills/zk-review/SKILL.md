# Skill: zk-review

user-invocable: true
description: 5-check correctness review of a circuit TypeScript file before production
allowed-tools: Read, Grep, Glob

## Usage

```
/zk-review <filepath>
```

Example:
- `/zk-review src/lib/circuits/bit-decomp.ts`

---

## Workflow

Read the file at `$ARGUMENTS`. If not found, report the error and stop.

Run the following 5 checks in order. Collect results for the final table.

---

### Check 1 — Constraint Count

Goal: Verify that the maximum `totalConstraints` value across all steps matches the expected count in `docs/zk/gadgets.md`.

Steps:
1. Extract all `totalConstraints` values from the steps array
2. Find `max_count = max(totalConstraints)`
3. Read `docs/zk/gadgets.md`
4. Find the entry matching the circuit's template/gadget name (from the file's `circuit.id` or title)
5. Compare `max_count` with the expected value

Result:
- `✓` if `max_count === expected`
- `✗` if they differ — report both values
- `⚠` if circuit not found in gadgets.md — report the max count and note it's unverified

---

### Check 2 — Signal Name Consistency

Goal: Every key in any step's `signals: { ... }` object must appear in the `Circuit.code` string.

Steps:
1. Extract all unique signal names (keys) from all `signals` objects across all steps
2. Extract the `circuit.code` string
3. For each signal name, check that it appears as a substring in `circuit.code`

Result:
- `✓` if all signal names found in code
- `✗` list any signal names NOT found in code — these are likely typos
  - Show: `signals key 'foo' not found in circuit.code — possible typo`

---

### Check 3 — codeLine Validity

Goal: No `codeLine` value should exceed the number of lines in `Circuit.code`.

Steps:
1. Count lines in `circuit.code`: `lineCount = circuit.code.split('\n').length`
2. Extract all `codeLine` values from all steps
3. Check that every `codeLine` satisfies `1 <= codeLine <= lineCount`

Result:
- `✓` if all codeLine values are in range
- `✗` list any out-of-range values with the step index:
  - `Step 3: codeLine=47 exceeds circuit.code length (23 lines)`

---

### Check 4 — Satisfied/Violated Sanity

Goal: Steps that declare `satisfiedConstraints` or `violatedConstraints` (non-empty arrays) must also define at least one signal.

Steps:
1. For each step, check: if `satisfiedConstraints.length > 0` OR `violatedConstraints.length > 0`, then `Object.keys(signals).length > 0`

Result:
- `✓` if all steps with constraints also have signals
- `⚠` warn for any step that has constraints but no signals:
  - `Step 2: has satisfiedConstraints=[0] but signals is empty — reviewer cannot verify`

---

### Check 5 — Step Progression

Goal: `totalConstraints` must be monotonically non-decreasing across all steps, and must never exceed the final constraint count.

Steps:
1. Extract all `totalConstraints` values in order: `[c0, c1, c2, ...]`
2. Check: `c[i] <= c[i+1]` for all i (no decreases)
3. Check: `c[last] === max_count` (the final step should reach the maximum)

Result:
- `✓` if monotonically non-decreasing and final step matches max
- `✗` report any decrease:
  - `Steps 3→4: totalConstraints goes from 3 to 2 (must not decrease)`
- `⚠` if final step doesn't reach the maximum:
  - `Final step has totalConstraints=2 but max across all steps is 4`

---

## Output Format

```
zk-review: <filepath>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Check 1 — Constraint count:      ✓ / ✗ / ⚠
Check 2 — Signal name consistency: ✓ / ✗
Check 3 — codeLine validity:     ✓ / ✗
Check 4 — Satisfied/violated sanity: ✓ / ⚠
Check 5 — Step progression:      ✓ / ✗ / ⚠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If all 5 checks pass:
```
✓ All checks passed. Ready for domain expert review.
  See docs/technical/testing-correctness.md §7 for the full review checklist.
```

If any check fails, list the specific issues under each failed check before the summary table.
