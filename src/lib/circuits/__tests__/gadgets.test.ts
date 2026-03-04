import { describe, it, expect } from 'bun:test';
import {
  bitDecompositionCircuit,
  rangeCheckCircuit,
  booleanCircuit,
  muxCircuit,
} from '../gadgets';

describe('Bit Decomposition (2.1)', () => {
  it('optimized has max 3 constraints for 3-bit', () => {
    const steps = bitDecompositionCircuit.optimized.generateSteps();
    const maxConstraints = Math.max(...steps.map((s) => s.totalConstraints));
    expect(maxConstraints).toBe(3);
  });

  it('naive has 256 constraints', () => {
    const steps = bitDecompositionCircuit.naive.generateSteps();
    const maxConstraints = Math.max(...steps.map((s) => s.totalConstraints));
    expect(maxConstraints).toBe(256);
  });

  it('totalConstraints never decreases', () => {
    const steps = bitDecompositionCircuit.optimized.generateSteps();
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].totalConstraints).toBeGreaterThanOrEqual(
        steps[i - 1].totalConstraints,
      );
    }
  });

  it('every step has a description', () => {
    const steps = bitDecompositionCircuit.generateSteps();
    steps.forEach((s) => {
      expect(s.description).toBeTruthy();
    });
  });
});

describe('Range Check (2.2)', () => {
  it('has 3 constraints', () => {
    const steps = rangeCheckCircuit.generateSteps();
    const maxConstraints = Math.max(...steps.map((s) => s.totalConstraints));
    expect(maxConstraints).toBe(3);
  });

  it('totalConstraints never decreases', () => {
    const steps = rangeCheckCircuit.generateSteps();
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].totalConstraints).toBeGreaterThanOrEqual(
        steps[i - 1].totalConstraints,
      );
    }
  });
});

describe('Boolean Constraint (2.3)', () => {
  it('has exactly 1 constraint', () => {
    const steps = booleanCircuit.generateSteps();
    const maxConstraints = Math.max(...steps.map((s) => s.totalConstraints));
    expect(maxConstraints).toBe(1);
  });

  it('shows violation for x=2', () => {
    const steps = booleanCircuit.generateSteps();
    const violated = steps.find((s) => s.violatedConstraints && s.violatedConstraints.length > 0);
    expect(violated).toBeTruthy();
  });
});

describe('MUX (2.4)', () => {
  it('has 3 constraints', () => {
    const steps = muxCircuit.generateSteps();
    const maxConstraints = Math.max(...steps.map((s) => s.totalConstraints));
    expect(maxConstraints).toBe(3);
  });

  it('output is correct (s=1 selects a=7)', () => {
    const steps = muxCircuit.generateSteps();
    const finalStep = steps[steps.length - 1];
    expect(finalStep.signals?.out).toBe(7n);
  });
});
