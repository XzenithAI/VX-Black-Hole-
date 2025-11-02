/**
 * Causal Reasoning Engine
 *
 * Builds and reasons over causal models.
 * Understands cause-effect relationships, predicts outcomes, explains phenomena.
 */

import {
  EntityId,
  CausalLink,
  CausalGraph,
  Concept,
  Evidence,
  Hypothesis,
} from '../foundation/types';
import {
  generateId,
  now,
  bayesianUpdate,
  combineConfidence,
} from '../foundation/utils';

export interface CausalQuery {
  cause?: EntityId;
  effect?: EntityId;
  intervention?: Map<EntityId, any>;
  counterfactual?: Map<EntityId, any>;
}

export interface CausalInferenceResult {
  prediction: Concept;
  confidence: number;
  causalPath: CausalLink[];
  explanation: string;
}

export class CausalReasoning {
  private graphs: Map<string, CausalGraph> = new Map();
  private links: Map<EntityId, CausalLink> = new Map();

  // Indexes
  private linksByCause: Map<EntityId, Set<EntityId>> = new Map();
  private linksByEffect: Map<EntityId, Set<EntityId>> = new Map();

  constructor() {}

  // ========================================================================
  // CAUSAL GRAPH MANAGEMENT
  // ========================================================================

  /**
   * Create a new causal graph for a domain
   */
  createGraph(domain: string): CausalGraph {
    const graph: CausalGraph = {
      id: generateId('graph'),
      nodes: new Map(),
      edges: new Map(),
      domain,
      confidence: 0.5,
      created: now(),
      lastUpdated: now(),
    };

    this.graphs.set(domain, graph);
    return graph;
  }

  /**
   * Get or create graph for domain
   */
  getGraph(domain: string): CausalGraph {
    let graph = this.graphs.get(domain);
    if (!graph) {
      graph = this.createGraph(domain);
    }
    return graph;
  }

  /**
   * Add node to causal graph
   */
  addNode(domain: string, concept: Concept): void {
    const graph = this.getGraph(domain);
    graph.nodes.set(concept.id, concept);
    graph.lastUpdated = now();
  }

  /**
   * Add edge (causal link) to graph
   */
  addEdge(domain: string, link: CausalLink): void {
    const graph = this.getGraph(domain);
    graph.edges.set(link.id, link);
    graph.lastUpdated = now();

    // Store link
    this.storeLink(link);
  }

  // ========================================================================
  // CAUSAL LINK OPERATIONS
  // ========================================================================

  /**
   * Create a causal link
   */
  createLink(
    cause: EntityId,
    effect: EntityId,
    strength: number = 0.5,
    necessity: number = 0.5,
    sufficiency: number = 0.5,
    mechanism?: string,
    timeDelay: number = 0
  ): CausalLink {
    const link: CausalLink = {
      id: generateId('causal'),
      cause,
      effect,
      mechanism,
      necessity,
      sufficiency,
      timeDelay,
      conditions: [],
      strength,
      evidence: [],
    };

    this.storeLink(link);
    return link;
  }

  /**
   * Store a causal link
   */
  private storeLink(link: CausalLink): void {
    this.links.set(link.id, link);

    // Update indexes
    if (!this.linksByCause.has(link.cause)) {
      this.linksByCause.set(link.cause, new Set());
    }
    this.linksByCause.get(link.cause)?.add(link.id);

    if (!this.linksByEffect.has(link.effect)) {
      this.linksByEffect.set(link.effect, new Set());
    }
    this.linksByEffect.get(link.effect)?.add(link.id);
  }

  /**
   * Get link by ID
   */
  getLink(id: EntityId): CausalLink | undefined {
    return this.links.get(id);
  }

  /**
   * Find all effects of a cause
   */
  getEffects(cause: EntityId): CausalLink[] {
    const linkIds = this.linksByCause.get(cause) || new Set();
    return Array.from(linkIds)
      .map(id => this.links.get(id))
      .filter(link => link !== undefined) as CausalLink[];
  }

  /**
   * Find all causes of an effect
   */
  getCauses(effect: EntityId): CausalLink[] {
    const linkIds = this.linksByEffect.get(effect) || new Set();
    return Array.from(linkIds)
      .map(id => this.links.get(id))
      .filter(link => link !== undefined) as CausalLink[];
  }

  /**
   * Find direct link between cause and effect
   */
  findLink(cause: EntityId, effect: EntityId): CausalLink | undefined {
    const effects = this.getEffects(cause);
    return effects.find(link => link.effect === effect);
  }

  /**
   * Add evidence to a causal link
   */
  addEvidence(linkId: EntityId, evidence: Evidence): void {
    const link = this.links.get(linkId);
    if (!link) return;

    link.evidence.push(evidence);

    // Update strength based on evidence
    const reliableEvidence = link.evidence.filter(e => e.reliability > 0.7);
    const evidenceStrength = reliableEvidence.length / Math.max(5, link.evidence.length);
    link.strength = Math.min(1, link.strength + evidenceStrength * 0.1);
  }

