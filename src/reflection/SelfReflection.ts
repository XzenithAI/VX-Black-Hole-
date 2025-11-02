/**
 * Self-Reflection Module
 *
 * Meta-cognitive capabilities: performance monitoring, strategy evaluation,
 * bias detection, and continuous self-improvement.
 */

import {
  EntityId,
  Reflection,
  Insight,
  ActionItem,
  PerformanceMetrics,
  Goal,
  Episode,
} from '../foundation/types';
import {
  generateId,
  now,
  timeSince,
} from '../foundation/utils';

export interface ReflectionConfig {
  scheduledInterval?: number; // ms between scheduled reflections
  performanceThreshold?: number; // trigger reflection if performance drops below
  enableAutoReflection?: boolean;
}

export class SelfReflection {
  private reflections: Map<EntityId, Reflection> = new Map();
  private insights: Map<EntityId, Insight> = new Map();
  private actionItems: Map<EntityId, ActionItem> = new Map();
  private performanceHistory: PerformanceMetrics[] = [];

  private config: ReflectionConfig;
  private lastReflection: Timestamp = 0;

  constructor(config: ReflectionConfig = {}) {
    this.config = {
      scheduledInterval: 3600000, // 1 hour default
      performanceThreshold: 0.6,
      enableAutoReflection: true,
      ...config,
    };
  }

  // ========================================================================
  // REFLECTION TRIGGERS
  // ========================================================================

  /**
   * Check if reflection should be triggered
   */
  shouldReflect(): boolean {
    if (!this.config.enableAutoReflection) return false;

    // Time-based trigger
    if (this.config.scheduledInterval) {
      if (timeSince(this.lastReflection) >= this.config.scheduledInterval) {
        return true;
      }
    }

    // Performance-based trigger
    if (this.performanceHistory.length > 0) {
      const latest = this.performanceHistory[this.performanceHistory.length - 1];
      if (latest.accuracyRate < this.config.performanceThreshold!) {
        return true;
      }
    }

    return false;
  }

  /**
   * Trigger reflection manually
   */
  reflect(
    trigger: Reflection['trigger'],
    focus: Reflection['focus'],
    context?: {
      goals?: Goal[];
      episodes?: Episode[];
      performance?: PerformanceMetrics;
    }
  ): Reflection {
    const observations: string[] = [];
    const insights: Insight[] = [];

    // Gather observations based on focus
    switch (focus) {
      case 'performance':
        observations.push(...this.observePerformance(context?.performance));
        insights.push(...this.analyzePerformance());
        break;

      case 'knowledge':
        observations.push(...this.observeKnowledge());
        insights.push(...this.analyzeKnowledgeGaps());
        break;

      case 'strategy':
        observations.push(...this.observeStrategy(context?.goals));
        insights.push(...this.analyzeStrategies(context?.goals));
        break;

      case 'goals':
        observations.push(...this.observeGoals(context?.goals));
        insights.push(...this.analyzeGoals(context?.goals));
        break;
    }

    // Generate action items from insights
    const actionItems = this.generateActionItems(insights);

    const reflection: Reflection = {
      id: generateId('reflection'),
      timestamp: now(),
      trigger,
      focus,
      observations,
      insights,
      actionItems,
    };

    this.storeReflection(reflection);
    this.lastReflection = now();

    return reflection;
  }

  /**
   * Store reflection and its components
   */
  private storeReflection(reflection: Reflection): void {
    this.reflections.set(reflection.id, reflection);

    // Store insights
    for (const insight of reflection.insights) {
      this.insights.set(insight.id, insight);
    }

    // Store action items
    for (const item of reflection.actionItems) {
      this.actionItems.set(item.id, item);
    }
  }

  // ========================================================================
  // OBSERVATION
  // ========================================================================

  /**
   * Observe performance patterns
   */
  private observePerformance(current?: PerformanceMetrics): string[] {
    const observations: string[] = [];

    if (!current && this.performanceHistory.length === 0) {
      return ['No performance data available'];
    }

    const metrics = current || this.performanceHistory[this.performanceHistory.length - 1];

    observations.push(`Goal completion rate: ${metrics.goalsAchieved}/${metrics.goalsAchieved + metrics.goalsFailed}`);
    observations.push(`Accuracy rate: ${(metrics.accuracyRate * 100).toFixed(1)}%`);
    observations.push(`Efficiency rate: ${(metrics.efficiencyRate * 100).toFixed(1)}%`);

    // Trend analysis
    if (this.performanceHistory.length > 1) {
      const previous = this.performanceHistory[this.performanceHistory.length - 2];
      const accuracyTrend = metrics.accuracyRate - previous.accuracyRate;

      if (accuracyTrend > 0.1) {
        observations.push('Accuracy is improving significantly');
      } else if (accuracyTrend < -0.1) {
        observations.push('Accuracy is declining - investigation needed');
      }
    }

    return observations;
  }

