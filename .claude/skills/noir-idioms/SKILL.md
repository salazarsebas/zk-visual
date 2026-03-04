# Skill: noir-idioms

user-invocable: false

Idiomatic Noir patterns for ZK circuits. Invoked automatically when reviewing or writing Noir code.

---

## Principle 0 — assert() es el constraint

En Noir, `assert()` es la única forma de generar un constraint. No existe `<==` ni `===` — la constraint ES la aserción.

```noir
// BAD: computa pero no constrains nada
let result = a * b;

// GOOD: computa Y constrains
let result = a * b;
assert(result == expected);  // genera 1 constraint
```

`assert(a == b)` compila a una constraint de igualdad en ACIR. Sin `assert`, ningún cálculo genera constraints.

---

## Principle 1 — unconstrained fn

La distinción más importante de Noir. Una `unconstrained fn` corre fuera del circuito — es un hint, igual que `<--` en Circom.

```noir
// Hint: corre off-circuit, no genera constraints
unconstrained fn compute_inverse(x: Field) -> Field {
    1 / x  // aritmética de campo, pero sin constraints
}

// Circuit function: los assert() dentro SÍ generan constraints
fn verify_inverse(x: Field, inv: Field) {
    assert(x * inv == 1);  // 1 constraint
}

// Patrón hint-and-verify:
fn safe_inverse(x: Field) -> Field {
    let inv = compute_inverse(x);  // hint (0 constraints)
    verify_inverse(x, inv);        // verify (1 constraint)
    inv
}
```

Usar `unconstrained` para: buscar bits, calcular inversas, ordenar arrays — cualquier cosa que se pueda verificar más barato de lo que cuesta computar.

---

## Principle 2 — Costo de operaciones

| Operación | Gates ACIR | Notas |
|---|---|---|
| `a * b` dentro de `assert` | **1** | Multiplication gate |
| `a + b`, `a - b` | **0** | Linear, absorbido en la gate |
| `assert(a == b)` con expresión lineal | **0** | Solo chequeo de igualdad |
| `assert(a == b * c)` | **1** | Una mult gate |
| División `a / b` | **1** | Via inverso multiplicativo |
| `a as bool` / range check 1 bit | **1** | |
| Range check k bits | **k** | Un assert por bit |
| `std::hash::poseidon` (2 inputs) | **~240** | Ver docs/zk/hash-functions.md |

**Nota:** el compilador de Noir optimiza ACIR antes de generar la prueba. El gate count final puede ser menor que la suma naive. Usar `nargo info` para el número oficial.

---

## Principle 3 — bool tiene constraints implícitas

A diferencia de `Field`, el tipo `bool` de Noir genera automáticamente la constraint de rango `b * (1 - b) === 0` al declarar la variable.

```noir
// bool: Noir agrega la range constraint automáticamente
fn check_bit(b: bool) {
    // b ya está constrainado a {0, 1} por su tipo
    assert(b == true);  // solo 1 assert adicional
}

// Field: sin constraints de rango automáticas
fn check_field_bit(b: Field) {
    assert(b * (1 - b) == 0);  // necesitas hacerlo explícito — 1 constraint
    assert(b == 1);
}
```

Usar `bool` cuando el signal debe ser booleano — el compilador lo maneja. Usar `Field` solo cuando necesitas flexibilidad de tipo.

---

## Principle 4 — Arrays y loops

```noir
// Los loops for se unrollan en tiempo de compilación — generan N copias del body
fn sum_bits(bits: [Field; 8]) -> Field {
    let mut acc: Field = 0;
    for i in 0..8 {
        assert(bits[i] * (1 - bits[i]) == 0);  // 8 constraints (unrolled)
        acc = acc + bits[i] * (1 << i as Field);
    }
    acc
}
```

`for` en Noir es un macro de compilación — el rango debe ser una constante. No existen loops dinámicos en el circuito.

Los arrays de tamaño variable requieren un tamaño máximo fijo con padding.

---

## Principle 5 — Conteo real de gates

Solo los `assert()` que contienen multiplicaciones generan gates de multiplicación. Las operaciones lineales son "gratis" dentro de un assert.

```noir
fn example(a: Field, b: Field, c: Field) -> Field {
    let ab = a * b;
    assert(ab == c);           // 1 gate (mult: a*b)
    let sum = a + b + c;
    assert(sum == a + b + c);  // 0 gates (lineal)
    let abc = ab * c;
    assert(abc != 0);          // 1 gate (mult: ab*c)
    abc
    // Total: 2 gates de multiplicación
}
```

Para el gate count oficial: `nargo info --package <name>` reporta `Circuit size: N`.

---

## Checklist de review

| Red flag | Qué significa |
|---|---|
| Cálculo sin `assert` correspondiente | Variable no está constrainada — soundness hole |
| `unconstrained fn` que hace trabajo "de verdad" | Ok para hints; asegúrate de que haya un `assert` de verificación después |
| `Field` donde debería ser `bool` | Sin range constraint automática — agregar `assert(b*(1-b)==0)` |
| Loop con rango no-constante | No compila — los rangos deben ser literales o `global` |
| División directa sin hint | Puede fallar en el prover si el denominador es 0 — usar `unconstrained` para el hint |
| `assert(false)` | Constraint que nunca se satisface — circuit siempre falla |
