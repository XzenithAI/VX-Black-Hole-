/**
 * Semantic Memory
 *
 * Stores conceptual knowledge, facts, and relationships.
 * The semantic network is a graph where concepts are nodes and relations are edges.
 */

import {
  EntityId,
  Concept,
  Relation,
  ConceptType,
  RelationType,
  Context,
} from '../foundation/types';
import {
  generateId,
  now,
  updateConceptAccess,
  reinforceRelation,
  decayRelation,
  isRelationValid,
  conceptSimilarity,
  jaccardSimilarity,
} from '../foundation/utils';

export interface SemanticQuery {
  conceptIds?: EntityId[];
  conceptTypes?: ConceptType[];
  relationTypes?: RelationType[];
  properties?: Record<string, any>;
  similarTo?: EntityId;
  context?: Context;
  limit?: number;
}

export class SemanticMemory {
  private concepts: Map<EntityId, Concept> = new Map();
  private relations: Map<EntityId, Relation> = new Map();

  // Indexes for fast retrieval
  private conceptsByType: Map<ConceptType, Set<EntityId>> = new Map();
  private relationsByType: Map<RelationType, Set<EntityId>> = new Map();
  private relationsBySource: Map<EntityId, Set<EntityId>> = new Map();
  private relationsByTarget: Map<EntityId, Set<EntityId>> = new Map();

  constructor() {
    // Initialize type indexes
    for (const type of Object.values(ConceptType)) {
      this.conceptsByType.set(type, new Set());
    }
    for (const type of Object.values(RelationType)) {
      this.relationsByType.set(type, new Set());
    }
  }

  // ========================================================================
  // CONCEPT OPERATIONS
  // ========================================================================

  /**
   * Store a concept in semantic memory
   */
  storeConcept(concept: Concept): void {
    this.concepts.set(concept.id, concept);
    this.conceptsByType.get(concept.type)?.add(concept.id);
  }

  /**
   * Create a new concept
   */
  createConcept(
    label: string,
    type: ConceptType,
    properties: Record<string, any> = {},
    importance: number = 0.5,
    confidence: number = 0.5
  ): Concept {
    const concept: Concept = {
      id: generateId('concept'),
      label,
      type,
      properties,
      created: now(),
      lastAccessed: now(),
      accessCount: 0,
      importance,
      confidence,
    };

    this.storeConcept(concept);
    return concept;
  }

  /**
   * Retrieve a concept by ID
   */
  getConcept(id: EntityId): Concept | undefined {
    const concept = this.concepts.get(id);
    if (concept) {
      // Update access statistics
      const updated = updateConceptAccess(concept);
      this.concepts.set(id, updated);
      return updated;
    }
    return undefined;
  }

  /**
   * Retrieve multiple concepts
   */
  getConcepts(ids: EntityId[]): Concept[] {
    return ids.map(id => this.getConcept(id)).filter(c => c !== undefined) as Concept[];
  }

  /**
   * Delete a concept and all relations involving it
   */
  deleteConcept(id: EntityId): void {
    const concept = this.concepts.get(id);
    if (!concept) return;

    // Remove from type index
    this.conceptsByType.get(concept.type)?.delete(id);

    // Remove all relations involving this concept
    const relatedRelations = [
      ...(this.relationsBySource.get(id) || []),
      ...(this.relationsByTarget.get(id) || []),
    ];

    for (const relId of relatedRelations) {
      this.deleteRelation(relId);
    }

    // Remove the concept
    this.concepts.delete(id);
  }

  /**
   * Update concept properties
   */
  updateConcept(id: EntityId, updates: Partial<Concept>): Concept | undefined {
    const concept = this.concepts.get(id);
    if (!concept) return undefined;

    const updated = { ...concept, ...updates };
    this.concepts.set(id, updated);
    return updated;
  }

  // ========================================================================
  // RELATION OPERATIONS
  // ========================================================================

  /**
   * Store a relation
   */
  storeRelation(relation: Relation): void {
    this.relations.set(relation.id, relation);

    // Update indexes
    this.relationsByType.get(relation.type)?.add(relation.id);

    if (!this.relationsBySource.has(relation.from)) {
      this.relationsBySource.set(relation.from, new Set());
    }
    this.relationsBySource.get(relation.from)?.add(relation.id);

    if (!this.relationsByTarget.has(relation.to)) {
      this.relationsByTarget.set(relation.to, new Set());
    }
    this.relationsByTarget.get(relation.to)?.add(relation.id);
  }

