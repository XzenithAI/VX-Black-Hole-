/**
 * Evolution & Learning System
 *
 * Continuous adaptation and improvement through:
 * - Online learning
 * - Meta-learning
 * - Architecture evolution
 * - Performance optimization
 */

import {
  EntityId,
  PerformanceMetrics,
  Lesson,
  Insight,
} from '../foundation/types';
import {
  generateId,
  now,
  clamp01,
} from '../foundation/utils';

export interface LearningConfig {
  learningRate: number;
  explorationRate: number;
  adaptationThreshold: number;
}

export interface EvolutionMetrics {
  generationCount: number;
  improvementRate: number;
  adaptationSuccess: number;
  capabilityGrowth: number;
}

export class EvolutionSystem {
  private config: LearningConfig;
  private metrics: EvolutionMetrics;

  private learningHistory: Array<{
    timestamp: Timestamp;
    lesson: Lesson;
    performance: PerformanceMetrics;
  }> = [];

  private adaptations: Array<{
    timestamp: Timestamp;
    type: string;
    description: string;
    impact: number;
  }> = [];

  constructor(config: Partial<LearningConfig> = {}) {
    this.config = {
      learningRate: 0.1,
      explorationRate: 0.2,
      adaptationThreshold: 0.7,
      ...config,
    };

    this.metrics = {
      generationCount: 0,
      improvementRate: 0,
      adaptationSuccess: 0,
      capabilityGrowth: 0,
    };
  }

  // ========================================================================
  // ONLINE LEARNING
  // ========================================================================

  /**
   * Learn from immediate feedback
   */
  learnOnline(
    lesson: Lesson,
    feedback: { success: boolean; reward: number },
    performance: PerformanceMetrics
  ): void {
    // Update lesson confidence based on feedback
    if (feedback.success) {
      lesson.confidence = clamp01(lesson.confidence + this.config.learningRate);
      lesson.appliedCount++;
    } else {
      lesson.confidence = clamp01(lesson.confidence - this.config.learningRate * 0.5);
    }

    // Record learning event
    this.learningHistory.push({
      timestamp: now(),
      lesson,
      performance,
    });

    // Update metrics
    this.updateMetrics();
  }

  /**
   * Learn from batch of experiences
   */
  learnBatch(
    lessons: Lesson[],
    performances: PerformanceMetrics[]
  ): void {
    // Analyze patterns across batch
    const patterns = this.extractPatterns(lessons, performances);

    // Update lessons based on patterns
    for (const pattern of patterns) {
      this.applyPattern(pattern);
    }

    // Update metrics
    this.updateMetrics();
  }

  /**
   * Extract patterns from learning history
   */
  private extractPatterns(
    lessons: Lesson[],
    performances: PerformanceMetrics[]
  ): Array<{ type: string; strength: number; lessons: Lesson[] }> {
    const patterns: Array<{
      type: string;
      strength: number;
      lessons: Lesson[];
    }> = [];

    // Group lessons by type
    const byType = new Map<string, Lesson[]>();
    for (const lesson of lessons) {
      if (!byType.has(lesson.type)) {
        byType.set(lesson.type, []);
      }
      byType.get(lesson.type)?.push(lesson);
    }

    // Identify successful patterns
    for (const [type, typeLessons] of byType) {
      const avgConfidence =
        typeLessons.reduce((sum, l) => sum + l.confidence, 0) /
        typeLessons.length;

      if (avgConfidence > 0.7) {
        patterns.push({
          type,
          strength: avgConfidence,
          lessons: typeLessons,
        });
      }
    }

    return patterns;
  }

  /**
   * Apply discovered pattern
   */
  private applyPattern(pattern: {
    type: string;
    strength: number;
    lessons: Lesson[];
  }): void {
    // Reinforce high-confidence lessons
    for (const lesson of pattern.lessons) {
      lesson.confidence = clamp01(lesson.confidence + this.config.learningRate * 0.5);
    }

    // Record adaptation
    this.adaptations.push({
      timestamp: now(),
      type: 'pattern_application',
      description: `Applied ${pattern.type} pattern with strength ${pattern.strength}`,
      impact: pattern.strength,
    });
  }

  // ========================================================================
  // META-LEARNING
  // ========================================================================

  /**
   * Learn how to learn more effectively
   */
  metaLearn(): void {
    if (this.learningHistory.length < 10) return;

    // Analyze learning effectiveness over time
    const recentHistory = this.learningHistory.slice(-50);

    // Calculate learning rate effectiveness
    const improvements = this.calculateImprovements(recentHistory);

    // Adjust learning rate if needed
    if (improvements < 0.5) {
      // Learning too slowly, increase rate
      this.config.learningRate = clamp01(this.config.learningRate * 1.1);
    } else if (improvements > 0.9) {
      // Learning too fast (may be overfitting), decrease rate
      this.config.learningRate = clamp01(this.config.learningRate * 0.9);
    }

    // Adjust exploration rate
    const explorationSuccess = this.calculateExplorationSuccess();
    if (explorationSuccess > 0.7) {
      // Exploration is paying off, maintain or increase
      this.config.explorationRate = clamp01(this.config.explorationRate * 1.05);
    } else {
      // Exploration not helping, reduce and exploit more
      this.config.explorationRate = clamp01(this.config.explorationRate * 0.95);
    }

    console.log(
      `📈 Meta-learning: lr=${this.config.learningRate.toFixed(3)}, ` +
        `explore=${this.config.explorationRate.toFixed(3)}`
    );
  }

