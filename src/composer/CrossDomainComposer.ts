/**
 * Cross-Domain Logic Composer
 *
 * Synthesizes reasoning across multiple domains.
 * Bridges knowledge, finds patterns, generates emergent insights.
 */

import {
  EntityId,
  Concept,
  Context,
  Insight,
} from '../foundation/types';
import {
  generateId,
  now,
} from '../foundation/utils';
import { SemanticBackbone } from '../semantic/SemanticBackbone';
import { CausalReasoning } from '../reasoning/CausalReasoning';

export interface CrossDomainQuery {
  domains: string[];
  concepts: EntityId[];
  goal?: string;
}

export interface ComposedInsight {
  id: EntityId;
  description: string;
  sourceDomains: string[];
  sourceConcepts: EntityId[];
  confidence: number;
  novelty: number; // How unexpected/emergent
  type: 'bridge' | 'pattern' | 'synthesis' | 'emergent';
}

export class CrossDomainComposer {
  private semanticBackbone: SemanticBackbone;
  private causalReasoning: CausalReasoning;

  private composedInsights: Map<EntityId, ComposedInsight> = new Map();

  constructor(
    semanticBackbone: SemanticBackbone,
    causalReasoning: CausalReasoning
  ) {
    this.semanticBackbone = semanticBackbone;
    this.causalReasoning = causalReasoning;
  }

  // ========================================================================
  // CROSS-DOMAIN SYNTHESIS
  // ========================================================================

  /**
   * Compose reasoning across multiple domains
   */
  compose(query: CrossDomainQuery): ComposedInsight[] {
    const insights: ComposedInsight[] = [];

    // Find bridges between domains
    insights.push(...this.findDomainBridges(query.domains, query.concepts));

    // Find cross-domain patterns
    insights.push(...this.findCrossDomainPatterns(query.concepts));

    // Synthesize knowledge
    insights.push(...this.synthesizeKnowledge(query.concepts));

    // Discover emergent properties
    insights.push(...this.discoverEmergentProperties(query.concepts));

    // Sort by confidence and novelty
    insights.sort((a, b) => {
      const aScore = a.confidence * 0.5 + a.novelty * 0.5;
      const bScore = b.confidence * 0.5 + b.novelty * 0.5;
      return bScore - aScore;
    });

    // Store insights
    for (const insight of insights) {
      this.composedInsights.set(insight.id, insight);
    }

    return insights;
  }

  /**
   * Find conceptual bridges between domains
   */
  private findDomainBridges(
    domains: string[],
    concepts: EntityId[]
  ): ComposedInsight[] {
    const insights: ComposedInsight[] = [];

    if (domains.length < 2) return insights;

    // For each pair of domains
    for (let i = 0; i < domains.length; i++) {
      for (let j = i + 1; j < domains.length; j++) {
        const domain1 = domains[i];
        const domain2 = domains[j];

        // Find analogies between concepts in different domains
        for (const conceptId of concepts) {
          const analogies = this.semanticBackbone.findAnalogies(conceptId);

          if (analogies.length > 0) {
            insights.push({
              id: generateId('insight'),
              description: `Found bridge between ${domain1} and ${domain2} via analogical concepts`,
              sourceDomains: [domain1, domain2],
              sourceConcepts: [conceptId, ...analogies.map(a => a.id)],
              confidence: 0.7,
              novelty: 0.8,
              type: 'bridge',
            });
          }
        }
      }
    }

    return insights;
  }

  /**
   * Find patterns that exist across domains
   */
  private findCrossDomainPatterns(concepts: EntityId[]): ComposedInsight[] {
    const insights: ComposedInsight[] = [];

    // Look for structural similarities
    const signatures = new Map<EntityId, Map<string, number>>();

    for (const id of concepts) {
      const sig = this.semanticBackbone['getStructuralSignature'](id);
      signatures.set(id, sig as any);
    }

    // Find concepts with similar signatures
    const similar: Array<{ ids: EntityId[]; similarity: number }> = [];

    const conceptArray = Array.from(concepts);
    for (let i = 0; i < conceptArray.length; i++) {
      for (let j = i + 1; j < conceptArray.length; j++) {
        const sig1 = signatures.get(conceptArray[i]);
        const sig2 = signatures.get(conceptArray[j]);

        if (sig1 && sig2) {
          const similarity = this.semanticBackbone['compareSignatures'](
            sig1 as any,
            sig2 as any
          );

          if (similarity > 0.6) {
            similar.push({
              ids: [conceptArray[i], conceptArray[j]],
              similarity,
            });
          }
        }
      }
    }

    // Create insights for similar patterns
    for (const { ids, similarity } of similar) {
      insights.push({
        id: generateId('insight'),
        description: `Similar structural pattern found across domains`,
        sourceDomains: ['multiple'],
        sourceConcepts: ids,
        confidence: similarity,
        novelty: 0.6,
        type: 'pattern',
      });
    }

    return insights;
  }