  /**
   * Create a new relation
   */
  createRelation(
    type: RelationType,
    from: EntityId,
    to: EntityId,
    strength: number = 0.5,
    confidence: number = 0.5
  ): Relation {
    // Check if relation already exists
    const existing = this.findRelation(from, to, type);
    if (existing) {
      // Reinforce existing relation
      const reinforced = reinforceRelation(existing);
      this.relations.set(existing.id, reinforced);
      return reinforced;
    }

    const relation: Relation = {
      id: generateId('rel'),
      type,
      from,
      to,
      strength,
      confidence,
      created: now(),
      lastReinforced: now(),
      evidence: [],
    };

    this.storeRelation(relation);
    return relation;
  }

  /**
   * Find a specific relation between two concepts
   */
  findRelation(from: EntityId, to: EntityId, type?: RelationType): Relation | undefined {
    const fromRelations = this.relationsBySource.get(from) || new Set();

    for (const relId of fromRelations) {
      const rel = this.relations.get(relId);
      if (rel && rel.to === to && (!type || rel.type === type)) {
        return rel;
      }
    }

    return undefined;
  }

  /**
   * Get all relations from a concept
   */
  getRelationsFrom(id: EntityId, type?: RelationType): Relation[] {
    const relIds = this.relationsBySource.get(id) || new Set();
    const relations = Array.from(relIds)
      .map(relId => this.relations.get(relId))
      .filter(rel => rel !== undefined) as Relation[];

    return type
      ? relations.filter(rel => rel.type === type)
      : relations;
  }

  /**
   * Get all relations to a concept
   */
  getRelationsTo(id: EntityId, type?: RelationType): Relation[] {
    const relIds = this.relationsByTarget.get(id) || new Set();
    const relations = Array.from(relIds)
      .map(relId => this.relations.get(relId))
      .filter(rel => rel !== undefined) as Relation[];

    return type
      ? relations.filter(rel => rel.type === type)
      : relations;
  }

  /**
   * Get all relations (from or to) involving a concept
   */
  getRelations(id: EntityId, type?: RelationType): Relation[] {
    return [
      ...this.getRelationsFrom(id, type),
      ...this.getRelationsTo(id, type),
    ];
  }

  /**
   * Delete a relation
   */
  deleteRelation(id: EntityId): void {
    const relation = this.relations.get(id);
    if (!relation) return;

    // Remove from indexes
    this.relationsByType.get(relation.type)?.delete(id);
    this.relationsBySource.get(relation.from)?.delete(id);
    this.relationsByTarget.get(relation.to)?.delete(id);

    // Remove the relation
    this.relations.delete(id);
  }

  /**
   * Reinforce a relation (strengthen it)
   */
  reinforce(id: EntityId, amount: number = 0.1): void {
    const relation = this.relations.get(id);
    if (!relation) return;

    const reinforced = reinforceRelation(relation, amount);
    this.relations.set(id, reinforced);
  }

  // ========================================================================
  // QUERY & RETRIEVAL
  // ========================================================================

  /**
   * Query concepts by various criteria
   */
  queryConcepts(query: SemanticQuery): Concept[] {
    let candidates = new Set<EntityId>();

    // Filter by IDs if provided
    if (query.conceptIds) {
      candidates = new Set(query.conceptIds);
    }
    // Filter by types
    else if (query.conceptTypes) {
      for (const type of query.conceptTypes) {
        const ofType = this.conceptsByType.get(type) || new Set();
        for (const id of ofType) {
          candidates.add(id);
        }
      }
    }
    // Otherwise, start with all concepts
    else {
      candidates = new Set(this.concepts.keys());
    }

    // Filter by properties
    if (query.properties) {
      candidates = new Set(
        Array.from(candidates).filter(id => {
          const concept = this.concepts.get(id);
          if (!concept) return false;

          return Object.entries(query.properties!).every(
            ([key, value]) => concept.properties[key] === value
          );
        })
      );
    }

    // Filter by similarity
    if (query.similarTo) {
      const target = this.concepts.get(query.similarTo);
      if (target) {
        candidates = new Set(
          Array.from(candidates)
            .map(id => ({
              id,
              concept: this.concepts.get(id)!,
            }))
            .filter(({ concept }) => conceptSimilarity(concept, target) > 0.3)
            .map(({ id }) => id)
        );
      }
    }

    // Filter by context salience
    if (query.context) {
      candidates = new Set(
        Array.from(candidates)
          .map(id => ({
            id,
            salience: query.context!.salience.get(id) || 0,
          }))
          .filter(({ salience }) => salience > 0.1)
          .map(({ id }) => id)
      );
    }

    // Convert to concepts and sort by importance
    const concepts = Array.from(candidates)
      .map(id => this.concepts.get(id))
      .filter(c => c !== undefined) as Concept[];

    concepts.sort((a, b) => b.importance - a.importance);

    // Apply limit
    return query.limit ? concepts.slice(0, query.limit) : concepts;
  }

