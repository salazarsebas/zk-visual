# Skill: noir-check

user-invocable: true
description: Verify that a Noir function's gate count matches the expected value in docs/zk/gadgets.md
allowed-tools: Read, Grep, Bash

## Usage

```
/noir-check <function-name-or-filepath>
```

Examples:
- `/noir-check bit_decomposition`
- `/noir-check src/circuits/bit_decomp.nr`

---

## Workflow

### Step 1 — Localizar el archivo

Si `$ARGUMENTS` es una ruta de archivo, usarla directamente.

Si `$ARGUMENTS` es un nombre de función, buscarla:
```
Grep: pattern="fn $ARGUMENTS" glob="**/*.nr"
```

Si no se encuentra, reportar: "Función `$ARGUMENTS` no encontrada. Proporciona la ruta directamente."

### Step 2 — Conteo manual de gates

Leer el archivo. Para el cuerpo de la función objetivo:

- Contar cada `assert(... * ...)` → cada multiplicación dentro de un assert = 1 gate
- Contar `assert(a == b * c)` → 1 gate
- Contar `assert(a * b == c * d)` → 2 gates (dos multiplicaciones)
- **No contar:** operaciones lineales dentro de assert, `assert(a == b + c)`
- **No contar:** código dentro de `unconstrained fn` — esos son hints

Registrar: `direct_gates = count(multiplicaciones en asserts)`

### Step 3 — Sumar funciones llamadas

Encontrar todas las llamadas a funciones dentro de la función objetivo (excluyendo `unconstrained fn`).

Para cada función llamada, buscar su gate count en `docs/zk/gadgets.md`:
```
Read: docs/zk/gadgets.md
```

Sumar los conocidos: `subcircuit_gates = suma de counts encontrados`

Si el count de una función no está en gadgets.md, anotarlo como `desconocido`.

### Step 4 — Total

```
total = direct_gates + subcircuit_gates
```

### Step 5 — Comparar con el esperado

Buscar el nombre de la función en `docs/zk/gadgets.md`.

**Si se encuentra:**
- Coincide: `✓ <función>: $total gates (coincide con gadgets.md)`
- No coincide: `✗ <función>: contados $total, esperado $expected`
  - Mostrar desglose: gates directos por línea, contribuciones de subcircuitos

**Si no está en gadgets.md:**
- Reportar el count calculado y preguntar: "Count esperado no está en gadgets.md. Calculado: $total. ¿Lo agrego?"

---

## Fallback: usar nargo CLI (si está disponible)

Si `which nargo` devuelve una ruta, usar el toolchain oficial:

```bash
nargo info 2>&1
```

Buscar la línea `Circuit size: N` en el output. Este número es autoritativo.

Comparar con el valor esperado en gadgets.md y reportar igual que arriba.

Si nargo falla (no hay `Nargo.toml`, error de compilación, etc.), hacer fallback al conteo manual (Steps 2–5) e indicarlo.

---

## Formato de output

```
noir-check: <función>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Gates directos:        N
Funciones llamadas:
  some_fn × 1:         M
  other_fn × 2:        K
  unknown_fn:          ?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total:                 N+M+K (+ ? desconocido)
Esperado (gadgets.md): X
Resultado:             ✓ / ✗
```

Si se usó nargo: indicar `(via nargo info — count oficial)` junto al total.
