/**
 * Working Memory
 *
 * Manages current focus, active goals, and ongoing reasoning.
 * Limited capacity - must prioritize what to keep in attention.
 */

import {
  EntityId,
  WorkingMemory as IWorkingMemory,
  Context,
  ReasoningTrace,
  ReasoningStep,
  Hypothesis,
  Concept,
} from '../foundation/types';
import {
  generateId,
  now,
  updateSalience,
  getMostSalient,
} from '../foundation/utils';

export class WorkingMemory {
  private memory: IWorkingMemory;
  private readonly maxCapacity: number;

  constructor(capacity: number = 7) {
    this.maxCapacity = capacity;
    this.memory = {
      focus: new Set(),
      context: this.createEmptyContext(),
      activeGoals: [],
      reasoning: {
        steps: [],
        currentHypotheses: [],
      },
      capacity,
    };
  }

  // ========================================================================
  // FOCUS MANAGEMENT
  // ========================================================================

  /**
   * Add concept to focus
   */
  addToFocus(conceptId: EntityId): void {
    // If at capacity, remove least salient item
    if (this.memory.focus.size >= this.maxCapacity) {
      this.evictLeastSalient();
    }

    this.memory.focus.add(conceptId);
    this.memory.context.activeConcepts.add(conceptId);

    // Increase salience
    const updates = new Map([[conceptId, 0.3]]);
    this.memory.context = updateSalience(this.memory.context, updates);
  }

  /**
   * Remove concept from focus
   */
  removeFromFocus(conceptId: EntityId): void {
    this.memory.focus.delete(conceptId);

    // Decrease salience
    const updates = new Map([[conceptId, -0.5]]);
    this.memory.context = updateSalience(this.memory.context, updates);
  }

  /**
   * Clear focus
   */
  clearFocus(): void {
    this.memory.focus.clear();
  }

  /**
   * Get current focus
   */
  getFocus(): EntityId[] {
    return Array.from(this.memory.focus);
  }

  /**
   * Check if concept is in focus
   */
  isInFocus(conceptId: EntityId): boolean {
    return this.memory.focus.has(conceptId);
  }

  /**
   * Evict least salient item from focus
   */
  private evictLeastSalient(): void {
    const focused = Array.from(this.memory.focus);
    if (focused.length === 0) return;

    // Find item with lowest salience
    const salienceScores = focused.map(id => ({
      id,
      salience: this.memory.context.salience.get(id) || 0,
    }));

    salienceScores.sort((a, b) => a.salience - b.salience);
    const leastSalient = salienceScores[0];

    this.removeFromFocus(leastSalient.id);
  }

  // ========================================================================
  // CONTEXT MANAGEMENT
  // ========================================================================

  /**
   * Get current context
   */
  getContext(): Context {
    return this.memory.context;
  }

  /**
   * Update context
   */
  updateContext(context: Partial<Context>): void {
    this.memory.context = {
      ...this.memory.context,
      ...context,
    };
  }

  /**
   * Update salience for multiple concepts
   */
  updateSalience(updates: Map<EntityId, number>): void {
    this.memory.context = updateSalience(this.memory.context, updates);

    // Update focus to reflect most salient items
    const mostSalient = getMostSalient(this.memory.context, this.maxCapacity);
    this.memory.focus = new Set(mostSalient);
  }

  /**
   * Create empty context
   */
  private createEmptyContext(): Context {
    return {
      id: generateId('ctx'),
      label: 'working',
      activeConcepts: new Set(),
      salience: new Map(),
      constraints: [],
      temporalWindow: { start: now() },
      metadata: {},
    };
  }

  // ========================================================================
  // GOAL TRACKING
  // ========================================================================

  /**
   * Add active goal
   */
  addGoal(goalId: EntityId): void {
    if (!this.memory.activeGoals.includes(goalId)) {
      this.memory.activeGoals.push(goalId);
    }
  }

  /**
   * Remove goal
   */
  removeGoal(goalId: EntityId): void {
    this.memory.activeGoals = this.memory.activeGoals.filter(
      id => id !== goalId
    );
  }

  /**
   * Get active goals
   */
  getActiveGoals(): EntityId[] {
    return [...this.memory.activeGoals];
  }

  /**
   * Clear all goals
   */
  clearGoals(): void {
    this.memory.activeGoals = [];
  }

  // ========================================================================
  // REASONING TRACE
  // ========================================================================

  /**
   * Add reasoning step
   */
  addReasoningStep(
    type: ReasoningStep['type'],
    input: EntityId[],
    output: EntityId[],
    reasoning: string
  ): void {
    const step: ReasoningStep = {
      timestamp: now(),
      type,
      input,
      output,
      reasoning,
    };

    this.memory.reasoning.steps.push(step);

    // Keep only recent steps to avoid memory overflow
    const maxSteps = 100;
    if (this.memory.reasoning.steps.length > maxSteps) {
      this.memory.reasoning.steps = this.memory.reasoning.steps.slice(-maxSteps);
    }
  }

  /**
   * Get reasoning trace
   */
  getReasoningTrace(): ReasoningTrace {
    return this.memory.reasoning;
  }

