/**
 * Semantic Backbone
 *
 * Unified knowledge representation system that maintains semantic coherence
 * across all domains. Provides the "meaning layer" that everything else builds on.
 */

import {
  EntityId,
  Concept,
  Relation,
  RelationType,
  Context,
} from '../foundation/types';
import {
  generateId,
  conceptSimilarity,
  jaccardSimilarity,
} from '../foundation/utils';
import { SemanticMemory } from '../memory/SemanticMemory';

export interface SemanticMapping {
  from: EntityId;
  to: EntityId;
  strength: number;
  type: 'equivalent' | 'analogous' | 'related' | 'opposite';
}

export class SemanticBackbone {
  private memory: SemanticMemory;

  // Cross-domain mappings
  private domainMappings: Map<string, SemanticMapping[]> = new Map();

  // Abstraction hierarchies (concept lattice)
  private abstractions: Map<EntityId, Set<EntityId>> = new Map(); // concrete -> abstractions
  private concretions: Map<EntityId, Set<EntityId>> = new Map(); // abstract -> concrete

  constructor(memory: SemanticMemory) {
    this.memory = memory;
  }

  // ========================================================================
  // SEMANTIC UNDERSTANDING
  // ========================================================================

  /**
   * Understand a concept in context
   * Returns enriched concept with contextual meaning
   */
  understand(
    conceptId: EntityId,
    context?: Context
  ): {
    concept: Concept;
    meaning: string;
    relatedConcepts: Concept[];
    analogies: Concept[];
  } | null {
    const concept = this.memory.getConcept(conceptId);
    if (!concept) return null;

    // Get related concepts
    const related = this.memory.findRelatedConcepts(conceptId, undefined, 2);
    const relatedConcepts = this.memory.getConcepts(Array.from(related.keys()));

    // Find analogies
    const analogies = this.findAnalogies(conceptId);

    // Generate meaning description
    const meaning = this.generateMeaning(concept, relatedConcepts, context);

    return {
      concept,
      meaning,
      relatedConcepts,
      analogies,
    };
  }

  /**
   * Generate natural language meaning for a concept
   */
  private generateMeaning(
    concept: Concept,
    related: Concept[],
    context?: Context
  ): string {
    let meaning = `${concept.label} is a ${concept.type}`;

    // Add key properties
    const keyProps = Object.entries(concept.properties).slice(0, 3);
    if (keyProps.length > 0) {
      const props = keyProps.map(([k, v]) => `${k}: ${v}`).join(', ');
      meaning += ` with properties: ${props}`;
    }

    // Add key relations
    const isA = this.memory.getRelationsFrom(concept.id, RelationType.IS_A);
    if (isA.length > 0) {
      const parent = this.memory.getConcept(isA[0].to);
      if (parent) {
        meaning += `. It is a type of ${parent.label}`;
      }
    }

    // Add contextual relevance
    if (context) {
      const salience = context.salience.get(concept.id);
      if (salience && salience > 0.7) {
        meaning += '. Highly relevant in current context';
      }
    }

    return meaning;
  }

  // ========================================================================
  // ANALOGICAL REASONING
  // ========================================================================

  /**
   * Find analogous concepts (similar structure in different domains)
   */
  findAnalogies(conceptId: EntityId, limit: number = 5): Concept[] {
    const source = this.memory.getConcept(conceptId);
    if (!source) return [];

    // Get structural signature (relations pattern)
    const sourceSignature = this.getStructuralSignature(conceptId);

    // Find concepts with similar signatures
    const candidates: Array<{ concept: Concept; similarity: number }> = [];

    for (const [id, concept] of this.memory['concepts']) {
      if (id === conceptId) continue;

      const targetSignature = this.getStructuralSignature(id);
      const similarity = this.compareSignatures(sourceSignature, targetSignature);

      if (similarity > 0.5) {
        candidates.push({ concept, similarity });
      }
    }

    // Sort by similarity
    candidates.sort((a, b) => b.similarity - a.similarity);

    return candidates.slice(0, limit).map(c => c.concept);
  }

  /**
   * Get structural signature of a concept (pattern of relations)
   */
  private getStructuralSignature(conceptId: EntityId): Map<RelationType, number> {
    const signature = new Map<RelationType, number>();

    const relations = this.memory.getRelations(conceptId);

    for (const rel of relations) {
      signature.set(rel.type, (signature.get(rel.type) || 0) + 1);
    }

    return signature;
  }

