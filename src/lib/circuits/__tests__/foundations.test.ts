import { describe, it, expect } from 'bun:test';
import {
  whatIsZKCircuit,
  arithmeticCircuitCircuit,
  signalsConstraintsCircuit,
  publicPrivateCircuit,
  witnessGenCircuit,
} from '../foundations';
import { getAllCircuits } from '../index';

describe('What is a ZK Proof (1.1)', () => {
  it('uses pipeline, no graph', () => {
    const steps = whatIsZKCircuit.generateSteps();
    steps.forEach((s) => {
      expect(s.graph).toBeUndefined();
    });
    const hasPipeline = steps.some((s) => s.pipeline);
    expect(hasPipeline).toBe(true);
  });

  it('has 0 constraints', () => {
    const steps = whatIsZKCircuit.generateSteps();
    steps.forEach((s) => {
      expect(s.totalConstraints).toBe(0);
    });
  });
});

describe('Arithmetic Circuits (1.2)', () => {
  it('has 2 multiplication constraints', () => {
    const steps = arithmeticCircuitCircuit.generateSteps();
    const maxConstraints = Math.max(...steps.map((s) => s.totalConstraints));
    expect(maxConstraints).toBe(2);
  });

  it('has a graph with nodes', () => {
    const steps = arithmeticCircuitCircuit.generateSteps();
    const withGraph = steps.find((s) => s.graph);
    expect(withGraph).toBeTruthy();
    expect(withGraph!.graph!.nodes.length).toBeGreaterThan(0);
  });
});

describe('Signals and Constraints (1.3)', () => {
  it('totalConstraints never decreases', () => {
    const steps = signalsConstraintsCircuit.generateSteps();
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].totalConstraints).toBeGreaterThanOrEqual(
        steps[i - 1].totalConstraints,
      );
    }
  });
});

describe('Public vs Private (1.4)', () => {
  it('has nodes with isPublic flag', () => {
    const steps = publicPrivateCircuit.generateSteps();
    const withGraph = steps.find((s) => s.graph);
    expect(withGraph).toBeTruthy();
    const publicNodes = withGraph!.graph!.nodes.filter((n) => n.isPublic);
    const privateNodes = withGraph!.graph!.nodes.filter((n) => n.isPublic === false);
    expect(publicNodes.length).toBeGreaterThan(0);
    expect(privateNodes.length).toBeGreaterThan(0);
  });
});

describe('Witness Generation (1.5)', () => {
  it('every step has a description', () => {
    const steps = witnessGenCircuit.generateSteps();
    steps.forEach((s) => {
      expect(s.description).toBeTruthy();
    });
  });

  it('generates at least 5 steps', () => {
    const steps = witnessGenCircuit.generateSteps();
    expect(steps.length).toBeGreaterThanOrEqual(5);
  });
});

describe('Circuit Registry', () => {
  it('has 12 P0 circuits', () => {
    const all = getAllCircuits();
    expect(all.length).toBe(12);
  });

  it('all circuits have unique ids', () => {
    const all = getAllCircuits();
    const ids = new Set(all.map((c) => c.id));
    expect(ids.size).toBe(all.length);
  });

  it('every circuit generates at least 1 step', () => {
    const all = getAllCircuits();
    all.forEach((c) => {
      const steps = c.generateSteps();
      expect(steps.length).toBeGreaterThan(0);
    });
  });

  it('no step has x/y coordinates on nodes', () => {
    const all = getAllCircuits();
    all.forEach((c) => {
      const steps = c.generateSteps();
      steps.forEach((s) => {
        if (s.graph) {
          s.graph.nodes.forEach((n) => {
            expect(n.x).toBeUndefined();
            expect(n.y).toBeUndefined();
          });
        }
      });
    });
  });
});
