import type { Circuit } from '../types';

import {
  whatIsZKCircuit,
  arithmeticCircuitCircuit,
  signalsConstraintsCircuit,
  publicPrivateCircuit,
  witnessGenCircuit,
} from './foundations';

import {
  bitDecompositionCircuit,
  rangeCheckCircuit,
  booleanCircuit,
  muxCircuit,
} from './gadgets';

import { hashComparisonCircuit } from './hashes';
import { merkleProofCircuit } from './merkle';
import { provingSystemsCircuit } from './proving-systems';

const ALL_CIRCUITS: Circuit[] = [
  // Category 1: Foundations
  whatIsZKCircuit,
  arithmeticCircuitCircuit,
  signalsConstraintsCircuit,
  publicPrivateCircuit,
  witnessGenCircuit,
  // Category 2: Core Gadgets
  bitDecompositionCircuit,
  rangeCheckCircuit,
  booleanCircuit,
  muxCircuit,
  // Category 3: Hash Functions
  hashComparisonCircuit,
  // Category 4: Merkle Trees
  merkleProofCircuit,
  // Category 5: Proving Systems
  provingSystemsCircuit,
];

// Map from slug (e.g. "bit-decomposition") to circuit
const slugMap = new Map<string, Circuit>();
const idMap = new Map<string, Circuit>();

for (const circuit of ALL_CIRCUITS) {
  idMap.set(circuit.id, circuit);
  const slug = circuit.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  slugMap.set(slug, circuit);
}

export function getAllCircuits(): Circuit[] {
  return ALL_CIRCUITS;
}

export function getCircuitById(id: string): Circuit | undefined {
  return idMap.get(id);
}

export function getCircuitBySlug(slug: string): Circuit | undefined {
  return slugMap.get(slug);
}

export function getCircuitsByCategory(category: string): Circuit[] {
  return ALL_CIRCUITS.filter((c) => c.category === category);
}

export function getCircuitSlug(circuit: Circuit): string {
  return circuit.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