  /**
   * Compare two structural signatures
   */
  private compareSignatures(
    sig1: Map<RelationType, number>,
    sig2: Map<RelationType, number>
  ): number {
    const allTypes = new Set([...sig1.keys(), ...sig2.keys()]);
    let similarity = 0;
    let total = 0;

    for (const type of allTypes) {
      const count1 = sig1.get(type) || 0;
      const count2 = sig2.get(type) || 0;

      similarity += Math.min(count1, count2);
      total += Math.max(count1, count2);
    }

    return total > 0 ? similarity / total : 0;
  }

  /**
   * Create analogy: A is to B as C is to ?
   */
  solveAnalogy(a: EntityId, b: EntityId, c: EntityId): EntityId | null {
    // Get the relation between A and B
    const relations = this.memory.getRelationsFrom(a);
    const abRelation = relations.find(r => r.to === b);

    if (!abRelation) return null;

    // Find a D such that C has the same relation to D
    const cRelations = this.memory.getRelationsFrom(c);
    const cdRelation = cRelations.find(r => r.type === abRelation.type);

    return cdRelation ? cdRelation.to : null;
  }

  // ========================================================================
  // ABSTRACTION & GENERALIZATION
  // ========================================================================

  /**
   * Abstract from concrete concepts to general principles
   */
  abstract(concreteIds: EntityId[]): Concept | null {
    if (concreteIds.length === 0) return null;

    const concepts = this.memory.getConcepts(concreteIds);

    // Find common properties
    const commonProps = this.findCommonProperties(concepts);

    // Find common relations
    const commonRelations = this.findCommonRelations(concreteIds);

    // Create abstraction concept
    const abstraction = this.memory.createConcept(
      `Abstraction of ${concepts.map(c => c.label).join(', ')}`,
      concepts[0].type, // Use same type as first concept
      commonProps,
      0.7,
      0.6
    );

    // Link to concrete concepts
    for (const id of concreteIds) {
      this.memory.createRelation(
        RelationType.INSTANCE_OF,
        id,
        abstraction.id,
        0.8
      );

      // Update indexes
      if (!this.abstractions.has(id)) {
        this.abstractions.set(id, new Set());
      }
      this.abstractions.get(id)?.add(abstraction.id);

      if (!this.concretions.has(abstraction.id)) {
        this.concretions.set(abstraction.id, new Set());
      }
      this.concretions.get(abstraction.id)?.add(id);
    }

    return abstraction;
  }

  /**
   * Find properties common to multiple concepts
   */
  private findCommonProperties(concepts: Concept[]): Record<string, any> {
    if (concepts.length === 0) return {};

    const common: Record<string, any> = {};
    const firstProps = concepts[0].properties;

    for (const [key, value] of Object.entries(firstProps)) {
      // Check if all concepts have this property with same value
      const allHave = concepts.every(
        c => c.properties[key] !== undefined && c.properties[key] === value
      );

      if (allHave) {
        common[key] = value;
      }
    }

    return common;
  }

  /**
   * Find relations common to multiple concepts
   */
  private findCommonRelations(conceptIds: EntityId[]): RelationType[] {
    if (conceptIds.length === 0) return [];

    const relationSets = conceptIds.map(id => {
      const rels = this.memory.getRelations(id);
      return new Set(rels.map(r => r.type));
    });

    // Find intersection
    const common = relationSets[0];
    for (let i = 1; i < relationSets.length; i++) {
      for (const type of common) {
        if (!relationSets[i].has(type)) {
          common.delete(type);
        }
      }
    }

    return Array.from(common);
  }

  /**
   * Concretize an abstract concept with specific instance
   */
  concretize(abstractId: EntityId, specificProps: Record<string, any>): Concept {
    const abstract = this.memory.getConcept(abstractId);
    if (!abstract) {
      throw new Error(`Abstract concept ${abstractId} not found`);
    }

    // Create concrete instance with combined properties
    const concrete = this.memory.createConcept(
      `Instance of ${abstract.label}`,
      abstract.type,
      { ...abstract.properties, ...specificProps },
      0.8,
      0.7
    );

    // Link to abstract
    this.memory.createRelation(
      RelationType.INSTANCE_OF,
      concrete.id,
      abstractId,
      0.9
    );

    return concrete;
  }

  // ========================================================================
  // CROSS-DOMAIN MAPPING
  // ========================================================================

  /**
   * Map concepts between domains
   */
  createDomainMapping(
    fromDomain: string,
    toDomain: string,
    mappings: SemanticMapping[]
  ): void {
    const key = `${fromDomain}→${toDomain}`;
    this.domainMappings.set(key, mappings);
  }

