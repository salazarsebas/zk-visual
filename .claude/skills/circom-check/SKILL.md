# Skill: circom-check

user-invocable: true
description: Verify that a Circom template's constraint count matches the expected value in docs/zk/gadgets.md
allowed-tools: Read, Grep, Bash

## Usage

```
/circom-check <template-name-or-filepath>
```

Examples:
- `/circom-check BitDecomposition`
- `/circom-check src/circuits/bit-decomp.circom`

---

## Workflow

### Step 1 — Locate the file

If `$ARGUMENTS` is a file path, use it directly.

If `$ARGUMENTS` is a template name, search for it:
```
Grep: pattern="template $ARGUMENTS" glob="**/*.circom"
```

If not found, report: "Template `$ARGUMENTS` not found. Provide the file path directly."

### Step 2 — Read and count constraints manually

Read the file. For the target template body (between its opening `{` and closing `}`):

- Count every `<==` occurrence → each is 1 constraint
- Count every standalone `===` occurrence (not preceded by `<`) → each is 1 constraint
- **Exclude** lines inside subcircuit template definitions (nested `template` blocks)
- **Note:** `<--` lines are hints — 0 constraints

Record: `direct_constraints = count(<==) + count(===)`

### Step 3 — Sum subcircuit constraints

Find all `component x = SomeName(...)` instantiations in the template body.

For each instantiated component name, look up its constraint count in `docs/zk/gadgets.md`.

```
Read: docs/zk/gadgets.md
```

Sum the known counts: `subcircuit_constraints = sum of all found counts`

If a subcircuit's count is NOT in gadgets.md, note it as `unknown` and flag it in the output.

### Step 4 — Total

```
total = direct_constraints + subcircuit_constraints
```

### Step 5 — Compare with expected

Look up the template name in `docs/zk/gadgets.md` to find the expected constraint count.

**If found:**
- Match: report `✓ <TemplateName>: $total constraints (matches gadgets.md)`
- Mismatch: report `✗ <TemplateName>: counted $total, expected $expected`
  - Show breakdown: direct constraints per line, subcircuit contributions
  - Suggest where the divergence likely is

**If not found in gadgets.md:**
- Report the calculated count and ask: "Expected count not in gadgets.md. Calculated: $total. Should I add this entry?"

---

## Fallback: Use circom CLI (if available)

If `which circom` returns a path, run the official toolchain instead of manual counting:

```bash
circom $FILE --r1cs --output /tmp/ 2>&1
snarkjs r1cs info /tmp/$NAME.r1cs 2>&1
```

Extract the `# of Constraints` line from snarkjs output. This is authoritative.

Compare with gadgets.md expected value and report as above.

If circom CLI fails, fall back to manual counting (Steps 2–5).

---

## Output Format

```
circom-check: <TemplateName>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Direct constraints:    N
Subcircuits:
  SomeName × 1:        M
  OtherName × 2:       K
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total:                 N+M+K
Expected (gadgets.md): X
Result:                ✓ / ✗
```
