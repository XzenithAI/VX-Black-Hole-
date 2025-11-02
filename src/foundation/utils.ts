/**
 * Foundation Utilities
 *
 * Core utility functions for working with foundation types
 */

import { EntityId, Timestamp, Concept, Relation, Context } from './types';

// ============================================================================
// ID GENERATION
// ============================================================================

/**
 * Generate unique entity ID
 */
export function generateId(prefix?: string): EntityId {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const id = `${timestamp}-${randomPart}`;
  return prefix ? `${prefix}:${id}` : id;
}

/**
 * Extract prefix from ID if it exists
 */
export function getIdPrefix(id: EntityId): string | null {
  const parts = id.split(':');
  return parts.length > 1 ? parts[0] : null;
}

// ============================================================================
// TIME UTILITIES
// ============================================================================

/**
 * Get current timestamp
 */
export function now(): Timestamp {
  return Date.now();
}

/**
 * Check if a timestamp is in the past
 */
export function isPast(timestamp: Timestamp): boolean {
  return timestamp < now();
}

/**
 * Check if a timestamp is in the future
 */
export function isFuture(timestamp: Timestamp): boolean {
  return timestamp > now();
}

/**
 * Calculate time elapsed since timestamp
 */
export function timeSince(timestamp: Timestamp): number {
  return now() - timestamp;
}

/**
 * Calculate time until timestamp
 */
export function timeUntil(timestamp: Timestamp): number {
  return timestamp - now();
}

// ============================================================================
// IMPORTANCE & DECAY
// ============================================================================

/**
 * Calculate importance decay over time
 * Recent items are more important, but decay is gradual
 */
export function calculateImportanceDecay(
  initialImportance: number,
  ageMs: number,
  halfLifeMs: number = 7 * 24 * 60 * 60 * 1000 // 1 week default
): number {
  const decay = Math.pow(0.5, ageMs / halfLifeMs);
  return initialImportance * decay;
}

/**
 * Calculate importance based on access patterns
 * More frequent access = higher importance
 */
export function calculateAccessImportance(
  accessCount: number,
  lastAccessed: Timestamp,
  created: Timestamp
): number {
  const age = timeSince(created);
  const recency = timeSince(lastAccessed);

  // Combine access frequency with recency
  const frequencyScore = Math.log(accessCount + 1) / Math.log(100);
  const recencyScore = 1 - calculateImportanceDecay(1, recency);

  return Math.min(1, (frequencyScore * 0.4 + recencyScore * 0.6));
}

// ============================================================================
// CONCEPT UTILITIES
// ============================================================================

/**
 * Update concept access statistics
 */
export function updateConceptAccess(concept: Concept): Concept {
  return {
    ...concept,
    lastAccessed: now(),
    accessCount: concept.accessCount + 1,
    importance: calculateAccessImportance(
      concept.accessCount + 1,
      now(),
      concept.created
    ),
  };
}

/**
 * Check if two concepts are similar based on properties
 */
export function conceptSimilarity(c1: Concept, c2: Concept): number {
  // Type match
  const typeMatch = c1.type === c2.type ? 0.3 : 0;

  // Property overlap
  const keys1 = new Set(Object.keys(c1.properties));
  const keys2 = new Set(Object.keys(c2.properties));
  const intersection = new Set([...keys1].filter(k => keys2.has(k)));
  const union = new Set([...keys1, ...keys2]);
  const propertyOverlap = (intersection.size / union.size) * 0.7;

  return Math.min(1, typeMatch + propertyOverlap);
}

// ============================================================================
// RELATION UTILITIES
// ============================================================================

/**
 * Update relation strength based on reinforcement
 */
export function reinforceRelation(relation: Relation, amount: number = 0.1): Relation {
  return {
    ...relation,
    strength: Math.min(1, relation.strength + amount),
    lastReinforced: now(),
  };
}

/**
 * Decay relation strength over time
 */
export function decayRelation(relation: Relation): Relation {
  const age = timeSince(relation.lastReinforced);
  const decayedStrength = calculateImportanceDecay(
    relation.strength,
    age,
    30 * 24 * 60 * 60 * 1000 // 30 days
  );

  return {
    ...relation,
    strength: decayedStrength,
  };
}

/**
 * Check if relation is still valid (above minimum strength)
 */
export function isRelationValid(relation: Relation, minStrength: number = 0.1): boolean {
  return relation.strength >= minStrength;
}

// ============================================================================
// CONTEXT UTILITIES
// ============================================================================

/**
 * Merge two contexts, combining their active concepts and salience
 */