  /**
   * Transfer knowledge from one domain to another
   */
  transferKnowledge(
    conceptId: EntityId,
    fromDomain: string,
    toDomain: string
  ): Concept | null {
    const key = `${fromDomain}→${toDomain}`;
    const mappings = this.domainMappings.get(key) || [];

    // Find mapping for this concept
    const mapping = mappings.find(m => m.from === conceptId);
    if (!mapping) return null;

    // Get target concept
    return this.memory.getConcept(mapping.to) || null;
  }

  /**
   * Discover cross-domain mappings automatically
   */
  discoverMappings(
    domain1: string,
    domain2: string,
    concepts1: EntityId[],
    concepts2: EntityId[]
  ): SemanticMapping[] {
    const mappings: SemanticMapping[] = [];

    for (const id1 of concepts1) {
      const c1 = this.memory.getConcept(id1);
      if (!c1) continue;

      for (const id2 of concepts2) {
        const c2 = this.memory.getConcept(id2);
        if (!c2) continue;

        // Calculate similarity
        const propSimilarity = conceptSimilarity(c1, c2);
        const structSimilarity = this.compareSignatures(
          this.getStructuralSignature(id1),
          this.getStructuralSignature(id2)
        );

        const similarity = (propSimilarity + structSimilarity) / 2;

        if (similarity > 0.7) {
          mappings.push({
            from: id1,
            to: id2,
            strength: similarity,
            type: similarity > 0.9 ? 'equivalent' : 'analogous',
          });
        }
      }
    }

    return mappings;
  }

  // ========================================================================
  // COMPOSITION
  // ========================================================================

  /**
   * Compose multiple concepts into a new composite concept
   */
  compose(conceptIds: EntityId[], label: string): Concept {
    const concepts = this.memory.getConcepts(conceptIds);

    // Merge properties
    const mergedProps: Record<string, any> = {};
    for (const concept of concepts) {
      Object.assign(mergedProps, concept.properties);
    }

    // Create composite
    const composite = this.memory.createConcept(
      label,
      concepts[0].type,
      mergedProps,
      0.7,
      0.6
    );

    // Link to components
    for (const id of conceptIds) {
      this.memory.createRelation(
        RelationType.PART_OF,
        id,
        composite.id,
        0.9
      );
    }

    return composite;
  }

  /**
   * Decompose a concept into its constituents
   */
  decompose(conceptId: EntityId): Concept[] {
    const parts = this.memory.getRelationsTo(conceptId, RelationType.PART_OF);

    return this.memory.getConcepts(parts.map(r => r.from));
  }

  // ========================================================================
  // SEMANTIC COHERENCE
  // ========================================================================

  /**
   * Check semantic coherence of a set of concepts
   * Returns score 0-1 indicating how well they fit together
   */
  checkCoherence(conceptIds: EntityId[]): number {
    if (conceptIds.length < 2) return 1;

    let totalSimilarity = 0;
    let pairs = 0;

    for (let i = 0; i < conceptIds.length; i++) {
      for (let j = i + 1; j < conceptIds.length; j++) {
        const c1 = this.memory.getConcept(conceptIds[i]);
        const c2 = this.memory.getConcept(conceptIds[j]);

        if (c1 && c2) {
          totalSimilarity += conceptSimilarity(c1, c2);
          pairs++;
        }
      }
    }

    return pairs > 0 ? totalSimilarity / pairs : 0;
  }

  /**
   * Get semantic distance between two concepts
   */
  semanticDistance(id1: EntityId, id2: EntityId): number {
    // BFS to find shortest path
    const visited = new Set<EntityId>();
    const queue: Array<{ id: EntityId; distance: number }> = [
      { id: id1, distance: 0 },
    ];

    while (queue.length > 0) {
      const { id, distance } = queue.shift()!;

      if (id === id2) return distance;
      if (visited.has(id)) continue;

      visited.add(id);

      const relations = this.memory.getRelations(id);
      for (const rel of relations) {
        const nextId = rel.from === id ? rel.to : rel.from;
        if (!visited.has(nextId)) {
          queue.push({ id: nextId, distance: distance + 1 });
        }
      }
    }

    return Infinity; // No path found
  }

  // ========================================================================
  // STATISTICS
  // ========================================================================

  /**
   * Get statistics
   */
  getStats() {
    return {
      domainMappingCount: this.domainMappings.size,
      abstractionCount: this.abstractions.size,
      concretionCount: this.concretions.size,
    };
  }

  /**
   * Clear all backbone data
   */
  clear(): void {
    this.domainMappings.clear();
    this.abstractions.clear();
    this.concretions.clear();
  }
}