  /**
   * Find concepts related to a given concept
   */
  findRelatedConcepts(
    id: EntityId,
    relationTypes?: RelationType[],
    maxDistance: number = 1
  ): Map<EntityId, number> {
    const related = new Map<EntityId, number>();
    const visited = new Set<EntityId>();
    const queue: Array<{ id: EntityId; distance: number }> = [{ id, distance: 0 }];

    while (queue.length > 0) {
      const { id: currentId, distance } = queue.shift()!;

      if (visited.has(currentId) || distance > maxDistance) continue;
      visited.add(currentId);

      if (currentId !== id) {
        const strength = 1 / (distance + 1);
        related.set(currentId, strength);
      }

      // Get connected concepts
      const relations = this.getRelations(currentId);
      for (const rel of relations) {
        if (relationTypes && !relationTypes.includes(rel.type)) continue;

        const nextId = rel.from === currentId ? rel.to : rel.from;
        if (!visited.has(nextId)) {
          queue.push({ id: nextId, distance: distance + 1 });
        }
      }
    }

    return related;
  }

  /**
   * Activate spreading through semantic network
   * Concepts activate their neighbors, simulating associative thinking
   */
  spreadActivation(
    sourceIds: EntityId[],
    iterations: number = 3,
    decayFactor: number = 0.5
  ): Map<EntityId, number> {
    const activation = new Map<EntityId, number>();

    // Initialize with source concepts
    for (const id of sourceIds) {
      activation.set(id, 1.0);
    }

    // Spread activation
    for (let i = 0; i < iterations; i++) {
      const newActivation = new Map(activation);

      for (const [sourceId, sourceStrength] of activation) {
        const relations = this.getRelationsFrom(sourceId);

        for (const rel of relations) {
          const spread = sourceStrength * rel.strength * decayFactor;
          const current = newActivation.get(rel.to) || 0;
          newActivation.set(rel.to, Math.min(1, current + spread));
        }
      }

      // Update activation map
      for (const [id, strength] of newActivation) {
        activation.set(id, strength);
      }
    }

    return activation;
  }

  // ========================================================================
  // MAINTENANCE
  // ========================================================================

  /**
   * Perform memory maintenance (decay unused relations, consolidate, etc.)
   */
  performMaintenance(): void {
    // Decay all relations
    for (const [id, relation] of this.relations) {
      const decayed = decayRelation(relation);

      if (isRelationValid(decayed, 0.05)) {
        this.relations.set(id, decayed);
      } else {
        // Remove very weak relations
        this.deleteRelation(id);
      }
    }
  }

  /**
   * Get statistics about semantic memory
   */
  getStats() {
    return {
      conceptCount: this.concepts.size,
      relationCount: this.relations.size,
      conceptsByType: Object.fromEntries(
        Array.from(this.conceptsByType.entries()).map(([type, set]) => [
          type,
          set.size,
        ])
      ),
      relationsByType: Object.fromEntries(
        Array.from(this.relationsByType.entries()).map(([type, set]) => [
          type,
          set.size,
        ])
      ),
    };
  }

  /**
   * Clear all memory (use with caution!)
   */
  clear(): void {
    this.concepts.clear();
    this.relations.clear();
    this.conceptsByType.forEach(set => set.clear());
    this.relationsByType.forEach(set => set.clear());
    this.relationsBySource.clear();
    this.relationsByTarget.clear();
  }
}
