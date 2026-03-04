# Skill: circom-idioms

user-invocable: false

Idiomatic Circom patterns for ZK circuits. Invoked automatically when reviewing or writing Circom code.

---

## Principle 0 — Hint-and-Verify

Use `<--` (hint, no constraint) + manual `===` constraint instead of `<==` when the value is computed off-circuit more efficiently, or when the compiler can't derive the inverse expression automatically.

```circom
// BAD: compiler can't derive the inverse of a complex expression
signal output inv <== 1 / x;  // won't compile or will be wrong

// GOOD: hint the value, then constrain it
signal output inv;
inv <-- 1 / x;           // hint: compute off-circuit
inv * x === 1;           // constraint: verify the relationship holds
```

The compiler only verifies that `<==` expressions are quadratic. For non-quadratic or complex relationships, always hint-and-verify.

---

## Principle 1 — Operation Costs

| Operation | Constraints | Notes |
|---|---|---|
| Multiplication (`a * b <== c`) | **1** | One R1CS row |
| Addition / subtraction | **0** | Absorbed into A, B, C vectors |
| Division (`a / b`) | **1** | Via multiplicative inverse: hint `inv <-- 1/b`, constrain `b * inv === 1`, then `a * inv <== result` |
| `LessThan(k)` | **k+1** | Always specify bit width explicitly |
| `IsZero()` | **1** | Standard component |
| `AND(k bits)` | **k** | One mult per bit pair |

**Always specify bit width** for comparison components. `LessThan(32)` not `LessThan`.

---

## Principle 2 — Boolean Signals

Circom has no boolean type. You must add the constraint manually:

```circom
signal input b;
b * (1 - b) === 0;   // enforces b ∈ {0, 1}
```

Every signal intended to be boolean needs this constraint. Missing it is a soundness bug — a prover can assign any field value.

---

## Principle 3 — Template vs Function

```circom
// template: generates constraints, has signals, instantiated with component
template IsZero() {
    signal input in;
    signal output out;
    signal inv;
    inv <-- in != 0 ? 1/in : 0;
    out <== -in * inv + 1;
    in * out === 0;
}

// function: compile-time only, no signals, no constraints — like a macro
function log2(n) {
    var result = 0;
    var remaining = n;
    while (remaining > 1) { remaining >>= 1; result++; }
    return result;
}
```

Use `template` for anything that generates constraints. Use `function` only for compile-time constants and array size calculations.

---

## Principle 4 — Array Signals

```circom
// BAD: hard to loop over, verbose
signal input b0;
signal input b1;
signal input b2;
signal input b3;

// GOOD: array signal, compatible with for loops
signal input bits[4];
for (var i = 0; i < 4; i++) {
    bits[i] * (1 - bits[i]) === 0;
}
```

Use array signals for any group of related signals. Name them semantically (`bits[k]`, `inputs[n]`, `limbs[3]`).

---

## Principle 5 — Real Constraint Count

Only `<==` and `===` generate constraints. `<--` is a hint with zero constraints.

**Count constraints = count multiplication gates in the R1CS.**

```circom
template Example() {
    signal input a, b, c;
    signal output out;

    signal ab;
    ab <== a * b;         // constraint 0: ab = a*b
    out <== ab * c;       // constraint 1: out = ab*c
    // Total: 2 constraints
}
```

Linear combinations (`a + b`, `3*a - 1`) have zero constraint cost — they're encoded in the A/B/C vectors directly.

---

## Review Checklist

| Red flag | What it means |
|---|---|
| Signal declared but no `<==`, `===`, or `<--` | Signal is unconstrained — soundness hole |
| `<==` with non-quadratic expression | Will fail to compile or produce wrong R1CS |
| Division without hint (`a/b <==` directly) | Compiler may reject or produce unsound constraint |
| `LessThan` without bit count | Template instantiation will fail |
| Boolean signal without `b*(1-b)===0` | Prover can assign any value — soundness bug |
| Component instantiated but output never used | Constraints still count, output is wasted |