export function mergeContexts(c1: Context, c2: Context): Context {
  const activeConcepts = new Set([...c1.activeConcepts, ...c2.activeConcepts]);

  const salience = new Map(c1.salience);
  for (const [concept, sal] of c2.salience) {
    const existing = salience.get(concept) || 0;
    salience.set(concept, Math.max(existing, sal));
  }

  return {
    id: generateId('ctx'),
    label: `${c1.label} + ${c2.label}`,
    activeConcepts,
    salience,
    constraints: [...c1.constraints, ...c2.constraints],
    temporalWindow: {
      start: Math.min(c1.temporalWindow.start, c2.temporalWindow.start),
      end: c1.temporalWindow.end && c2.temporalWindow.end
        ? Math.max(c1.temporalWindow.end, c2.temporalWindow.end)
        : c1.temporalWindow.end || c2.temporalWindow.end,
    },
    metadata: { ...c1.metadata, ...c2.metadata },
  };
}

/**
 * Get the most salient concepts in a context
 */
export function getMostSalient(context: Context, n: number = 10): EntityId[] {
  return Array.from(context.salience.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id]) => id);
}

/**
 * Update salience for concepts in context
 */
export function updateSalience(
  context: Context,
  updates: Map<EntityId, number>
): Context {
  const newSalience = new Map(context.salience);

  for (const [id, delta] of updates) {
    const current = newSalience.get(id) || 0;
    const updated = Math.max(0, Math.min(1, current + delta));

    if (updated > 0.01) {
      newSalience.set(id, updated);
      context.activeConcepts.add(id);
    } else {
      newSalience.delete(id);
      context.activeConcepts.delete(id);
    }
  }

  return {
    ...context,
    salience: newSalience,
  };
}

// ============================================================================
// PROBABILITY & UNCERTAINTY
// ============================================================================

/**
 * Combine multiple confidence values
 */
export function combineConfidence(confidences: number[]): number {
  if (confidences.length === 0) return 0;
  if (confidences.length === 1) return confidences[0];

  // Use noisy-OR for combining (assumes independence)
  const complement = confidences.reduce((acc, c) => acc * (1 - c), 1);
  return 1 - complement;
}

/**
 * Update belief with new evidence using Bayesian update
 */
export function bayesianUpdate(
  priorBelief: number,
  likelihoodIfTrue: number,
  likelihoodIfFalse: number
): number {
  const numerator = likelihoodIfTrue * priorBelief;
  const denominator = numerator + likelihoodIfFalse * (1 - priorBelief);

  return denominator > 0 ? numerator / denominator : priorBelief;
}

// ============================================================================
// DISTANCE & SIMILARITY
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) return 0;

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    norm1 += v1[i] * v1[i];
    norm2 += v2[i] * v2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  return denominator > 0 ? dotProduct / denominator : 0;
}

/**
 * Calculate Jaccard similarity between two sets
 */
export function jaccardSimilarity<T>(set1: Set<T>, set2: Set<T>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

// ============================================================================
// COLLECTION UTILITIES
// ============================================================================

/**
 * Group items by a key function
 */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  const groups = new Map<K, T[]>();

  for (const item of items) {
    const key = keyFn(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }

  return groups;
}

/**
 * Sample n items randomly from array
 */
export function sample<T>(items: T[], n: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, items.length));
}

/**
 * Get top n items by score function
 */
export function topN<T>(
  items: T[],
  scoreFn: (item: T) => number,
  n: number
): T[] {
  return items
    .map(item => ({ item, score: scoreFn(item) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(({ item }) => item);
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that a number is within range [0, 1]
 */
export function validateProbability(value: number, name: string = "value"): void {
  if (value < 0 || value > 1 || isNaN(value)) {
    throw new Error(`${name} must be between 0 and 1, got ${value}`);
  }
}

/**
 * Clamp a number to range [0, 1]
 */
export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Validate entity ID format
 */
export function isValidEntityId(id: EntityId): boolean {
  return typeof id === 'string' && id.length > 0;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const Utils = {
  // ID
  generateId,
  getIdPrefix,
  isValidEntityId,

  // Time
  now,
  isPast,
  isFuture,
  timeSince,
  timeUntil,

  // Importance
  calculateImportanceDecay,
  calculateAccessImportance,

  // Concepts
  updateConceptAccess,
  conceptSimilarity,

  // Relations
  reinforceRelation,
  decayRelation,
  isRelationValid,

  // Context
  mergeContexts,
  getMostSalient,
  updateSalience,

  // Probability
  combineConfidence,
  bayesianUpdate,
  validateProbability,
  clamp01,

  // Similarity
  cosineSimilarity,
  jaccardSimilarity,

  // Collections
  groupBy,
  sample,
  topN,
};
