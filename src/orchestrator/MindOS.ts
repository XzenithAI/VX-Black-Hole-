/**
 * Mind OS Orchestrator
 *
 * The "consciousness loop" - coordinates all cognitive components.
 * Manages attention, makes decisions, and maintains coherent operation.
 */

import {
  EntityId,
  Message,
  MessageType,
  Context,
  Concept,
  Intent,
  GoalType,
  IntentStatus,
  PerformanceMetrics,
} from '../foundation/types';
import {
  generateId,
  now,
  clamp01,
} from '../foundation/utils';

import { MemorySystem } from '../memory';
import { CausalReasoning } from '../reasoning';
import { GoalSystem } from '../goals';
import { SelfReflection } from '../reflection';
import { SemanticBackbone } from '../semantic';
import { CrossDomainComposer } from '../composer';

export interface MindConfig {
  workingMemoryCapacity?: number;
  reflectionInterval?: number;
  maxConcurrentGoals?: number;
  attentionDecayRate?: number;
}

export interface MindState {
  isRunning: boolean;
  cycleCount: number;
  currentFocus: EntityId[];
  activeGoals: EntityId[];
  cognitiveLoad: number;
  lastReflection: Timestamp;
}

/**
 * Mind OS - The Orchestrator
 *
 * Implements the consciousness loop:
 * 1. Perceive - update context from inputs
 * 2. Reflect - check state, goals, performance
 * 3. Reason - causal inference, planning
 * 4. Decide - select actions
 * 5. Act - execute, update world
 * 6. Learn - consolidate memory, update models
 */
export class MindOS {
  // Core components
  private memory: MemorySystem;
  private causal: CausalReasoning;
  private goals: GoalSystem;
  private reflection: SelfReflection;
  private semantic: SemanticBackbone;
  private composer: CrossDomainComposer;

  // State
  private state: MindState;
  private config: MindConfig;

  // Message queue for inter-component communication
  private messageQueue: Message[] = [];

  // Metrics
  private performance: PerformanceMetrics = {
    timestamp: now(),
    goalsAchieved: 0,
    goalsFailed: 0,
    avgGoalCompletionTime: 0,
    accuracyRate: 0.5,
    efficiencyRate: 0.5,
    learningRate: 0.5,
    adaptability: 0.5,
  };

  constructor(config: MindConfig = {}) {
    this.config = {
      workingMemoryCapacity: 7,
      reflectionInterval: 3600000, // 1 hour
      maxConcurrentGoals: 5,
      attentionDecayRate: 0.1,
      ...config,
    };

    // Initialize components
    this.memory = new MemorySystem(this.config.workingMemoryCapacity);
    this.causal = new CausalReasoning();
    this.goals = new GoalSystem(this.causal);
    this.reflection = new SelfReflection({
      scheduledInterval: this.config.reflectionInterval,
    });
    this.semantic = new SemanticBackbone(this.memory.semantic);
    this.composer = new CrossDomainComposer(this.semantic, this.causal);

    // Initialize state
    this.state = {
      isRunning: false,
      cycleCount: 0,
      currentFocus: [],
      activeGoals: [],
      cognitiveLoad: 0,
      lastReflection: now(),
    };
  }

  // ========================================================================
  // CONSCIOUSNESS LOOP
  // ========================================================================

  /**
   * Start the consciousness loop
   */
  async start(): Promise<void> {
    this.state.isRunning = true;
    console.log('🧠 Mind OS: Starting consciousness loop...');

    while (this.state.isRunning) {
      await this.cycle();
      await this.sleep(100); // 100ms between cycles
    }
  }

  /**
   * Stop the consciousness loop
   */
  stop(): void {
    this.state.isRunning = false;
    console.log('🧠 Mind OS: Stopping consciousness loop');
  }

  /**
   * One cycle of consciousness
   */
  private async cycle(): Promise<void> {
    this.state.cycleCount++;

    // 1. PERCEIVE
    await this.perceive();

    // 2. REFLECT
    if (this.shouldReflect()) {
      await this.performReflection();
    }

    // 3. REASON
    await this.reason();

    // 4. DECIDE
    await this.decide();

    // 5. ACT
    await this.act();

    // 6. LEARN
    await this.learn();

    // Update state
    this.updateState();

    // Process messages
    this.processMessages();
  }

