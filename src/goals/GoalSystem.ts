/**
 * Goal & Intent System
 *
 * Manages goals, plans, and autonomous goal-directed behavior.
 * Goals form hierarchies from strategic to tactical to operational.
 */

import {
  EntityId,
  Goal,
  Intent,
  IntentStatus,
  GoalType,
  Plan,
  PlanStep,
  CausalEffect,
  Blocker,
  GoalEvent,
  Concept,
} from '../foundation/types';
import {
  generateId,
  now,
  clamp01,
} from '../foundation/utils';
import { CausalReasoning } from '../reasoning/CausalReasoning';

export interface GoalQuery {
  status?: IntentStatus[];
  goalType?: GoalType[];
  minPriority?: number;
  hasParent?: boolean;
  parentId?: EntityId;
}

export class GoalSystem {
  private goals: Map<EntityId, Goal> = new Map();
  private intents: Map<EntityId, Intent> = new Map();
  private plans: Map<EntityId, Plan> = new Map();

  // Indexes
  private goalsByStatus: Map<IntentStatus, Set<EntityId>> = new Map();
  private goalsByType: Map<GoalType, Set<EntityId>> = new Map();
  private goalHierarchy: Map<EntityId, Set<EntityId>> = new Map(); // parent -> children

  private causalReasoning: CausalReasoning;

  constructor(causalReasoning: CausalReasoning) {
    this.causalReasoning = causalReasoning;

    // Initialize indexes
    for (const status of Object.values(IntentStatus)) {
      this.goalsByStatus.set(status, new Set());
    }
    for (const type of Object.values(GoalType)) {
      this.goalsByType.set(type, new Set());
    }
  }

  // ========================================================================
  // INTENT OPERATIONS
  // ========================================================================

  /**
   * Create a new intent
   */
  createIntent(
    description: string,
    goalType: GoalType,
    desiredState: Partial<Concept>,
    priority: number = 0.5,
    urgency: number = 0.5,
    deadline?: Timestamp
  ): Intent {
    const intent: Intent = {
      id: generateId('intent'),
      description,
      goalType,
      desiredState,
      priority: clamp01(priority),
      urgency: clamp01(urgency),
      deadline,
      created: now(),
      status: IntentStatus.FORMING,
    };

    this.intents.set(intent.id, intent);
    return intent;
  }

  /**
   * Get intent by ID
   */
  getIntent(id: EntityId): Intent | undefined {
    return this.intents.get(id);
  }

  /**
   * Update intent status
   */
  updateIntentStatus(id: EntityId, status: IntentStatus): void {
    const intent = this.intents.get(id);
    if (!intent) return;

    intent.status = status;
  }

  // ========================================================================
  // GOAL OPERATIONS
  // ========================================================================

  /**
   * Create a goal from an intent
   */
  createGoal(intent: Intent, parentGoalId?: EntityId): Goal {
    const goal: Goal = {
      id: generateId('goal'),
      intent,
      parentGoal: parentGoalId,
      subGoals: [],
      progress: 0,
      blockers: [],
      history: [
        {
          timestamp: now(),
          type: 'created',
          details: `Goal created: ${intent.description}`,
        },
      ],
    };

    this.storeGoal(goal);

    // Update hierarchy
    if (parentGoalId) {
      const parent = this.goals.get(parentGoalId);
      if (parent) {
        parent.subGoals.push(goal.id);
      }

      if (!this.goalHierarchy.has(parentGoalId)) {
        this.goalHierarchy.set(parentGoalId, new Set());
      }
      this.goalHierarchy.get(parentGoalId)?.add(goal.id);
    }

    return goal;
  }

  /**
   * Store a goal
   */
  private storeGoal(goal: Goal): void {
    this.goals.set(goal.id, goal);

    // Update indexes
    this.goalsByStatus.get(goal.intent.status)?.add(goal.id);
    this.goalsByType.get(goal.intent.goalType)?.add(goal.id);
  }

  /**
   * Get goal by ID
   */
  getGoal(id: EntityId): Goal | undefined {
    return this.goals.get(id);
  }

  /**
   * Update goal progress
   */
  updateProgress(goalId: EntityId, progress: number): void {
    const goal = this.goals.get(goalId);
    if (!goal) return;

    goal.progress = clamp01(progress);

    this.addGoalEvent(goalId, {
      timestamp: now(),
      type: 'progressed',
      details: `Progress: ${Math.round(progress * 100)}%`,
    });

    // Check if completed
    if (progress >= 1.0) {
      this.completeGoal(goalId);
    }

    // Update parent progress
    if (goal.parentGoal) {
      this.updateParentProgress(goal.parentGoal);
    }
  }