  /**
   * Observe knowledge state
   */
  private observeKnowledge(): string[] {
    const observations: string[] = [];

    // Would analyze semantic memory, causal models, etc.
    observations.push('Knowledge observation - placeholder');

    return observations;
  }

  /**
   * Observe strategy effectiveness
   */
  private observeStrategy(goals?: Goal[]): string[] {
    const observations: string[] = [];

    if (goals) {
      const completed = goals.filter(g => g.intent.status === 'completed').length;
      const failed = goals.filter(g => g.intent.status === 'failed').length;
      const total = goals.length;

      observations.push(`Strategy success rate: ${completed}/${total} goals completed`);
      if (failed > 0) {
        observations.push(`${failed} goals failed - strategy may need adjustment`);
      }
    }

    return observations;
  }

  /**
   * Observe goal patterns
   */
  private observeGoals(goals?: Goal[]): string[] {
    const observations: string[] = [];

    if (goals) {
      const avgProgress = goals.reduce((sum, g) => sum + g.progress, 0) / goals.length;
      observations.push(`Average goal progress: ${(avgProgress * 100).toFixed(1)}%`);

      const blocked = goals.filter(g => g.blockers.length > 0).length;
      if (blocked > 0) {
        observations.push(`${blocked} goals currently blocked`);
      }
    }

    return observations;
  }

  // ========================================================================
  // ANALYSIS & INSIGHTS
  // ========================================================================

  /**
   * Analyze performance patterns
   */
  private analyzePerformance(): Insight[] {
    const insights: Insight[] = [];

    if (this.performanceHistory.length < 2) return insights;

    const recent = this.performanceHistory.slice(-5);
    const avgAccuracy = recent.reduce((sum, m) => sum + m.accuracyRate, 0) / recent.length;

    if (avgAccuracy < 0.7) {
      insights.push({
        id: generateId('insight'),
        description: 'Accuracy consistently below 70% - may indicate knowledge gaps or faulty reasoning',
        type: 'weakness',
        importance: 0.8,
        actionable: true,
      });
    }

    // Check for declining trends
    const accuracies = recent.map(m => m.accuracyRate);
    const isDecling = accuracies.every((val, i) => i === 0 || val <= accuracies[i - 1]);

    if (isDecling) {
      insights.push({
        id: generateId('insight'),
        description: 'Performance is consistently declining - immediate attention needed',
        type: 'weakness',
        importance: 0.9,
        actionable: true,
      });
    }

    return insights;
  }

  /**
   * Analyze knowledge gaps
   */
  private analyzeKnowledgeGaps(): Insight[] {
    const insights: Insight[] = [];

    // Would analyze failed predictions, unknown concepts, etc.
    insights.push({
      id: generateId('insight'),
      description: 'Knowledge gap analysis - placeholder',
      type: 'gap',
      importance: 0.5,
      actionable: true,
    });

    return insights;
  }

  /**
   * Analyze strategy effectiveness
   */
  private analyzeStrategies(goals?: Goal[]): Insight[] {
    const insights: Insight[] = [];

    if (!goals || goals.length === 0) return insights;

    const failed = goals.filter(g => g.intent.status === 'failed');
    const successRate = (goals.length - failed.length) / goals.length;

    if (successRate < 0.5) {
      insights.push({
        id: generateId('insight'),
        description: 'Current strategies are failing more than 50% of the time',
        type: 'weakness',
        importance: 0.8,
        actionable: true,
      });
    }

    // Analyze common blockers
    const allBlockers = goals.flatMap(g => g.blockers);
    if (allBlockers.length > 0) {
      insights.push({
        id: generateId('insight'),
        description: `${allBlockers.length} blockers encountered - may indicate systematic issues`,
        type: 'pattern',
        importance: 0.7,
        actionable: true,
      });
    }

    return insights;
  }

  /**
   * Analyze goal patterns
   */
  private analyzeGoals(goals?: Goal[]): Insight[] {
    const insights: Insight[] = [];

    if (!goals || goals.length === 0) return insights;

    // Check for overcommitment
    const active = goals.filter(g =>
      g.intent.status === 'in_progress' || g.intent.status === 'planned'
    );

    if (active.length > 10) {
      insights.push({
        id: generateId('insight'),
        description: 'Too many active goals - may be spreading attention too thin',
        type: 'weakness',
        importance: 0.6,
        actionable: true,
      });
    }

    return insights;
  }

  // ========================================================================
  // ACTION ITEMS
  // ========================================================================