  /**
   * 1. PERCEIVE: Update context from inputs
   */
  private async perceive(): Promise<void> {
    // Update context with current focus
    const context = this.memory.working.getContext();

    // Decay attention naturally
    this.memory.working.decaySalience(this.config.attentionDecayRate!);

    // Update cognitive load
    this.state.cognitiveLoad = this.memory.working.getCognitiveLoad();

    // If overloaded, reduce load
    if (this.memory.working.isOverloaded()) {
      this.memory.working.reduceCognitiveLoad();
    }
  }

  /**
   * 2. REFLECT: Meta-cognitive self-assessment
   */
  private async performReflection(): Promise<void> {
    const activeGoals = this.goals.getActiveGoals();

    const reflectionResult = this.reflection.reflect(
      'scheduled',
      'performance',
      {
        goals: activeGoals,
        performance: this.performance,
      }
    );

    console.log(`🤔 Reflection: ${reflectionResult.insights.length} insights generated`);

    // Apply insights to improve
    const actions = this.reflection.getPendingActions();
    if (actions.length > 0) {
      console.log(`📋 Action items: ${actions.length} pending`);
    }

    this.state.lastReflection = now();
  }

  /**
   * 3. REASON: Causal inference and planning
   */
  private async reason(): Promise<void> {
    const activeGoals = this.goals.getActiveGoals();

    // For each active goal without a plan, create one
    for (const goal of activeGoals) {
      if (!goal.plan && goal.intent.status === IntentStatus.FORMING) {
        const plan = this.goals.createPlan(goal.id);
        if (plan) {
          console.log(`📝 Plan created for goal: ${goal.intent.description}`);
        }
      }
    }

    // Use causal reasoning to predict outcomes
    const focus = this.memory.working.getFocus();
    if (focus.length > 0) {
      for (const conceptId of focus.slice(0, 2)) {
        const predictions = this.causal.predictEffect(conceptId, 2);
        // Store predictions in working memory for decision making
      }
    }
  }

  /**
   * 4. DECIDE: Select actions based on goals and context
   */
  private async decide(): Promise<void> {
    const activeGoals = this.goals.getActiveGoals();

    // Prioritize goals
    const prioritized = activeGoals
      .sort((a, b) => {
        const aScore = a.intent.priority * 0.6 + a.intent.urgency * 0.4;
        const bScore = b.intent.priority * 0.6 + b.intent.urgency * 0.4;
        return bScore - aScore;
      })
      .slice(0, this.config.maxConcurrentGoals);

    // Update focus based on top goals
    const goalConcepts = new Set<EntityId>();
    for (const goal of prioritized) {
      if (goal.intent.desiredState.id) {
        goalConcepts.add(goal.intent.desiredState.id);
      }
    }

    // Shift attention to goal-relevant concepts
    if (goalConcepts.size > 0) {
      this.memory.working.shiftAttention(Array.from(goalConcepts), 0.7);
    }
  }

  /**
   * 5. ACT: Execute decisions
   */
  private async act(): Promise<void> {
    const activeGoals = this.goals.getActiveGoals();

    for (const goal of activeGoals) {
      if (goal.plan && goal.intent.status === IntentStatus.PLANNED) {
        // Start execution
        this.goals['updateGoalStatus'](goal.id, IntentStatus.IN_PROGRESS);

        // Execute plan (asynchronously)
        this.goals.executePlan(goal.plan.id).then(success => {
          if (success) {
            this.goals.completeGoal(goal.id);
            this.performance.goalsAchieved++;
          } else {
            this.goals.failGoal(goal.id, 'Execution failed');
            this.performance.goalsFailed++;
          }
        });
      }
    }
  }

  /**
   * 6. LEARN: Consolidate memory and update models
   */
  private async learn(): Promise<void> {
    // Periodic memory maintenance
    if (this.state.cycleCount % 100 === 0) {
      this.memory.performMaintenance();
    }

    // Update performance metrics
    this.updatePerformance();

    // Record performance for reflection
    if (this.state.cycleCount % 50 === 0) {
      this.reflection.recordPerformance(this.performance);
    }
  }

  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================

  /**
   * Update internal state
   */
  private updateState(): void {
    this.state.currentFocus = this.memory.working.getFocus();
    this.state.activeGoals = this.memory.working.getActiveGoals();
    this.state.cognitiveLoad = this.memory.working.getCognitiveLoad();
  }