  // ========================================================================
  // CAUSAL INFERENCE
  // ========================================================================

  /**
   * Predict effect given cause
   */
  predictEffect(cause: EntityId, maxSteps: number = 3): CausalInferenceResult[] {
    const results: CausalInferenceResult[] = [];
    const visited = new Set<EntityId>();

    const explore = (
      currentId: EntityId,
      path: CausalLink[],
      confidence: number,
      depth: number
    ) => {
      if (depth >= maxSteps || visited.has(currentId)) return;
      visited.add(currentId);

      const effects = this.getEffects(currentId);

      for (const link of effects) {
        const newPath = [...path, link];
        const newConfidence = confidence * link.strength;

        // Create result for this effect
        results.push({
          prediction: { id: link.effect } as Concept, // Simplified
          confidence: newConfidence,
          causalPath: newPath,
          explanation: this.generateExplanation(newPath),
        });

        // Continue exploring
        explore(link.effect, newPath, newConfidence, depth + 1);
      }
    };

    explore(cause, [], 1.0, 0);

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);

    return results;
  }

  /**
   * Explain why effect occurred (backward reasoning)
   */
  explainEffect(effect: EntityId, maxSteps: number = 3): CausalInferenceResult[] {
    const results: CausalInferenceResult[] = [];
    const visited = new Set<EntityId>();

    const explore = (
      currentId: EntityId,
      path: CausalLink[],
      confidence: number,
      depth: number
    ) => {
      if (depth >= maxSteps || visited.has(currentId)) return;
      visited.add(currentId);

      const causes = this.getCauses(currentId);

      for (const link of causes) {
        const newPath = [link, ...path];
        const newConfidence = confidence * link.necessity;

        // Create explanation
        results.push({
          prediction: { id: link.cause } as Concept,
          confidence: newConfidence,
          causalPath: newPath,
          explanation: this.generateExplanation(newPath),
        });

        // Continue exploring
        explore(link.cause, newPath, newConfidence, depth + 1);
      }
    };

    explore(effect, [], 1.0, 0);

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);

    return results;
  }

  /**
   * Find all causal paths between two concepts
   */
  findCausalPaths(
    from: EntityId,
    to: EntityId,
    maxLength: number = 5
  ): CausalLink[][] {
    const paths: CausalLink[][] = [];
    const visited = new Set<EntityId>();

    const explore = (currentId: EntityId, path: CausalLink[]) => {
      if (path.length >= maxLength) return;

      if (currentId === to && path.length > 0) {
        paths.push([...path]);
        return;
      }

      if (visited.has(currentId)) return;
      visited.add(currentId);

      const effects = this.getEffects(currentId);
      for (const link of effects) {
        explore(link.effect, [...path, link]);
      }

      visited.delete(currentId);
    };

    explore(from, []);
    return paths;
  }

  /**
   * Generate natural language explanation from causal path
   */
  private generateExplanation(path: CausalLink[]): string {
    if (path.length === 0) return "No causal connection found";
    if (path.length === 1) {
      const link = path[0];
      return link.mechanism
        ? `${link.cause} causes ${link.effect} through ${link.mechanism}`
        : `${link.cause} causes ${link.effect}`;
    }

    const steps = path.map((link, i) => {
      const connector = i === 0 ? "" : "which ";
      const mechanism = link.mechanism ? ` (via ${link.mechanism})` : "";
      return `${connector}causes ${link.effect}${mechanism}`;
    });

    return `${path[0].cause} ${steps.join(", ")}`;
  }

  // ========================================================================
  // INTERVENTION & COUNTERFACTUALS
  // ========================================================================

  /**
   * Predict outcome of intervention (do-calculus)
   * What happens if we force X to be true?
   */
  predictIntervention(
    intervention: Map<EntityId, any>,
    targetEffect: EntityId
  ): CausalInferenceResult | null {
    // For each intervened variable, temporarily remove incoming causal links
    const removedLinks = new Map<EntityId, CausalLink[]>();

    for (const [varId] of intervention) {
      const causes = this.getCauses(varId);
      removedLinks.set(varId, causes);

      // Temporarily remove these links
      for (const link of causes) {
        this.linksByEffect.get(link.effect)?.delete(link.id);
      }
    }

    // Now predict effect given intervention
    let result: CausalInferenceResult | null = null;

    for (const [varId] of intervention) {
      const predictions = this.predictEffect(varId);
      const targetPrediction = predictions.find(
        p => p.prediction.id === targetEffect
      );

      if (targetPrediction) {
        result = targetPrediction;
        break;
      }
    }

    // Restore removed links
    for (const [varId, links] of removedLinks) {
      for (const link of links) {
        this.linksByEffect.get(link.effect)?.add(link.id);
      }
    }

    return result;
  }

  /**
   * Counterfactual reasoning: What if X had been different?
   */
  counterfactual(
    actual: Map<EntityId, any>,
    counterfactual: Map<EntityId, any>,
    targetEffect: EntityId
  ): {
    actualOutcome: CausalInferenceResult | null;
    counterfactualOutcome: CausalInferenceResult | null;
    difference: number;
  } {
    // Predict under actual circumstances
    const actualOutcome = this.predictIntervention(actual, targetEffect);

    // Predict under counterfactual circumstances
    const counterfactualOutcome = this.predictIntervention(
      counterfactual,
      targetEffect
    );

    // Calculate difference
    const difference =
      actualOutcome && counterfactualOutcome
        ? Math.abs(actualOutcome.confidence - counterfactualOutcome.confidence)
        : 0;

    return {
      actualOutcome,
      counterfactualOutcome,
      difference,
    };
  }

  // ========================================================================
  // LEARNING & DISCOVERY
  // ========================================================================

  /**
   * Discover causal relationships from observations
   * Simplified causal discovery (in reality would use PC algorithm, etc.)
   */
  discoverCausality(
    observations: Array<{ variables: Map<EntityId, any>; outcome: EntityId }>,
    domain: string
  ): CausalLink[] {
    const discovered: CausalLink[] = [];
    const correlations = this.computeCorrelations(observations);

    // For each strong correlation, hypothesize causal link
    for (const [varPair, correlation] of correlations) {
      if (correlation > 0.7) {
        const [var1, var2] = varPair.split('|');

        // Check temporal ordering to infer direction
        const var1CausesVar2 = this.checkTemporalPrecedence(
          var1,
          var2,
          observations
        );

        if (var1CausesVar2) {
          const link = this.createLink(
            var1,
            var2,
            correlation,
            correlation * 0.8,
            correlation * 0.6
          );

          discovered.push(link);
          this.addEdge(domain, link);
        }
      }
    }

    return discovered;
  }

  /**
   * Compute correlations between variables
   */
  private computeCorrelations(
    observations: Array<{ variables: Map<EntityId, any>; outcome: EntityId }>
  ): Map<string, number> {
    const correlations = new Map<string, number>();

    // Simplified: just count co-occurrences
    const coOccurrences = new Map<string, number>();
    const varCounts = new Map<EntityId, number>();

    for (const obs of observations) {
      const vars = Array.from(obs.variables.keys());

      for (const var1 of vars) {
        varCounts.set(var1, (varCounts.get(var1) || 0) + 1);

        for (const var2 of vars) {
          if (var1 !== var2) {
            const key = `${var1}|${var2}`;
            coOccurrences.set(key, (coOccurrences.get(key) || 0) + 1);
          }
        }
      }
    }

    // Calculate correlation
    for (const [key, coCount] of coOccurrences) {
      const [var1, var2] = key.split('|');
      const count1 = varCounts.get(var1) || 1;
      const count2 = varCounts.get(var2) || 1;

      const correlation = coCount / Math.sqrt(count1 * count2);
      correlations.set(key, correlation);
    }

    return correlations;
  }

  /**
   * Check if var1 typically precedes var2 temporally
   */
  private checkTemporalPrecedence(
    var1: EntityId,
    var2: EntityId,
    observations: Array<{ variables: Map<EntityId, any> }>
  ): boolean {
    // Simplified: assume var1 causes var2 if it appears earlier in observations
    // In reality, would need actual timestamps
    return Math.random() > 0.5; // Placeholder
  }

  /**
   * Update causal model based on new evidence
   */
  updateModel(linkId: EntityId, evidence: Evidence): void {
    const link = this.links.get(linkId);
    if (!link) return;

    this.addEvidence(linkId, evidence);

    // Use Bayesian updating for strength
    const prior = link.strength;
    const likelihood = evidence.reliability;

    if (evidence.supportsHypothesis === linkId) {
      link.strength = bayesianUpdate(prior, likelihood, 1 - likelihood);
    } else if (evidence.contradictsHypothesis === linkId) {
      link.strength = bayesianUpdate(prior, 1 - likelihood, likelihood);
    }
  }

  // ========================================================================
  // STATISTICS & UTILITIES
  // ========================================================================

  /**
   * Get statistics
   */
  getStats() {
    return {
      graphCount: this.graphs.size,
      linkCount: this.links.size,
      graphs: Object.fromEntries(
        Array.from(this.graphs.entries()).map(([domain, graph]) => [
          domain,
          {
            nodeCount: graph.nodes.size,
            edgeCount: graph.edges.size,
            confidence: graph.confidence,
          },
        ])
      ),
    };
  }

  /**
   * Clear all causal knowledge
   */
  clear(): void {
    this.graphs.clear();
    this.links.clear();
    this.linksByCause.clear();
    this.linksByEffect.clear();
  }
}