  /**
   * Synthesize knowledge from multiple sources
   */
  private synthesizeKnowledge(concepts: EntityId[]): ComposedInsight[] {
    const insights: ComposedInsight[] = [];

    // Try to abstract common principles
    if (concepts.length >= 3) {
      const abstraction = this.semanticBackbone.abstract(concepts);

      if (abstraction) {
        insights.push({
          id: generateId('insight'),
          description: `Synthesized abstract principle: ${abstraction.label}`,
          sourceDomains: ['multiple'],
          sourceConcepts: concepts,
          confidence: 0.8,
          novelty: 0.7,
          type: 'synthesis',
        });
      }
    }

    return insights;
  }

  /**
   * Discover emergent properties from combinations
   */
  private discoverEmergentProperties(concepts: EntityId[]): ComposedInsight[] {
    const insights: ComposedInsight[] = [];

    // Look for causal interactions
    for (let i = 0; i < concepts.length; i++) {
      for (let j = 0; j < concepts.length; j++) {
        if (i === j) continue;

        const paths = this.causalReasoning.findCausalPaths(
          concepts[i],
          concepts[j],
          3
        );

        if (paths.length > 0) {
          insights.push({
            id: generateId('insight'),
            description: `Emergent causal relationship discovered between concepts`,
            sourceDomains: ['multiple'],
            sourceConcepts: [concepts[i], concepts[j]],
            confidence: 0.6,
            novelty: 0.9,
            type: 'emergent',
          });
        }
      }
    }

    return insights;
  }

  // ========================================================================
  // MULTI-SCALE REASONING
  // ========================================================================

  /**
   * Reason at multiple scales simultaneously
   */
  multiScaleReasoning(
    conceptId: EntityId,
    scales: Array<'micro' | 'meso' | 'macro'>
  ): Map<string, Concept[]> {
    const results = new Map<string, Concept[]>();

    for (const scale of scales) {
      switch (scale) {
        case 'micro':
          // Decompose into parts
          results.set('micro', this.semanticBackbone.decompose(conceptId));
          break;

        case 'meso':
          // Get related at same level
          const related = this.semanticBackbone['memory'].findRelatedConcepts(
            conceptId,
            undefined,
            1
          );
          results.set(
            'meso',
            this.semanticBackbone['memory'].getConcepts(Array.from(related.keys()))
          );
          break;

        case 'macro':
          // Get abstractions
          const abstractions =
            this.semanticBackbone['abstractions'].get(conceptId);
          if (abstractions) {
            results.set(
              'macro',
              this.semanticBackbone['memory'].getConcepts(Array.from(abstractions))
            );
          }
          break;
      }
    }

    return results;
  }

  // ========================================================================
  // INTEGRATION
  // ========================================================================

  /**
   * Integrate insights from multiple sources into coherent understanding
   */
  integrate(insights: ComposedInsight[]): Concept | null {
    if (insights.length === 0) return null;

    // Collect all source concepts
    const allConcepts = new Set<EntityId>();
    for (const insight of insights) {
      for (const conceptId of insight.sourceConcepts) {
        allConcepts.add(conceptId);
      }
    }

    // Create integrated concept
    const integrated = this.semanticBackbone.compose(
      Array.from(allConcepts),
      'Integrated understanding'
    );

    return integrated;
  }

  // ========================================================================
  // STATISTICS
  // ========================================================================

  /**
   * Get statistics
   */
  getStats() {
    const byType = new Map<string, number>();

    for (const insight of this.composedInsights.values()) {
      byType.set(insight.type, (byType.get(insight.type) || 0) + 1);
    }

    return {
      totalInsights: this.composedInsights.size,
      insightsByType: Object.fromEntries(byType),
      avgConfidence:
        Array.from(this.composedInsights.values()).reduce(
          (sum, i) => sum + i.confidence,
          0
        ) / this.composedInsights.size || 0,
      avgNovelty:
        Array.from(this.composedInsights.values()).reduce(
          (sum, i) => sum + i.novelty,
          0
        ) / this.composedInsights.size || 0,
    };
  }

  /**
   * Clear all composed insights
   */
  clear(): void {
    this.composedInsights.clear();
  }
}