  /**
   * Generate action items from insights
   */
  private generateActionItems(insights: Insight[]): ActionItem[] {
    const items: ActionItem[] = [];

    for (const insight of insights) {
      if (!insight.actionable) continue;

      let category: ActionItem['category'] = 'explore';
      let description = '';

      switch (insight.type) {
        case 'gap':
          category = 'learn';
          description = `Address knowledge gap: ${insight.description}`;
          break;

        case 'weakness':
          category = 'practice';
          description = `Improve weakness: ${insight.description}`;
          break;

        case 'bias':
          category = 'avoid';
          description = `Mitigate bias: ${insight.description}`;
          break;

        case 'opportunity':
          category = 'explore';
          description = `Explore opportunity: ${insight.description}`;
          break;

        case 'pattern':
          category = 'optimize';
          description = `Optimize based on pattern: ${insight.description}`;
          break;
      }

      const item: ActionItem = {
        id: generateId('action'),
        description,
        priority: insight.importance,
        category,
        completed: false,
      };

      items.push(item);
    }

    // Sort by priority
    items.sort((a, b) => b.priority - a.priority);

    return items;
  }

  /**
   * Get pending action items
   */
  getPendingActions(): ActionItem[] {
    return Array.from(this.actionItems.values()).filter(item => !item.completed);
  }

  /**
   * Complete action item
   */
  completeAction(itemId: EntityId): void {
    const item = this.actionItems.get(itemId);
    if (item) {
      item.completed = true;
    }
  }

  // ========================================================================
  // PERFORMANCE TRACKING
  // ========================================================================

  /**
   * Record performance metrics
   */
  recordPerformance(metrics: PerformanceMetrics): void {
    this.performanceHistory.push(metrics);

    // Keep only recent history
    const maxHistory = 100;
    if (this.performanceHistory.length > maxHistory) {
      this.performanceHistory = this.performanceHistory.slice(-maxHistory);
    }

    // Check if reflection should be triggered
    if (this.shouldReflect()) {
      this.reflect('scheduled', 'performance', { performance: metrics });
    }
  }

  /**
   * Get performance trend
   */
  getPerformanceTrend(metric: keyof PerformanceMetrics, window: number = 10): number {
    if (this.performanceHistory.length < 2) return 0;

    const recent = this.performanceHistory.slice(-window);
    if (recent.length < 2) return 0;

    const first = recent[0][metric] as number;
    const last = recent[recent.length - 1][metric] as number;

    return last - first;
  }

  // ========================================================================
  // BIAS DETECTION
  // ========================================================================

  /**
   * Detect potential cognitive biases
   */
  detectBiases(): Insight[] {
    const biases: Insight[] = [];

    // Confirmation bias detection
    if (this.hasConfirmationBias()) {
      biases.push({
        id: generateId('insight'),
        description: 'Potential confirmation bias detected - may be favoring evidence that supports existing beliefs',
        type: 'bias',
        importance: 0.7,
        actionable: true,
      });
    }

    // Recency bias
    if (this.hasRecencyBias()) {
      biases.push({
        id: generateId('insight'),
        description: 'Recency bias detected - overweighting recent information',
        type: 'bias',
        importance: 0.6,
        actionable: true,
      });
    }

    return biases;
  }

  /**
   * Check for confirmation bias
   */
  private hasConfirmationBias(): boolean {
    // Simplified: would analyze evidence gathering patterns
    return false;
  }

  /**
   * Check for recency bias
   */
  private hasRecencyBias(): boolean {
    // Simplified: would analyze temporal weighting of evidence
    return false;
  }

  // ========================================================================
  // STATISTICS
  // ========================================================================

  /**
   * Get reflection statistics
   */
  getStats() {
    const pendingActions = this.getPendingActions();
    const completedActions = Array.from(this.actionItems.values()).filter(
      item => item.completed
    );

    return {
      reflectionCount: this.reflections.size,
      insightCount: this.insights.size,
      actionItemCount: this.actionItems.size,
      pendingActionCount: pendingActions.length,
      completedActionCount: completedActions.length,
      performanceHistoryLength: this.performanceHistory.length,
      insightsByType: this.groupInsightsByType(),
    };
  }

  /**
   * Group insights by type
   */
  private groupInsightsByType(): Record<string, number> {
    const groups: Record<string, number> = {};

    for (const insight of this.insights.values()) {
      groups[insight.type] = (groups[insight.type] || 0) + 1;
    }

    return groups;
  }

  /**
   * Clear all reflections
   */
  clear(): void {
    this.reflections.clear();
    this.insights.clear();
    this.actionItems.clear();
    this.performanceHistory = [];
  }
}