  /**
   * Update parent goal progress based on sub-goals
   */
  private updateParentProgress(parentId: EntityId): void {
    const parent = this.goals.get(parentId);
    if (!parent || parent.subGoals.length === 0) return;

    const subGoalProgress = parent.subGoals
      .map(id => this.goals.get(id))
      .filter(g => g !== undefined)
      .map(g => g!.progress);

    const avgProgress =
      subGoalProgress.reduce((sum, p) => sum + p, 0) / subGoalProgress.length;

    this.updateProgress(parentId, avgProgress);
  }

  /**
   * Add blocker to goal
   */
  addBlocker(goalId: EntityId, blocker: Blocker): void {
    const goal = this.goals.get(goalId);
    if (!goal) return;

    goal.blockers.push(blocker);

    this.addGoalEvent(goalId, {
      timestamp: now(),
      type: 'blocked',
      details: `Blocked: ${blocker.description}`,
    });

    // Update status if needed
    if (goal.intent.status === IntentStatus.IN_PROGRESS) {
      this.updateGoalStatus(goalId, IntentStatus.PAUSED);
    }
  }

  /**
   * Remove blocker
   */
  removeBlocker(goalId: EntityId, blockerId: EntityId): void {
    const goal = this.goals.get(goalId);
    if (!goal) return;

    goal.blockers = goal.blockers.filter(b => b.id !== blockerId);

    // Resume if no more blockers
    if (goal.blockers.length === 0 && goal.intent.status === IntentStatus.PAUSED) {
      this.updateGoalStatus(goalId, IntentStatus.IN_PROGRESS);
    }
  }

  /**
   * Complete a goal
   */
  completeGoal(goalId: EntityId): void {
    const goal = this.goals.get(goalId);
    if (!goal) return;

    this.updateGoalStatus(goalId, IntentStatus.COMPLETED);

    this.addGoalEvent(goalId, {
      timestamp: now(),
      type: 'completed',
      details: 'Goal completed successfully',
    });
  }

  /**
   * Fail a goal
   */
  failGoal(goalId: EntityId, reason: string): void {
    const goal = this.goals.get(goalId);
    if (!goal) return;

    this.updateGoalStatus(goalId, IntentStatus.FAILED);

    this.addGoalEvent(goalId, {
      timestamp: now(),
      type: 'failed',
      details: `Goal failed: ${reason}`,
    });
  }

  /**
   * Abandon a goal
   */
  abandonGoal(goalId: EntityId, reason: string): void {
    const goal = this.goals.get(goalId);
    if (!goal) return;

    this.updateGoalStatus(goalId, IntentStatus.ABANDONED);

    this.addGoalEvent(goalId, {
      timestamp: now(),
      type: 'modified',
      details: `Goal abandoned: ${reason}`,
    });
  }

  /**
   * Update goal status
   */
  private updateGoalStatus(goalId: EntityId, status: IntentStatus): void {
    const goal = this.goals.get(goalId);
    if (!goal) return;

    // Remove from old status index
    this.goalsByStatus.get(goal.intent.status)?.delete(goalId);

    // Update status
    goal.intent.status = status;

    // Add to new status index
    this.goalsByStatus.get(status)?.add(goalId);
  }

  /**
   * Add event to goal history
   */
  private addGoalEvent(goalId: EntityId, event: GoalEvent): void {
    const goal = this.goals.get(goalId);
    if (!goal) return;

    goal.history.push(event);
  }

  // ========================================================================
  // PLANNING
  // ========================================================================

  /**
   * Create a plan for a goal using causal reasoning
   */
  createPlan(goalId: EntityId): Plan | null {
    const goal = this.goals.get(goalId);
    if (!goal) return null;

    const { desiredState, currentState } = goal.intent;

    // Use causal reasoning to find path from current to desired state
    // Simplified: in reality would do sophisticated planning

    const plan: Plan = {
      id: generateId('plan'),
      steps: this.generatePlanSteps(currentState, desiredState),
      alternatives: [],
      estimatedCost: 0,
      expectedOutcome: desiredState as Concept,
      contingencies: [],
    };

    // Calculate estimated cost
    plan.estimatedCost = plan.steps.reduce((sum, step) => sum + step.cost, 0);

    // Store plan
    this.plans.set(plan.id, plan);
    goal.plan = plan;

    // Update goal status
    this.updateGoalStatus(goalId, IntentStatus.PLANNED);

    return plan;
  }

  /**
   * Generate plan steps (simplified planning)
   */
  private generatePlanSteps(
    currentState: Partial<Concept> | undefined,
    desiredState: Partial<Concept>
  ): PlanStep[] {
    // Simplified: create basic steps
    // In reality, would use STRIPS, HTN, or other planning algorithms

    const steps: PlanStep[] = [];

    // Analyze what needs to change
    const changes = this.identifyChanges(currentState, desiredState);

    for (const change of changes) {
      const step: PlanStep = {
        id: generateId('step'),
        action: `Achieve: ${change}`,
        preconditions: [],
        effects: [
          {
            target: generateId('concept'),
            change: 'create',
            magnitude: 1,
            confidence: 0.7,
          },
        ],
        cost: 1,
        duration: 1000,
        status: 'pending',
      };

      steps.push(step);
    }

    return steps;
  }

