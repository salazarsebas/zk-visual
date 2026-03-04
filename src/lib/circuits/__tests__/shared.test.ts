import { describe, it, expect } from 'bun:test';
import {
  fieldMod,
  fieldAdd,
  fieldSub,
  fieldMul,
  fieldInv,
  SMALL_PRIME,
  createNode,
  createEdge,
  buildGraph,
  withNodeState,
  withEdgeValue,
} from '../shared';

describe('Field Arithmetic', () => {
  const p = SMALL_PRIME; // 17n

  it('fieldMod handles positive values', () => {
    expect(fieldMod(20n, p)).toBe(3n);
    expect(fieldMod(17n, p)).toBe(0n);
    expect(fieldMod(0n, p)).toBe(0n);
  });

  it('fieldMod handles negative values', () => {
    expect(fieldMod(-1n, p)).toBe(16n);
    expect(fieldMod(-17n, p)).toBe(0n);
    expect(fieldMod(-3n, p)).toBe(14n);
  });

  it('fieldAdd is correct mod p', () => {
    expect(fieldAdd(10n, 10n, p)).toBe(3n); // 20 mod 17 = 3
    expect(fieldAdd(0n, 0n, p)).toBe(0n);
    expect(fieldAdd(16n, 1n, p)).toBe(0n); // 17 mod 17 = 0
  });

  it('fieldSub is correct mod p', () => {
    expect(fieldSub(10n, 3n, p)).toBe(7n);
    expect(fieldSub(3n, 10n, p)).toBe(10n); // -7 mod 17 = 10
    expect(fieldSub(0n, 1n, p)).toBe(16n);
  });

  it('fieldMul is correct mod p', () => {
    expect(fieldMul(3n, 5n, p)).toBe(15n);
    expect(fieldMul(3n, 6n, p)).toBe(1n); // 18 mod 17 = 1
    expect(fieldMul(0n, 5n, p)).toBe(0n);
  });

  it('fieldInv computes modular inverse', () => {
    // 3 * 6 = 18 ≡ 1 (mod 17), so inv(3) = 6
    expect(fieldInv(3n, p)).toBe(6n);
    expect(fieldMul(3n, fieldInv(3n, p), p)).toBe(1n);

    // Test all non-zero elements have inverses
    for (let i = 1n; i < p; i++) {
      expect(fieldMul(i, fieldInv(i, p), p)).toBe(1n);
    }
  });

  it('fieldInv throws for zero', () => {
    expect(() => fieldInv(0n, p)).toThrow();
  });
});

describe('Graph Helpers', () => {
  it('createNode sets inactive state and no coordinates', () => {
    const node = createNode('a', 'input', 'a');
    expect(node.state).toBe('inactive');
    expect(node.x).toBeUndefined();
    expect(node.y).toBeUndefined();
  });

  it('createEdge sets inactive state', () => {
    const edge = createEdge('e1', 'a', 'b');
    expect(edge.state).toBe('inactive');
    expect(edge.value).toBeUndefined();
  });

  it('withNodeState returns new graph without mutating original', () => {
    const graph = buildGraph(
      [createNode('a', 'input', 'a')],
      [],
    );
    const updated = withNodeState(graph, 'a', 'active');
    expect(updated.nodes[0].state).toBe('active');
    expect(graph.nodes[0].state).toBe('inactive');
    expect(updated).not.toBe(graph);
  });

  it('withEdgeValue sets carrying state and value', () => {
    const graph = buildGraph(
      [createNode('a', 'input', 'a'), createNode('b', 'output', 'b')],
      [createEdge('e1', 'a', 'b')],
    );
    const updated = withEdgeValue(graph, 'e1', 42n);
    expect(updated.edges[0].state).toBe('carrying');
    expect(updated.edges[0].value).toBe(42n);
    expect(graph.edges[0].state).toBe('inactive');
  });
});