  /**
   * Calculate improvement rate
   */
  private calculateImprovements(
    history: Array<{
      timestamp: Timestamp;
      lesson: Lesson;
      performance: PerformanceMetrics;
    }>
  ): number {
    if (history.length < 2) return 0.5;

    const first = history[0].performance;
    const last = history[history.length - 1].performance;

    const accuracyImprovement = last.accuracyRate - first.accuracyRate;
    const efficiencyImprovement = last.efficiencyRate - first.efficiencyRate;

    return clamp01((accuracyImprovement + efficiencyImprovement) / 2 + 0.5);
  }

  /**
   * Calculate exploration success rate
   */
  private calculateExplorationSuccess(): number {
    const recentAdaptations = this.adaptations.slice(-20);

    if (recentAdaptations.length === 0) return 0.5;

    const avgImpact =
      recentAdaptations.reduce((sum, a) => sum + a.impact, 0) /
      recentAdaptations.length;

    return avgImpact;
  }

  // ========================================================================
  // ARCHITECTURE EVOLUTION
  // ========================================================================

  /**
   * Evolve the architecture based on performance
   */
  evolveArchitecture(currentPerformance: PerformanceMetrics): void {
    this.metrics.generationCount++;

    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(currentPerformance);

    // Propose architectural changes
    for (const bottleneck of bottlenecks) {
      const adaptation = this.proposeAdaptation(bottleneck);
      if (adaptation) {
        this.applyAdaptation(adaptation);
      }
    }
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(
    performance: PerformanceMetrics
  ): Array<{ area: string; severity: number }> {
    const bottlenecks: Array<{ area: string; severity: number }> = [];

    if (performance.accuracyRate < this.config.adaptationThreshold) {
      bottlenecks.push({
        area: 'reasoning',
        severity: this.config.adaptationThreshold - performance.accuracyRate,
      });
    }

    if (performance.efficiencyRate < this.config.adaptationThreshold) {
      bottlenecks.push({
        area: 'efficiency',
        severity: this.config.adaptationThreshold - performance.efficiencyRate,
      });
    }

    if (performance.adaptability < this.config.adaptationThreshold) {
      bottlenecks.push({
        area: 'adaptability',
        severity: this.config.adaptationThreshold - performance.adaptability,
      });
    }

    return bottlenecks;
  }

  /**
   * Propose adaptation for bottleneck
   */
  private proposeAdaptation(bottleneck: {
    area: string;
    severity: number;
  }): { type: string; description: string; impact: number } | null {
    switch (bottleneck.area) {
      case 'reasoning':
        return {
          type: 'enhance_causal_reasoning',
          description: 'Increase causal model depth and exploration',
          impact: bottleneck.severity,
        };

      case 'efficiency':
        return {
          type: 'optimize_memory',
          description: 'Improve memory consolidation and retrieval',
          impact: bottleneck.severity,
        };

      case 'adaptability':
        return {
          type: 'increase_exploration',
          description: 'Boost exploration rate to discover new strategies',
          impact: bottleneck.severity,
        };

      default:
        return null;
    }
  }

  /**
   * Apply architectural adaptation
   */
  private applyAdaptation(adaptation: {
    type: string;
    description: string;
    impact: number;
  }): void {
    this.adaptations.push({
      timestamp: now(),
      ...adaptation,
    });

    // In a real system, would actually modify architecture
    console.log(`🔄 Adaptation: ${adaptation.description}`);

    this.metrics.adaptationSuccess =
      (this.metrics.adaptationSuccess + adaptation.impact) / 2;
  }

  // ========================================================================
  // CAPABILITY EXPANSION
  // ========================================================================

  /**
   * Expand capabilities based on insights
   */
  expandCapabilities(insights: Insight[]): void {
    for (const insight of insights) {
      if (insight.type === 'opportunity' && insight.actionable) {
        // Identify new capability to develop
        const capability = this.identifyCapability(insight);
        if (capability) {
          this.developCapability(capability);
        }
      }
    }
  }

  /**
   * Identify potential new capability from insight
   */
  private identifyCapability(insight: Insight): string | null {
    // Simplified: extract capability from insight description
    if (insight.description.includes('learn')) return 'learning';
    if (insight.description.includes('reason')) return 'reasoning';
    if (insight.description.includes('plan')) return 'planning';
    return null;
  }

  /**
   * Develop a new capability
   */
  private developCapability(capability: string): void {
    console.log(`🌱 Developing new capability: ${capability}`);

    this.metrics.capabilityGrowth += 0.1;

    this.adaptations.push({
      timestamp: now(),
      type: 'capability_expansion',
      description: `Developed ${capability} capability`,
      impact: 0.5,
    });
  }

  // ========================================================================
  // METRICS & STATISTICS
  // ========================================================================

  /**
   * Update evolution metrics
   */
  private updateMetrics(): void {
    if (this.learningHistory.length < 2) return;

    const recent = this.learningHistory.slice(-10);
    const older = this.learningHistory.slice(-20, -10);

    if (older.length > 0) {
      const recentAvg =
        recent.reduce((sum, h) => sum + h.performance.accuracyRate, 0) /
        recent.length;
      const olderAvg =
        older.reduce((sum, h) => sum + h.performance.accuracyRate, 0) /
        older.length;

      this.metrics.improvementRate = recentAvg - olderAvg;
    }
  }

  /**
   * Get evolution metrics
   */
  getMetrics(): EvolutionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get learning statistics
   */
  getStats() {
    return {
      metrics: this.getMetrics(),
      config: { ...this.config },
      learningHistorySize: this.learningHistory.length,
      adaptationCount: this.adaptations.length,
      recentAdaptations: this.adaptations.slice(-5),
    };
  }

  /**
   * Clear learning history
   */
  clear(): void {
    this.learningHistory = [];
    this.adaptations = [];
  }
}