  /**
   * Identify what needs to change
   */
  private identifyChanges(
    current: Partial<Concept> | undefined,
    desired: Partial<Concept>
  ): string[] {
    const changes: string[] = [];

    for (const [key, value] of Object.entries(desired)) {
      if (!current || current[key as keyof Concept] !== value) {
        changes.push(`${key} = ${value}`);
      }
    }

    return changes;
  }

  /**
   * Execute a plan
   */
  async executePlan(planId: EntityId): Promise<boolean> {
    const plan = this.plans.get(planId);
    if (!plan) return false;

    for (const step of plan.steps) {
      step.status = 'in_progress';

      // Simulate execution
      await new Promise(resolve => setTimeout(resolve, step.duration));

      // Check if preconditions met
      const preconditionsMet = this.checkPreconditions(step);
      if (!preconditionsMet) {
        step.status = 'failed';
        return false;
      }

      step.status = 'completed';
    }

    return true;
  }

  /**
   * Check if preconditions are met
   */
  private checkPreconditions(step: PlanStep): boolean {
    // Simplified: always true
    // In reality, would check actual state
    return true;
  }

  // ========================================================================
  // QUERYING
  // ========================================================================

  /**
   * Query goals
   */
  queryGoals(query: GoalQuery): Goal[] {
    let candidates = new Set<EntityId>(this.goals.keys());

    // Filter by status
    if (query.status) {
      const statusMatches = new Set<EntityId>();
      for (const status of query.status) {
        const withStatus = this.goalsByStatus.get(status) || new Set();
        for (const id of withStatus) {
          statusMatches.add(id);
        }
      }
      candidates = new Set([...candidates].filter(id => statusMatches.has(id)));
    }

    // Filter by type
    if (query.goalType) {
      const typeMatches = new Set<EntityId>();
      for (const type of query.goalType) {
        const withType = this.goalsByType.get(type) || new Set();
        for (const id of withType) {
          typeMatches.add(id);
        }
      }
      candidates = new Set([...candidates].filter(id => typeMatches.has(id)));
    }

    // Filter by priority
    if (query.minPriority !== undefined) {
      candidates = new Set(
        [...candidates].filter(id => {
          const goal = this.goals.get(id);
          return goal && goal.intent.priority >= query.minPriority!;
        })
      );
    }

    // Filter by hierarchy
    if (query.hasParent !== undefined) {
      candidates = new Set(
        [...candidates].filter(id => {
          const goal = this.goals.get(id);
          return goal && (query.hasParent ? goal.parentGoal !== undefined : goal.parentGoal === undefined);
        })
      );
    }

    if (query.parentId) {
      candidates = new Set(
        [...candidates].filter(id => {
          const goal = this.goals.get(id);
          return goal && goal.parentGoal === query.parentId;
        })
      );
    }

    // Convert to goals and sort by priority
    const goals = Array.from(candidates)
      .map(id => this.goals.get(id))
      .filter(g => g !== undefined) as Goal[];

    goals.sort((a, b) => b.intent.priority - a.intent.priority);

    return goals;
  }

  /**
   * Get active goals
   */
  getActiveGoals(): Goal[] {
    return this.queryGoals({
      status: [IntentStatus.IN_PROGRESS, IntentStatus.PLANNED],
    });
  }

  /**
   * Get top-level goals (no parents)
   */
  getTopLevelGoals(): Goal[] {
    return this.queryGoals({ hasParent: false });
  }

  /**
   * Get sub-goals of a goal
   */
  getSubGoals(goalId: EntityId): Goal[] {
    return this.queryGoals({ parentId: goalId });
  }

  // ========================================================================
  // STATISTICS
  // ========================================================================

  /**
   * Get statistics
   */
  getStats() {
    return {
      goalCount: this.goals.size,
      intentCount: this.intents.size,
      planCount: this.plans.size,
      goalsByStatus: Object.fromEntries(
        Array.from(this.goalsByStatus.entries()).map(([status, set]) => [
          status,
          set.size,
        ])
      ),
      goalsByType: Object.fromEntries(
        Array.from(this.goalsByType.entries()).map(([type, set]) => [
          type,
          set.size,
        ])
      ),
    };
  }

  /**
   * Clear all goals
   */
  clear(): void {
    this.goals.clear();
    this.intents.clear();
    this.plans.clear();
    this.goalsByStatus.forEach(set => set.clear());
    this.goalsByType.forEach(set => set.clear());
    this.goalHierarchy.clear();
  }
}