  /**
   * Get recent reasoning steps
   */
  getRecentSteps(count: number = 10): ReasoningStep[] {
    return this.memory.reasoning.steps.slice(-count);
  }

  /**
   * Clear reasoning trace
   */
  clearReasoningTrace(): void {
    this.memory.reasoning.steps = [];
  }

  // ========================================================================
  // HYPOTHESIS MANAGEMENT
  // ========================================================================

  /**
   * Add hypothesis
   */
  addHypothesis(hypothesis: Hypothesis): void {
    this.memory.reasoning.currentHypotheses.push(hypothesis);
  }

  /**
   * Update hypothesis posterior
   */
  updateHypothesis(hypothesisId: EntityId, posterior: number): void {
    const hypothesis = this.memory.reasoning.currentHypotheses.find(
      h => h.id === hypothesisId
    );
    if (hypothesis) {
      hypothesis.posterior = posterior;
    }
  }

  /**
   * Remove hypothesis
   */
  removeHypothesis(hypothesisId: EntityId): void {
    this.memory.reasoning.currentHypotheses =
      this.memory.reasoning.currentHypotheses.filter(h => h.id !== hypothesisId);
  }

  /**
   * Get all current hypotheses
   */
  getHypotheses(): Hypothesis[] {
    return this.memory.reasoning.currentHypotheses;
  }

  /**
   * Get best hypothesis (highest posterior)
   */
  getBestHypothesis(): Hypothesis | undefined {
    if (this.memory.reasoning.currentHypotheses.length === 0) return undefined;

    return this.memory.reasoning.currentHypotheses.reduce((best, current) =>
      current.posterior > best.posterior ? current : best
    );
  }

  /**
   * Clear all hypotheses
   */
  clearHypotheses(): void {
    this.memory.reasoning.currentHypotheses = [];
  }

  // ========================================================================
  // MAINTENANCE
  // ========================================================================

  /**
   * Decay salience over time (items fade from attention)
   */
  decaySalience(decayFactor: number = 0.1): void {
    const updates = new Map<EntityId, number>();

    for (const conceptId of this.memory.context.activeConcepts) {
      updates.set(conceptId, -decayFactor);
    }

    this.updateSalience(updates);
  }

  /**
   * Reset working memory (clear everything)
   */
  reset(): void {
    this.memory = {
      focus: new Set(),
      context: this.createEmptyContext(),
      activeGoals: [],
      reasoning: {
        steps: [],
        currentHypotheses: [],
      },
      capacity: this.maxCapacity,
    };
  }

  /**
   * Get current state
   */
  getState(): IWorkingMemory {
    return this.memory;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      focusSize: this.memory.focus.size,
      capacity: this.maxCapacity,
      utilization: this.memory.focus.size / this.maxCapacity,
      activeGoalsCount: this.memory.activeGoals.length,
      reasoningStepsCount: this.memory.reasoning.steps.length,
      hypothesesCount: this.memory.reasoning.currentHypotheses.length,
      activeConceptsCount: this.memory.context.activeConcepts.size,
    };
  }

  // ========================================================================
  // ATTENTION SHIFTING
  // ========================================================================

  /**
   * Shift attention to new concepts (smooth transition)
   */
  shiftAttention(newFocus: EntityId[], transitionSmoothness: number = 0.5): void {
    // Gradually decrease salience of old focus
    const decreaseUpdates = new Map<EntityId, number>();
    for (const oldId of this.memory.focus) {
      if (!newFocus.includes(oldId)) {
        decreaseUpdates.set(oldId, -transitionSmoothness);
      }
    }

    // Gradually increase salience of new focus
    const increaseUpdates = new Map<EntityId, number>();
    for (const newId of newFocus) {
      increaseUpdates.set(newId, transitionSmoothness);
    }

    // Apply changes
    this.updateSalience(decreaseUpdates);
    this.updateSalience(increaseUpdates);

    // Update focus set
    this.memory.focus = new Set(
      getMostSalient(this.memory.context, this.maxCapacity)
    );
  }

  /**
   * Get cognitive load (how "full" working memory is)
   */
  getCognitiveLoad(): number {
    const focusLoad = this.memory.focus.size / this.maxCapacity;
    const goalLoad = Math.min(1, this.memory.activeGoals.length / 5);
    const hypothesisLoad = Math.min(1, this.memory.reasoning.currentHypotheses.length / 3);

    return (focusLoad + goalLoad + hypothesisLoad) / 3;
  }

  /**
   * Check if working memory is overloaded
   */
  isOverloaded(): boolean {
    return this.getCognitiveLoad() > 0.8;
  }

  /**
   * Reduce cognitive load by pruning least important items
   */
  reduceCognitiveLoad(): void {
    // Remove least salient concepts
    while (this.memory.focus.size > this.maxCapacity * 0.7) {
      this.evictLeastSalient();
    }

    // Remove low-confidence hypotheses
    this.memory.reasoning.currentHypotheses =
      this.memory.reasoning.currentHypotheses.filter(h => h.posterior > 0.3);

    // Keep only most recent reasoning steps
    const maxSteps = 50;
    if (this.memory.reasoning.steps.length > maxSteps) {
      this.memory.reasoning.steps = this.memory.reasoning.steps.slice(-maxSteps);
    }
  }
}