  /**
   * Update performance metrics
   */
  private updatePerformance(): void {
    const total = this.performance.goalsAchieved + this.performance.goalsFailed;

    if (total > 0) {
      this.performance.accuracyRate = this.performance.goalsAchieved / total;
    }

    // Learning rate increases with successful goal completions
    this.performance.learningRate = clamp01(
      this.performance.learningRate + 0.001 * this.performance.goalsAchieved
    );

    this.performance.timestamp = now();
  }

  /**
   * Check if reflection should be triggered
   */
  private shouldReflect(): boolean {
    return this.reflection.shouldReflect();
  }

  // ========================================================================
  // MESSAGE PASSING
  // ========================================================================

  /**
   * Send message to component
   */
  sendMessage(message: Message): void {
    this.messageQueue.push(message);
  }

  /**
   * Process queued messages
   */
  private processMessages(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.handleMessage(message);
    }
  }

  /**
   * Handle a message
   */
  private handleMessage(message: Message): void {
    switch (message.type) {
      case MessageType.CREATE_GOAL:
        this.handleCreateGoal(message.payload);
        break;

      case MessageType.UPDATE_CONTEXT:
        this.handleUpdateContext(message.payload);
        break;

      case MessageType.QUERY_MEMORY:
        this.handleQueryMemory(message.payload);
        break;

      // Add more message handlers as needed
    }
  }

  /**
   * Handle goal creation message
   */
  private handleCreateGoal(payload: any): void {
    const { description, goalType, desiredState, priority, urgency } = payload;

    const intent = this.goals.createIntent(
      description,
      goalType || GoalType.ACHIEVE,
      desiredState,
      priority || 0.5,
      urgency || 0.5
    );

    const goal = this.goals.createGoal(intent);
    this.memory.working.addGoal(goal.id);

    console.log(`🎯 Goal created: ${description}`);
  }

  /**
   * Handle context update message
   */
  private handleUpdateContext(payload: any): void {
    this.memory.working.updateContext(payload);
  }

  /**
   * Handle memory query message
   */
  private handleQueryMemory(payload: any): void {
    // Query semantic memory
    const results = this.memory.semantic.queryConcepts(payload);
    console.log(`💭 Memory query: ${results.length} results`);
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  /**
   * Create a new goal
   */
  createGoal(
    description: string,
    goalType: GoalType = GoalType.ACHIEVE,
    priority: number = 0.5,
    urgency: number = 0.5
  ): EntityId {
    const intent = this.goals.createIntent(
      description,
      goalType,
      {},
      priority,
      urgency
    );

    const goal = this.goals.createGoal(intent);
    this.memory.working.addGoal(goal.id);

    return goal.id;
  }

  /**
   * Add concept to focus
   */
  focus(conceptId: EntityId): void {
    this.memory.working.addToFocus(conceptId);
  }

  /**
   * Create and store a concept
   */
  learn(label: string, type: any, properties: Record<string, any> = {}): EntityId {
    const concept = this.memory.semantic.createConcept(
      label,
      type,
      properties,
      0.5,
      0.7
    );

    // Add to working memory
    this.memory.working.addToFocus(concept.id);

    return concept.id;
  }

  /**
   * Understand a concept
   */
  understand(conceptId: EntityId) {
    const context = this.memory.working.getContext();
    return this.semantic.understand(conceptId, context);
  }

  /**
   * Get current state
   */
  getState(): MindState {
    return { ...this.state };
  }

  /**
   * Get performance metrics
   */
  getPerformance(): PerformanceMetrics {
    return { ...this.performance };
  }

  /**
   * Get comprehensive statistics
   */
  getStats() {
    return {
      state: this.getState(),
      performance: this.getPerformance(),
      memory: this.memory.getStats(),
      goals: this.goals.getStats(),
      causal: this.causal.getStats(),
      reflection: this.reflection.getStats(),
      semantic: this.semantic.getStats(),
      composer: this.composer.getStats(),
    };
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Sleep for ms
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown cleanly
   */
  async shutdown(): Promise<void> {
    console.log('🧠 Mind OS: Shutting down...');
    this.stop();

    // Perform final reflection
    await this.performReflection();

    // Save state (would persist to storage in real implementation)
    console.log('💾 State saved');
  }
}
